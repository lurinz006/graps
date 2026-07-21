import argparse
import sys
from src.db import get_db, SessionLocal
from src.processor import load_data_from_query, clean_data
from src.ml import train_regression_model, forecast_time_series

def run_regression_task(target_col, feature_cols, table_name):
    """
    Load data from the database, clean it, and train a regression model.
    """
    print(f"Starting regression task on table '{table_name}'...")
    db = SessionLocal()
    try:
        # Load features and target
        columns = ", ".join([target_col] + feature_cols)
        query = f"SELECT {columns} FROM {table_name}"
        
        df = load_data_from_query(db, query)
        if df.empty:
            print("No data retrieved from the database. Exiting.")
            sys.exit(1)
            
        print(f"Loaded {len(df)} rows. Cleaning data...")
        df_clean = clean_data(df)
        
        print(f"Training Regression Models and KDE Hotspots on target '{target_col}' with features {feature_cols}...")
        models, metrics = train_regression_model(df_clean, target_col, feature_cols)
        rf_model = models["rf"]
        lr_model = models["lr"]
        svm_model = models["svm"]
        kde_model = models["kde"]
        best_model_type = models["best_model"]
        
        print("Models trained successfully!")
        print(f"Random Forest Regressor - MSE: {metrics['rf_mse']:.4f}, R2: {metrics['rf_r2']:.4f}")
        print(f"Support Vector Regressor (SVM) - MSE: {metrics['svm_mse']:.4f}, R2: {metrics['svm_r2']:.4f}")
        print(f"Multiple Linear Regression (Geospatial) - MSE: {metrics['lr_mse']:.4f}, R2: {metrics['lr_r2']:.4f}")
        print(f"Winning Model: {best_model_type.upper()}")
        
        # Model-driven recommendation engine
        recommendations = []
        from sqlalchemy import text
        import numpy as np
        
        try:
            # Query all 98 seeded barangay centroids
            barangay_query = text("SELECT id, name, centroid_lat, centroid_lng FROM barangays")
            result = db.execute(barangay_query)
            barangays = result.mappings().all()

            if barangays and not df_clean.empty:
                predictions = []
                for brgy in barangays:
                    lat = float(brgy['centroid_lat'])
                    lng = float(brgy['centroid_lng'])
                    
                    # Predict risk using the winning model
                    if best_model_type == "rf":
                        pred_risk = float(rf_model.predict([[lat, lng]])[0])
                    else:
                        pred_risk = float(svm_model.predict([[lat, lng]])[0])
                    
                    pred_risk_rf = float(rf_model.predict([[lat, lng]])[0])
                    pred_risk_svm = float(svm_model.predict([[lat, lng]])[0])
                    pred_risk_lr = float(lr_model.predict([[lat, lng]])[0])
                    
                    # Density mapping using Kernel Density Estimation (KDE)
                    # We compute the exponential log-likelihood density of the coordinates
                    density_kde = float(np.exp(kde_model.score_samples([[lat, lng]]))[0] * 100)
                    
                    # Store hybrid risk (using best model prediction as primary predicted_risk)
                    predictions.append({
                        "name": brgy['name'],
                        "lat": lat,
                        "lng": lng,
                        "predicted_risk": pred_risk,
                        "predicted_risk_rf": pred_risk_rf,
                        "predicted_risk_svm": pred_risk_svm,
                        "predicted_risk_lr": pred_risk_lr,
                        "density_kde": density_kde
                    })
                
                # Sort by predicted risk in descending order
                predictions.sort(key=lambda x: x['predicted_risk'], reverse=True)
                
                # Take top 3 predicted risk hotspots
                for pred in predictions[:3]:
                    name = pred['name']
                    risk = pred['predicted_risk']
                    lat = pred['lat']
                    lng = pred['lng']
                    
                    if risk > 45:
                        rec = f"Critical Patrol Alert (Model-Predicted Hotspot): Barangay {name} ({lat:.4f}, {lng:.4f}) has a predicted risk score of {risk:.1f}. Recommendation: Deploy double-officer foot patrols immediately and increase visible deterrence."
                    elif risk > 20:
                        rec = f"Elevated Risk Patrol Alert (Model-Predicted Hotspot): Barangay {name} ({lat:.4f}, {lng:.4f}) has a predicted risk score of {risk:.1f}. Recommendation: Dispatch vehicle patrols during night shift and coordinate checks with local barangay tanods."
                    else:
                        rec = f"Standard Monitoring Patrol: Barangay {name} ({lat:.4f}, {lng:.4f}) reports baseline predicted risk of {risk:.1f}. Recommendation: Maintain standard patrolling routes and carry out periodic drive-bys."
                    recommendations.append(rec)
        except Exception as db_err:
            print(f"Failed to query barangays or run predictions: {db_err}")

        if not recommendations:
            recommendations.append("Inspecting dataset shows baseline metrics. Recommend maintaining standard patrol frequencies across all sectors.")

        # Save metrics to database
        from sqlalchemy import text
        import json
        import numpy as np
        
        best_r2_val = metrics["rf_r2"] if best_model_type == "rf" else metrics["svm_r2"]
        best_mse_val = metrics["rf_mse"] if best_model_type == "rf" else metrics["svm_mse"]
        
        if np.isnan(best_r2_val) or np.isinf(best_r2_val):
            best_r2_val = None
            
        results_payload = {
            "best_model": best_model_type,
            "rf_r2": metrics["rf_r2"],
            "rf_mse": metrics["rf_mse"],
            "svm_r2": metrics["svm_r2"],
            "svm_mse": metrics["svm_mse"],
            "feature_importances": list(rf_model.feature_importances_) if hasattr(rf_model, 'feature_importances_') else [],
            "recommendations": recommendations,
            "geospatial_regression": {
                "model_type": "Multiple Linear Regression (MLR)",
                "formula": f"Risk = ({metrics['lr_intercept']:.4f}) + ({metrics['lr_coef_lat']:.4f} * Latitude) + ({metrics['lr_coef_lng']:.4f} * Longitude)",
                "intercept": metrics['lr_intercept'],
                "coef_latitude": metrics['lr_coef_lat'],
                "coef_longitude": metrics['lr_coef_lng'],
                "r2": metrics['lr_r2'] if not np.isnan(metrics['lr_r2']) and not np.isinf(metrics['lr_r2']) else None,
                "mse": metrics['lr_mse']
            },
            "data_mining": {
                "method": "Kernel Density Estimation (KDE)",
                "kernel": "gaussian",
                "bandwidth": 0.01
            }
        }

        insert_query = text("""
            INSERT INTO analytics_metrics (task_type, table_name, target_column, r2_score, mse_score, results_json, created_at, updated_at)
            VALUES (:task_type, :table_name, :target_column, :r2_score, :mse_score, :results_json, NOW(), NOW())
        """)
        # Save winning model metrics in primary slots for direct Geospatial Regression auditing
        db.execute(insert_query, {
            "task_type": "train",
            "table_name": table_name,
            "target_column": target_col,
            "r2_score": best_r2_val,
            "mse_score": best_mse_val,
            "results_json": json.dumps(results_payload)
        })
        db.commit()
        print("Metrics and rule-based AI recommendations saved to database analytics_metrics table.")

        # Serialize and save model pipeline as a PKL file
        import pickle
        import os
        model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(models, f)
        print(f"Trained model pipeline (Random Forest, SVM, MLR, KDE) serialized and saved to: {model_path}")
        
    except Exception as e:
        print(f"Error during regression task: {e}")
        sys.exit(1)
    finally:
        db.close()

def run_forecast_task(value_col, date_col, table_name, steps=7):
    """
    Retrieve historical data and perform time-series forecasting.
    """
    print(f"Starting time-series forecasting on table '{table_name}'...")
    db = SessionLocal()
    try:
        query = f"SELECT {date_col}, {value_col} FROM {table_name} ORDER BY {date_col} ASC"
        df = load_data_from_query(db, query)
        
        if df.empty:
            print("No data retrieved from the database. Exiting.")
            sys.exit(1)
            
        print(f"Loaded {len(df)} time-series data points.")
        # Ensure dates are datetime types and index is set
        df[date_col] = pd.to_datetime(df[date_col])
        df.set_index(date_col, inplace=True)
        
        # Get the series
        series = df[value_col]
        
        print(f"Fitting SARIMAX model and forecasting next {steps} steps...")
        forecast = forecast_time_series(series, steps=steps)
        
        # Save forecasts to database
        from sqlalchemy import text
        import json
        
        # Format the forecast output
        forecast_list = [{"step": i+1, "value": float(val), "time": str(idx)} for i, (idx, val) in enumerate(forecast.items())]
        
        insert_query = text("""
            INSERT INTO analytics_metrics (task_type, table_name, target_column, results_json, created_at, updated_at)
            VALUES (:task_type, :table_name, :target_column, :results_json, NOW(), NOW())
        """)
        db.execute(insert_query, {
            "task_type": "forecast",
            "table_name": table_name,
            "target_column": value_col,
            "results_json": json.dumps(forecast_list)
        })
        db.commit()
        
        print("\nForecasted values:")
        print(forecast)
        print("Forecast results saved to database analytics_metrics table.")
        
    except Exception as e:
        print(f"Error during forecasting task: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GRAPS Analytics & Machine Learning Engine")
    parser.add_argument("--task", type=str, required=True, choices=["train", "forecast"],
                        help="The analytics task to perform: 'train' (regression) or 'forecast' (time-series).")
    parser.add_argument("--table", type=str, required=True, help="Database table name to query data from.")
    parser.add_argument("--target", type=str, help="Target column for regression training.")
    parser.add_argument("--features", type=str, nargs="+", help="Feature column names for regression training.")
    parser.add_argument("--value-col", type=str, help="Value column for time-series forecasting.")
    parser.add_argument("--date-col", type=str, help="Date/Timestamp column for time-series forecasting.")
    parser.add_argument("--steps", type=int, default=7, help="Number of forecast steps.")
    
    args = parser.parse_args()
    
    # Import pandas dynamically inside main so argparse can run even without pandas installed initially
    import pandas as pd
    
    if args.task == "train":
        if not args.target or not args.features:
            parser.error("--task train requires --target and --features")
        run_regression_task(args.target, args.features, args.table)
    elif args.task == "forecast":
        if not args.value_col or not args.date_col:
            parser.error("--task forecast requires --value-col and --date-col")
        run_forecast_task(args.value_col, args.date_col, args.table, args.steps)

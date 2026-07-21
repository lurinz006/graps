import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.neighbors import KernelDensity
from sklearn.metrics import mean_squared_error, r2_score
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX

def train_regression_model(df: pd.DataFrame, target_col: str, feature_cols: list):
    """
    Train scikit-learn models including RandomForestRegressor, 
    Multiple Linear Regression (Geospatial Linear Regression),
    Support Vector Regression (SVM), and 
    Kernel Density Estimation (KDE) for hotspot mapping.
    """
    if df.empty or target_col not in df.columns:
        raise ValueError("Dataframe is empty or target column is missing.")
        
    X = df[feature_cols]
    y = df[target_col]
    
    # Train/Test split for model evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 1. Random Forest Regressor (Non-linear ML predictor)
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train.values, y_train)
    rf_pred = rf.predict(X_test.values)
    rf_mse = float(mean_squared_error(y_test, rf_pred))
    rf_r2 = float(r2_score(y_test, rf_pred))
    
    # 2. Geospatial Linear Regression (Multiple Linear Regression)
    # Models: Risk = Intercept + (Coef_Lat * Lat) + (Coef_Lng * Lng)
    lr = LinearRegression()
    lr.fit(X_train.values, y_train)
    lr_pred = lr.predict(X_test.values)
    lr_mse = float(mean_squared_error(y_test, lr_pred))
    lr_r2 = float(r2_score(y_test, lr_pred))
    
    # 3. Support Vector Regression (SVM) with scaling
    svm = make_pipeline(StandardScaler(), SVR(C=1.0, epsilon=0.1))
    svm.fit(X_train.values, y_train)
    svm_pred = svm.predict(X_test.values)
    svm_mse = float(mean_squared_error(y_test, svm_pred))
    svm_r2 = float(r2_score(y_test, svm_pred))
    
    # 4. Kernel Density Estimation (KDE) for Hotspot mapping
    # Fit KDE on the spatial coordinate points (lat/lng) of historical incidents
    coords = df[['latitude', 'longitude']].values
    # Bandwidth of 0.01 corresponds to roughly 1.1 km radius (grid resolution)
    kde = KernelDensity(kernel='gaussian', bandwidth=0.01)
    kde.fit(coords)
    
    # Determine the winning model (RF vs SVM) based on R2 score
    best_model = "rf" if rf_r2 >= svm_r2 else "svm"
    
    models = {
        "rf": rf,
        "lr": lr,
        "svm": svm,
        "kde": kde,
        "best_model": best_model
    }
    
    metrics = {
        "rf_mse": rf_mse,
        "rf_r2": rf_r2,
        "lr_mse": lr_mse,
        "lr_r2": lr_r2,
        "svm_mse": svm_mse,
        "svm_r2": svm_r2,
        "best_model": best_model,
        "lr_intercept": float(lr.intercept_),
        "lr_coef_lat": float(lr.coef_[0]),
        "lr_coef_lng": float(lr.coef_[1])
    }
    
    return models, metrics

def forecast_time_series(series: pd.Series, steps: int = 7) -> pd.Series:
    """Forecast future values using a Statsmodels SARIMAX model."""
    if len(series) < 10:
        raise ValueError("Time series is too short for forecasting.")
        
    # Fit SARIMAX(1, 1, 1) model
    model = SARIMAX(series, order=(1, 1, 1), enforce_stationarity=False, enforce_invertibility=False)
    results = model.fit(disp=False)
    
    # Forecast
    forecast = results.get_forecast(steps=steps)
    return forecast.predicted_mean

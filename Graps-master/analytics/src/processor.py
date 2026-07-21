import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

def load_data_from_query(db: Session, query: str, params: dict = None) -> pd.DataFrame:
    """Load data from PostgreSQL database into a Pandas DataFrame."""
    try:
        # Use connection directly for pandas read_sql
        conn = db.bind.connect()
        df = pd.read_sql_query(text(query), conn, params=params)
        return df
    except Exception as e:
        print(f"Error loading data from database: {e}")
        return pd.DataFrame()
    finally:
        if 'conn' in locals():
            conn.close()

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Example cleaning function: handles missing values and formats types."""
    if df.empty:
        return df
    
    # Fill numeric columns NaN with median, category with mode/unknown
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median())
        else:
            df[col] = df[col].fillna("Unknown")
            
    return df

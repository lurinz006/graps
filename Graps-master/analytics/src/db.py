import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables directly from the Laravel backend .env to share config
backend_env = os.path.join(os.path.dirname(__file__), '../../backend/.env')
load_dotenv(dotenv_path=backend_env)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    db_connection = os.getenv("DB_CONNECTION", "sqlite")
    if db_connection == "sqlite":
        # Point to the Laravel SQLite database file relative to the script location
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend/database/database.sqlite'))
        DATABASE_URL = f"sqlite:///{db_path}"
    else:
        DB_USER = os.getenv("DB_USERNAME", "postgres")
        DB_PASS = os.getenv("DB_PASSWORD", "postgres")
        DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
        DB_PORT = os.getenv("DB_PORT", "5432")
        DB_NAME = os.getenv("DB_DATABASE", "graps")
        DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Configure engine arguments
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    # SQLite requires check_same_thread=False for multi-threaded setups in python
    engine_args = {"connect_args": {"check_same_thread": False}}
else:
    engine_args = {"pool_pre_ping": True}

engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Context manager for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

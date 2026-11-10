import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("ERROR CRÍTICO: La variable de entorno DATABASE_URL no está configurada.")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Aseguramos el prefijo para psycopg2
db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# Aseguramos que tenga el parámetro sslmode=require
if "render.com" in db_url and "sslmode" not in db_url:
    separator = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{separator}sslmode=require"

# Motor optimizado para evitar desconexiones SSL en la nube
engine = create_engine(
    db_url,
    pool_pre_ping=True,      
    pool_recycle=300,        
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10 
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
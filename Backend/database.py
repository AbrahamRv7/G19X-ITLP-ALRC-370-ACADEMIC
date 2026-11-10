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

# Limpiamos cualquier parámetro de consulta previo (?sslmode=...) para evitar conflictos
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# Motor robusto con connect_args limpio y tiempo de espera extendido para Render
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 30  # Da tiempo a que la base de datos despierte en Render
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
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

# Limpiamos parámetros previos
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# Determinamos si estamos en producción (Render) o en local
connect_args = {}
if "render.com" in db_url:
    # Render requiere SSL obligatorio
    connect_args["sslmode"] = "require"
else:
    # Entorno local (Docker / localhost) no usa SSL
    connect_args = {}

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Aquí agregamos el +psycopg2 a la conexión
SQLALCHEMY_DATABASE_URL = # Borra el os.getenv y pon el link de Render en duro (¡Asegúrate de poner postgresql:// al inicio!)
SQLALCHEMY_DATABASE_URL = "postgresql://tu_usuario:tu_password@host_de_render.com/plurione-db"
# Crear el "motor" que se comunicará con PostgreSQL
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Función para inyectar la base de datos en nuestras rutas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
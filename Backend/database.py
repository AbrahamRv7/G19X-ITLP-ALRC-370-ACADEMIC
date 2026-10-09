from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Aquí agregamos el +psycopg2 a la conexión
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://admin:adminpassword@localhost:5432/legalops_db"

# Crear el "motor" que se comunicará con PostgreSQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Configurar la sesión para poder hacer consultas a las tablas
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para definir nuestros modelos de datos en el futuro
Base = declarative_base()

# Función para inyectar la base de datos en nuestras rutas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
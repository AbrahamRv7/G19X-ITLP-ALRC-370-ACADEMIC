import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import database
import models
from security import pwd_context
from routers import usuarios, clientes, contratos, litigios, metricas

load_dotenv()

# 1. Inicialización de tablas en PostgreSQL
models.Base.metadata.create_all(bind=database.engine)

# 2. Instancia principal de FastAPI
app = FastAPI(
    title="PluriOne LegalOps - API de Métricas e Indicadores Jurídicos",
    description="Arquitectura modular en FastAPI para gestión de contratos, litigios, clientes y KPIs legales.",
    version="2.1.0",
    contact={"name": "Abraham Luis Rivera"},
)

# 3. Configuración segura de CORS
frontend_origin = os.getenv("FRONTEND_ORIGIN", "https://g19-x-itlp-alrc-370-academic.vercel.app")
allowed_origins = [
    frontend_origin,
    "https://g19-x-itlp-alrc-370-academic.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 4. Evento de arranque (Administrador Inicial desde Variables de Entorno)
@app.on_event("startup")
def startup_tasks():
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
    admin_name = os.getenv("INITIAL_ADMIN_NAME", "Administrador PluriOne")

    if admin_email and admin_password:
        db: Session = database.SessionLocal()
        try:
            existe = db.query(models.Usuario).filter(models.Usuario.email == admin_email).first()
            if not existe:
                nuevo_admin = models.Usuario(
                    nombre=admin_name,
                    email=admin_email,
                    password_hash=pwd_context.hash(admin_password),
                    rol=models.RolUsuario.admin,
                    esta_activo=True,
                )
                db.add(nuevo_admin)
                db.commit()
                print(f"Administrador inicial ({admin_email}) configurado correctamente.")
        except Exception as e:
            print(f"Error al verificar administrador inicial: {e}")
        finally:
            db.close()


@app.get("/", tags=["0. Sistema"])
def leer_raiz():
    return {"mensaje": "API PluriOne LegalOps activa y modularizada."}


# 5. Registro de Routers Modulares
app.include_router(usuarios.router)
app.include_router(clientes.router)
app.include_router(contratos.router)
app.include_router(litigios.router)
app.include_router(metricas.router)
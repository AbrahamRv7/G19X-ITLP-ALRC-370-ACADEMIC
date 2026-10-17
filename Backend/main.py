import os
from datetime import datetime, timedelta, timezone
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session

import database
import models
import schemas
from schemas import ClienteResponse, ClienteCreate, ExpedienteResponse, ExpedienteCreate

load_dotenv()

# =====================================================================
# 1. INICIALIZACIÓN DE TABLAS Y VARIABLES DE SEGURIDAD
# =====================================================================
models.Base.metadata.create_all(bind=database.engine)

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("ERROR CRÍTICO: La variable de entorno SECRET_KEY no está configurada.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# =====================================================================
# 2. CONFIGURACIÓN DE LA APLICACIÓN Y CORS SEGURO
# =====================================================================
app = FastAPI(
    title="PluriOne LegalOps - API de Métricas e Indicadores Jurídicos",
    description="Backend transaccional y analítico para el control de contratos, litigios y KPIs del área jurídica.",
    version="2.0.0",
    contact={"name": "Abraham Luis Rivera - Residencia Profesional"},
)

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


# =====================================================================
# 3. ARRANQUE: ADMINISTRADOR DESDE VARIABLES DE ENTORNO
# =====================================================================
@app.on_event("startup")
def startup_tasks():
    try:
        with database.engine.begin() as conn:
            conn.execute(text("ALTER TABLE litigios ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE litigios ADD COLUMN IF NOT EXISTS contraparte VARCHAR(150);"))
            conn.execute(text("ALTER TABLE litigios ADD COLUMN IF NOT EXISTS juzgado VARCHAR(150);"))
            conn.execute(text("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;"))
    except Exception as e:
        print(f"Aviso en verificación de esquema: {e}")

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


# =====================================================================
# 4. GUARDIAS DE AUTENTICACIÓN Y CONTROL DE ROLES (RBAC)
# =====================================================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)) -> models.Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación no válidas o expiradas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if usuario is None or not usuario.esta_activo:
        raise credentials_exception
    return usuario


def require_admin(current_user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    rol_actual = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    if rol_actual != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes: esta acción requiere rol de Administrador (admin).",
        )
    return current_user


# =====================================================================
# 5. AUTENTICACIÓN Y GESTIÓN DE USUARIOS
# =====================================================================
@app.get("/", tags=["0. Sistema"])
def leer_raiz():
    return {"mensaje": "API PluriOne LegalOps activa y protegida."}


@app.post("/login", tags=["1. Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    termino = form_data.username.strip().lower()
    usuario = db.query(models.Usuario).filter(
        or_(
            func.lower(models.Usuario.email) == termino,
            func.lower(models.Usuario.nombre) == termino,
        )
    ).first()

    if not usuario or not pwd_context.verify(form_data.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    rol_valor = usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)
    access_token = create_access_token(data={"sub": usuario.email, "rol": rol_valor})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {"id": usuario.id, "nombre": usuario.nombre, "email": usuario.email, "rol": rol_valor},
    }


@app.post("/usuarios", tags=["2. Gestión de Usuarios"])
def crear_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    existe = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en el sistema")

    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        password_hash=pwd_context.hash(usuario.password),
        rol=usuario.rol,
        esta_activo=True,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return {"mensaje": "Usuario creado exitosamente", "correo": nuevo_usuario.email, "rol": nuevo_usuario.rol}


@app.get("/usuarios", response_model=List[schemas.UsuarioResponse], tags=["2. Gestión de Usuarios"])
def obtener_usuarios(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.Usuario).all()


# =====================================================================
# 6. MÓDULO DE CLIENTES Y EXPEDIENTES (PROTEGIDOS CON JWT)
# =====================================================================
@app.post("/clientes/", response_model=ClienteResponse, tags=["3. Clientes"])
def crear_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    nuevo_cliente = models.Cliente(**cliente.model_dump())
    db.add(nuevo_cliente)
    try:
        db.commit()
        db.refresh(nuevo_cliente)
        return nuevo_cliente
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el cliente. Revisa si el RFC o correo ya existen.")


@app.get("/clientes/", response_model=List[ClienteResponse], tags=["3. Clientes"])
def obtener_clientes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Cliente).offset(skip).limit(limit).all()


@app.delete("/clientes/{cliente_id}", tags=["3. Clientes"])
def eliminar_cliente(
    cliente_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    db.query(models.Contrato).filter(models.Contrato.cliente_id == cliente_id).update({"cliente_id": None})
    db.query(models.Litigio).filter(models.Litigio.cliente_id == cliente_id).update({"cliente_id": None})
    db.query(models.Expediente).filter(models.Expediente.cliente_id == cliente_id).delete()

    db.delete(cliente)
    db.commit()
    return {"mensaje": "Cliente eliminado correctamente"}


@app.post("/expedientes/", response_model=ExpedienteResponse, tags=["3. Expedientes"])
def crear_expediente(
    expediente: ExpedienteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == expediente.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="El cliente especificado no existe")

    abogado = db.query(models.Usuario).filter(models.Usuario.id == expediente.abogado_id).first()
    if not abogado:
        raise HTTPException(status_code=404, detail="El abogado especificado no existe")

    nuevo_expediente = models.Expediente(**expediente.model_dump())
    db.add(nuevo_expediente)
    try:
        db.commit()
        db.refresh(nuevo_expediente)
        return nuevo_expediente
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el expediente. ¿El número ya está en uso?")


@app.get("/expedientes/", response_model=List[ExpedienteResponse], tags=["3. Expedientes"])
def obtener_expedientes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Expediente).offset(skip).limit(limit).all()


# =====================================================================
# 7. MÓDULO DE CONTRATOS (PROTEGIDO CON JWT)
# =====================================================================
@app.post("/contratos", tags=["4. Contratos"])
def crear_contrato(
    contrato: schemas.ContratoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    datos = contrato.model_dump()
    columnas_validas = {c.name for c in models.Contrato.__table__.columns}
    datos_filtrados = {k: v for k, v in datos.items() if k in columnas_validas}
    if not datos_filtrados.get("usuario_responsable_id"):
        datos_filtrados["usuario_responsable_id"] = current_user.id

    nuevo_contrato = models.Contrato(**datos_filtrados)
    db.add(nuevo_contrato)
    try:
        db.commit()
        db.refresh(nuevo_contrato)
        return nuevo_contrato
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear el contrato: {str(e)}")


@app.get("/contratos", tags=["4. Contratos"])
def obtener_contratos(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.Contrato).all()


@app.put("/contratos/{contrato_id}/estatus", tags=["4. Contratos"])
def actualizar_estatus_contrato(
    contrato_id: int,
    datos: schemas.ContratoEstatusUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    contrato.estatus = datos.estatus
    db.commit()
    db.refresh(contrato)
    return contrato


@app.delete("/contratos/{contrato_id}", tags=["4. Contratos"])
def eliminar_contrato(
    contrato_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    contrato = db.query(models.Contrato).filter(models.Contrato.id == contrato_id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    db.delete(contrato)
    db.commit()
    return {"mensaje": "Contrato eliminado correctamente"}


# =====================================================================
# 8. MÓDULO DE LITIGIOS E HISTORIAL PROCESAL (PROTEGIDO CON JWT)
# =====================================================================
@app.post("/litigios", tags=["5. Litigios"])
def crear_litigio(
    litigio: schemas.LitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    datos = litigio.model_dump()
    columnas_validas = {c.name for c in models.Litigio.__table__.columns}
    datos_filtrados = {k: v for k, v in datos.items() if k in columnas_validas}
    if not datos_filtrados.get("usuario_responsable_id"):
        datos_filtrados["usuario_responsable_id"] = current_user.id

    nuevo_litigio = models.Litigio(**datos_filtrados)
    if nuevo_litigio.materia:
        nuevo_litigio.materia = nuevo_litigio.materia.capitalize()
    if nuevo_litigio.probabilidad_exito:
        nuevo_litigio.probabilidad_exito = nuevo_litigio.probabilidad_exito.capitalize()

    db.add(nuevo_litigio)
    try:
        db.commit()
        db.refresh(nuevo_litigio)
        return nuevo_litigio
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al guardar el litigio: {str(e)}")


@app.get("/litigios", tags=["5. Litigios"])
def obtener_litigios(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.Litigio).all()


@app.post("/litigios/{litigio_id}/historial", tags=["5. Litigios"])
def registrar_avance_litigio(
    litigio_id: int,
    historial: schemas.HistorialLitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=current_user.id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=historial.fase_nueva,
        comentarios=historial.comentarios,
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = historial.fase_nueva
    db.commit()
    db.refresh(litigio)
    return {"mensaje": "Historial y fase procesal actualizados correctamente"}


@app.put("/litigios/{litigio_id}/fase", response_model=schemas.LitigioResponse, tags=["5. Litigios"])
def actualizar_fase_litigio(
    litigio_id: int,
    cambio: schemas.HistorialLitigioCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    nuevo_historial = models.HistorialLitigio(
        litigio_id=litigio.id,
        usuario_modificador_id=current_user.id,
        fase_anterior=litigio.fase_procesal,
        fase_nueva=cambio.fase_nueva,
        comentarios=cambio.comentarios,
    )
    db.add(nuevo_historial)
    litigio.fase_procesal = cambio.fase_nueva
    db.commit()
    db.refresh(litigio)
    return litigio


@app.get("/litigios/{litigio_id}/historial", response_model=List[schemas.HistorialLitigioResponse], tags=["5. Litigios"])
def obtener_historial_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    return (
        db.query(models.HistorialLitigio)
        .filter(models.HistorialLitigio.litigio_id == litigio_id)
        .order_by(models.HistorialLitigio.fecha_cambio.desc())
        .all()
    )


@app.delete("/litigios/{litigio_id}", tags=["5. Litigios"])
def eliminar_litigio(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Usuario = Depends(require_admin),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Litigio no encontrado")

    db.query(models.HistorialLitigio).filter(models.HistorialLitigio.litigio_id == litigio_id).delete()
    db.delete(litigio)
    db.commit()
    return {"mensaje": "Litigio y su bitácora eliminados correctamente"}


# =====================================================================
# 9. MÓDULO DE MÉTRICAS E INDICADORES JURÍDICOS
# =====================================================================
@app.get("/dashboard/kpis", tags=["6. Métricas Jurídicas"])
def obtener_kpis_principales(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    contratos_activos = db.query(models.Contrato).filter(models.Contrato.estatus == models.EstatusContrato.activo).count()
    riesgo_total = (
        db.query(func.sum(models.Litigio.monto_contingencia)).filter(models.Litigio.esta_activo == True).scalar() or 0.0
    )
    litigios_materia = db.query(models.Litigio.materia, func.count(models.Litigio.id)).group_by(models.Litigio.materia).all()
    desglose_materia = {
        (materia.value if hasattr(materia, "value") else str(materia)): cantidad
        for materia, cantidad in litigios_materia
    }

    hoy = datetime.now()
    limite_30_dias = hoy + timedelta(days=30)
    contratos_por_vencer = (
        db.query(models.Contrato)
        .filter(
            models.Contrato.fecha_vencimiento != None,
            models.Contrato.fecha_vencimiento >= hoy,
            models.Contrato.fecha_vencimiento <= limite_30_dias,
            models.Contrato.estatus != models.EstatusContrato.terminado,
        )
        .count()
    )

    return {
        "kpis": {
            "contratos_activos": contratos_activos,
            "contratos_por_vencer_30_dias": contratos_por_vencer,
            "riesgo_economico_total": float(riesgo_total),
            "litigios_por_materia": desglose_materia,
        }
    }


@app.get("/metricas/litigios-por-fase", tags=["6. Métricas Jurídicas"])
def metricas_litigios_por_fase(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(models.Litigio.fase_procesal, func.count(models.Litigio.id).label("cantidad"))
        .group_by(models.Litigio.fase_procesal)
        .all()
    )
    return [{"fase": fila.fase_procesal, "cantidad": fila.cantidad} for fila in resultados]


@app.get("/metricas/riesgo-financiero", tags=["6. Métricas Jurídicas"])
def metricas_riesgo_financiero(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    resultados = (
        db.query(models.Litigio.probabilidad_exito, func.sum(models.Litigio.monto_contingencia).label("monto_total"))
        .group_by(models.Litigio.probabilidad_exito)
        .all()
    )
    return [
        {
            "probabilidad": (
                fila.probabilidad_exito.value
                if hasattr(fila.probabilidad_exito, "value")
                else (fila.probabilidad_exito or "No especificada")
            ),
            "monto_total": float(fila.monto_total or 0.0),
        }
        for fila in resultados
    ]


@app.get("/metricas/carga-trabajo", tags=["6. Métricas Jurídicas"])
def metricas_carga_trabajo(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    usuarios = db.query(models.Usuario).all()
    reporte_carga = []
    for u in usuarios:
        total_contratos = len(u.contratos) if u.contratos else 0
        total_litigios = len(u.litigios) if u.litigios else 0
        reporte_carga.append(
            {
                "usuario_id": u.id,
                "nombre": u.nombre,
                "rol": u.rol.value if hasattr(u.rol, "value") else str(u.rol),
                "total_contratos": total_contratos,
                "total_litigios": total_litigios,
                "carga_total_asuntos": total_contratos + total_litigios,
            }
        )
    return reporte_carga


@app.get("/metricas/tiempo-promedio-fases", tags=["6. Métricas Jurídicas"])
def metricas_tiempo_promedio_fases(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """
    Calcula el tiempo promedio (en días) que los juicios permanecen en cada fase procesal
    utilizando las marcas de tiempo de historial_litigios y la fecha de creación del litigio.
    """
    litigios = db.query(models.Litigio).all()
    tiempos_por_fase: dict[str, list[float]] = {}
    ahora = datetime.now()

    for lit in litigios:
        cambios = (
            db.query(models.HistorialLitigio)
            .filter(models.HistorialLitigio.litigio_id == lit.id)
            .order_by(models.HistorialLitigio.fecha_cambio.asc())
            .all()
        )

        fecha_inicio_fase = lit.creado_en or ahora
        if not cambios:
            fase = (lit.fase_procesal or "Inicial").capitalize()
            dias = max((ahora - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
            tiempos_por_fase.setdefault(fase, []).append(dias)
        else:
            for cambio in cambios:
                fase_ant = (cambio.fase_anterior or "Inicio").capitalize()
                fecha_cambio = cambio.fecha_cambio or ahora
                dias = max((fecha_cambio - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
                tiempos_por_fase.setdefault(fase_ant, []).append(dias)
                fecha_inicio_fase = fecha_cambio

            # Tiempo acumulado en la fase actual desde el último cambio
            fase_actual = (lit.fase_procesal or "Actual").capitalize()
            dias_actual = max((ahora - fecha_inicio_fase).total_seconds() / 86400.0, 0.1)
            tiempos_por_fase.setdefault(fase_actual, []).append(dias_actual)

    resultado = [
        {
            "fase": fase,
            "dias_promedio": round(sum(lista) / len(lista), 1),
            "transiciones_evaluadas": len(lista),
        }
        for fase, lista in tiempos_por_fase.items()
    ]
    return resultado


# =====================================================================
# 10. MOTOR DE REGLAS Y ASISTENTE EXPERTO DE LITIGIOS
# =====================================================================
class MensajeChat(BaseModel):
    texto: str


@app.get("/litigios/{litigio_id}/analizar", tags=["7. Motor de Reglas Jurídicas"])
def analizar_litigio_ia(
    litigio_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    nivel_riesgo = "ALTO" if litigio.monto_contingencia > 200000 else "MODERADO"
    analisis_generado = (
        f"⚖️ [Motor de Reglas Jurídicas PluriOne - Diagnóstico Procesal]\n\n"
        f"• Expediente: {litigio.expediente} ({litigio.materia})\n"
        f"• Fase Procesal Actual: {litigio.fase_procesal}\n"
        f"• Evaluación de Contingencia: Se detecta un nivel de riesgo {nivel_riesgo} "
        f"debido al monto involucrado de ${litigio.monto_contingencia:,.2f}.\n\n"
        f"💡 Recomendación del Sistema: Dado que la probabilidad de éxito se estima como '{litigio.probabilidad_exito}', "
        f"se aconseja reforzar de inmediato el desahogo de pruebas documentales en esta etapa para blindar la postura de la empresa."
    )
    return {"analisis": analisis_generado}


@app.post("/litigios/{litigio_id}/chat", tags=["7. Motor de Reglas Jurídicas"])
def chat_litigio_ia(
    litigio_id: int,
    mensaje: MensajeChat,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    litigio = db.query(models.Litigio).filter(models.Litigio.id == litigio_id).first()
    if not litigio:
        raise HTTPException(status_code=404, detail="Juicio no encontrado")

    pregunta = mensaje.texto.lower()
    if "peor escenario" in pregunta or "perdemos" in pregunta or "riesgo" in pregunta:
        respuesta = f"📉 Si el fallo es desfavorable en esta materia ({litigio.materia}), la empresa tendría que desembolsar el monto total de contingencia de ${litigio.monto_contingencia:,.2f}, más gastos y costas del juicio. Sugiero provisionar este monto contablemente."
    elif "acuerdo" in pregunta or "negociar" in pregunta:
        respuesta = f"🤝 Dado que nuestra probabilidad de éxito actual es '{litigio.probabilidad_exito}', buscar un acuerdo conciliatorio podría ahorrar hasta un 30% del monto total en contingencia procesal."
    elif "tiempo" in pregunta or "cuánto" in pregunta or "duración" in pregunta:
        respuesta = f"⏳ Actualmente nos encontramos en la fase de '{litigio.fase_procesal}'. Dependiendo de la carga del juzgado, esta etapa puede demorar entre 3 y 6 meses antes de pasar a la siguiente instancia judicial."
    elif "resumen" in pregunta or "director" in pregunta:
        respuesta = (
            f"📝 Resumen Ejecutivo:\n"
            f"Expediente: {litigio.expediente} ({litigio.materia}).\n"
            f"Fase Procesal: {litigio.fase_procesal}.\n"
            f"Riesgo Financiero: ${litigio.monto_contingencia:,.2f}.\n"
            f"Estatus de probabilidad: {litigio.probabilidad_exito}."
        )
    elif "documento" in pregunta or "prueba" in pregunta:
        respuesta = f"📁 Para respaldar nuestra postura en la fase actual ('{litigio.fase_procesal}'), es vital recopilar todos los contratos originales, correos electrónicos vinculantes y testimoniales antes de la audiencia."
    else:
        respuesta = f"⚖️ Evaluando expediente {litigio.expediente}... Te sugiero vigilar estrictamente los plazos de la fase actual ('{litigio.fase_procesal}') para evitar preclusiones. ¿Te gustaría explorar opciones de acuerdo o revisar el riesgo financiero?"

    return {"respuesta": respuesta}
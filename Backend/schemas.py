from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class ContratoEstatusUpdate(BaseModel):
    estatus: str

# ==========================================
# 1. ESQUEMAS DE AUTENTICACIÓN Y USUARIOS
# ==========================================

class UsuarioLogin(BaseModel):
    email: str = Field(
        ..., 
        title="Correo Electrónico", 
        description="Ingresa el correo con el que te registraste (ej. abogado@plurione.com)."
    )
    password: str = Field(
        ..., 
        title="Contraseña", 
        description="Ingresa tu contraseña secreta."
    )
class UsuarioCreate(BaseModel):
    nombre: str = Field(
        ..., 
        title="Nombre Completo", 
        description="Nombre de pila y apellidos del responsable.",
        examples=["Juan Pérez"] # <--- Reemplaza "string" en Swagger
    )
    email: str = Field(
        ..., 
        title="Correo Institucional", 
        description="Correo electrónico oficial para el acceso a la plataforma.",
        examples=["juan@plurione.com"] # <--- Reemplaza "string" en Swagger
    )
    password: str = Field(
        ..., 
        title="Contraseña de Acceso", 
        description="Crea una contraseña segura (mínimo 4 caracteres).",
        min_length=4,
        examples=["mi_contraseña_123"] # <--- Reemplaza "string" en Swagger
    )
    rol: str = Field(
        ..., 
        title="Nivel de Permisos", 
        description="Escribe exactamente 'admin' (control total) o 'viewer' (solo lectura).",
        examples=["admin"] # <--- Reemplaza "string" en Swagger
    )

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str

    model_config = {"from_attributes": True}

# ==========================================
# 2. ESQUEMAS DE CONTRATOS
# ==========================================

class ContratoCreate(BaseModel):
    tipo_contrato: str = Field(
        ..., 
        title="Tipo de Contrato", 
        description="Ej. Arrendamiento, Prestación de Servicios, Confidencialidad.",
        examples=["Prestación de Servicios"]
    )
    contraparte: str = Field(
        ..., 
        title="Contraparte", 
        description="Nombre de la empresa o persona con la que se firma.",
        examples=["Soluciones Tecnológicas S.A. de C.V."]
    )
    departamento_solicitante: str = Field(
        ..., 
        title="Departamento Solicitante", 
        description="Área interna de PluriOne que solicitó el contrato.",
        examples=["Recursos Humanos"]
    )
    fecha_firma: date = Field(
        ..., 
        title="Fecha de Firma", 
        description="Fecha en la que entró en vigor (Formato: YYYY-MM-DD).",
        examples=["2026-10-01"]
    )
    fecha_vencimiento: date = Field(
        ..., 
        title="Fecha de Vencimiento", 
        description="Fecha en la que termina el contrato (Formato: YYYY-MM-DD).",
        examples=["2027-10-01"]
    )
    monto_operacion: float = Field(
        ..., 
        title="Monto de la Operación", 
        description="Valor económico del contrato. Escríbelo sin comas.",
        examples=[150000.50]
    )
    estatus: str = Field(
        ..., 
        title="Estatus Actual", 
        description="Escribe exactamente: 'Borrador', 'En Revisión', 'Activo', 'Vencido' o 'Terminado'.",
        examples=["Activo"]
    )
    usuario_responsable_id: int = Field(
        ..., 
        title="ID del Responsable", 
        description="El número de ID del abogado a cargo de este contrato.",
        examples=[1]
    )

class ContratoResponse(ContratoCreate):
    id: int
    creado_en: datetime
    model_config = {"from_attributes": True}

# ==========================================
# 3. ESQUEMAS DE LITIGIOS (JUICIOS)
# ==========================================

class LitigioCreate(BaseModel):
    expediente: str = Field(
        ..., 
        title="Número de Expediente", 
        description="El número oficial asignado por el juzgado.",
        examples=["145/2026"]
    )
    materia: str = Field(
        ..., 
        title="Materia Legal", 
        description="Escribe exactamente: 'Laboral', 'Mercantil', 'Civil', 'Fiscal' o 'Administrativo'.",
        examples=["Laboral"]
    )
    fase_procesal: str = Field(
        ..., 
        title="Fase del Juicio", 
        description="Estado actual del caso.",
        examples=["Demanda Inicial"]
    )
    monto_contingencia: float = Field(
        ..., 
        title="Monto en Riesgo", 
        description="Cantidad de dinero demandada. Escríbela sin comas.",
        examples=[500000.00]
    )
    probabilidad_exito: str = Field(
        ..., 
        title="Probabilidad de Ganar", 
        description="Estimación del abogado: Escribe 'Alta', 'Media' o 'Baja'.",
        examples=["Alta"]
    )
    usuario_responsable_id: int = Field(
        ..., 
        title="ID del Abogado Responsable", 
        description="Número de ID del usuario que lleva este caso.",
        examples=[1]
    )

class LitigioResponse(LitigioCreate):
    id: int
    usuario_responsable_id: Optional[int] = None # Para soportar datos antiguos
    creado_en: datetime
    model_config = {"from_attributes": True}
    
# ==========================================
# 4. ESQUEMAS DE HISTORIAL DE LITIGIOS
# ==========================================

class HistorialLitigioCreate(BaseModel):
    fase_nueva: str = Field(
        ..., 
        title="Nueva Fase Procesal", 
        description="La etapa a la que avanza el juicio.",
        examples=["Desahogo de Pruebas"]
    )
    comentarios: Optional[str] = Field(
        None, 
        title="Comentarios / Justificación", 
        description="Explica brevemente por qué cambió de fase o los resultados.",
        examples=["Se presentaron los testigos a favor de la empresa de manera exitosa."]
    )
    usuario_modificador_id: int = Field(
        ..., 
        title="ID de quien modifica", 
        description="Tu número de ID de usuario para registrar la auditoría.",
        examples=[1]
    )



class HistorialLitigioResponse(BaseModel):
    id: int
    litigio_id: int
    usuario_modificador_id: int
    fase_anterior: str
    fase_nueva: str
    comentarios: Optional[str]
    fecha_cambio: datetime
    model_config = {"from_attributes": True}

    # --- Agregar en la sección de Usuarios ---
class UsuarioCreate(BaseModel):
    nombre_completo: str
    email: str
    password: str
    rol: str = "abogado"  # Por defecto será abogado, pero podrías mandar "admin"

    class ActualizarFase(BaseModel):
        nueva_fase: str
    comentarios: Optional[str] = None
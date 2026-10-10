from pydantic import BaseModel, Field
from typing import Optional, List
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
        examples=["Juan Pérez"]
    )
    email: str = Field(
        ..., 
        title="Correo Institucional", 
        description="Correo electrónico oficial para el acceso a la plataforma.",
        examples=["juan@plurione.com"]
    )
    password: str = Field(
        ..., 
        title="Contraseña de Acceso", 
        description="Crea una contraseña segura (mínimo 4 caracteres).",
        min_length=4,
        examples=["mi_contraseña_123"]
    )
    rol: str = Field(
        "abogado", 
        title="Nivel de Permisos", 
        description="Escribe exactamente 'admin', 'abogado' o 'viewer'.",
        examples=["abogado"]
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
        examples=["Prestación de Servicios"]
    )
    contraparte: str = Field(
        ..., 
        title="Contraparte", 
        examples=["Soluciones Tecnológicas S.A. de C.V."]
    )
    departamento_solicitante: str = Field(
        ..., 
        title="Departamento Solicitante", 
        examples=["Recursos Humanos"]
    )
    fecha_firma: date = Field(
        ..., 
        title="Fecha de Firma", 
        examples=["2026-10-01"]
    )
    fecha_vencimiento: date = Field(
        ..., 
        title="Fecha de Vencimiento", 
        examples=["2027-10-01"]
    )
    monto_operacion: float = Field(
        ..., 
        title="Monto de la Operación", 
        examples=[150000.50]
    )
    estatus: str = Field(
        ..., 
        title="Estatus Actual", 
        examples=["Activo"]
    )
    usuario_responsable_id: int = Field(
        ..., 
        title="ID del Responsable", 
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
    expediente: str = Field(..., title="Número de Expediente", examples=["145/2026"])
    
    # --- NUEVOS CAMPOS AÑADIDOS PARA CONECTAR CON EL FRONTEND Y CLIENTES ---
    cliente_id: int = Field(..., title="ID del Cliente Asociado", examples=[1])
    contraparte: Optional[str] = Field(None, title="Nombre de la contraparte")
    juzgado: Optional[str] = Field(None, title="Juzgado o Autoridad")
    
    materia: str = Field(..., title="Materia Legal", examples=["Laboral"])
    fase_procesal: str = Field(..., title="Fase del Juicio", examples=["Demanda Inicial"])
    monto_contingencia: float = Field(..., title="Monto en Riesgo", examples=[500000.00])
    probabilidad_exito: str = Field(..., title="Probabilidad de Ganar", examples=["Alta"])
    usuario_responsable_id: int = Field(..., title="ID del Abogado Responsable", examples=[1])

class LitigioResponse(LitigioCreate):
    id: int
    usuario_responsable_id: Optional[int] = None 
    creado_en: datetime
    model_config = {"from_attributes": True}
    
# ==========================================
# 4. ESQUEMAS DE HISTORIAL DE LITIGIOS
# ==========================================

class HistorialLitigioCreate(BaseModel):
    fase_nueva: str = Field(..., title="Nueva Fase Procesal")
    comentarios: Optional[str] = Field(None, title="Comentarios / Justificación")
    usuario_modificador_id: int = Field(..., title="ID de quien modifica")

class HistorialLitigioResponse(BaseModel):
    id: int
    litigio_id: int
    usuario_modificador_id: int
    fase_anterior: str
    fase_nueva: str
    comentarios: Optional[str]
    fecha_cambio: datetime
    model_config = {"from_attributes": True}

class ActualizarFase(BaseModel):
    nueva_fase: str
    comentarios: Optional[str] = None

# ==========================================
# 5. ESQUEMAS DE CLIENTES Y EXPEDIENTES
# ==========================================

class ClienteBase(BaseModel):
    nombre_completo: str
    rfc: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    creado_en: datetime
    
    model_config = {"from_attributes": True}

class ExpedienteBase(BaseModel):
    numero_expediente: str
    titulo: str
    descripcion: Optional[str] = None
    estado: str = "Abierto"
    cliente_id: int
    abogado_id: int

class ExpedienteCreate(ExpedienteBase):
    pass

class ExpedienteResponse(ExpedienteBase):
    id: int
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    model_config = {"from_attributes": True}
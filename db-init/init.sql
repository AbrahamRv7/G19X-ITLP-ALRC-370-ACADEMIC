-- =====================================================================
-- ESQUEMA RELACIONAL COMPLETO: PLURIONE LEGALOPS
-- Sincronizado 1:1 con Backend/models.py
-- =====================================================================

-- 1. Tipos Enumerados (Enums del dominio jurídico)
DO $$ BEGIN
    CREATE TYPE rolusuario AS ENUM ('admin', 'abogado', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estatuscontrato AS ENUM ('Borrador', 'En Revisión', 'Activo', 'Vencido', 'Terminado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE materialitigio AS ENUM ('Laboral', 'Mercantil', 'Civil', 'Fiscal', 'Administrativo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE nivelprobabilidad AS ENUM ('Alta', 'Media', 'Baja');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabla de Usuarios (Control de acceso basado en roles RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rolusuario DEFAULT 'viewer',
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Clientes (Padrón corporativo CRM Legal)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    rfc VARCHAR(13) UNIQUE,
    correo VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Contratos (Instrumentos jurídicos vinculados a clientes y abogados)
CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    usuario_responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    tipo_contrato VARCHAR(100) NOT NULL,
    contraparte VARCHAR(150) NOT NULL,
    departamento_solicitante VARCHAR(100) NOT NULL,
    fecha_firma TIMESTAMP,
    fecha_vencimiento TIMESTAMP,
    monto_operacion NUMERIC(15, 2) DEFAULT 0.00,
    estatus estatuscontrato DEFAULT 'Activo',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Litigios / Juicios (Control de contingencias y fases procesales)
CREATE TABLE IF NOT EXISTS litigios (
    id SERIAL PRIMARY KEY,
    usuario_responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    expediente VARCHAR(50) UNIQUE NOT NULL,
    contraparte VARCHAR(150),
    juzgado VARCHAR(150),
    materia materialitigio NOT NULL,
    fase_procesal VARCHAR(100) NOT NULL,
    monto_contingencia NUMERIC(15, 2) DEFAULT 0.00,
    probabilidad_exito nivelprobabilidad,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Historial de Litigios (Bitácora para cálculo de tiempos por fase)
CREATE TABLE IF NOT EXISTS historial_litigios (
    id SERIAL PRIMARY KEY,
    litigio_id INTEGER NOT NULL REFERENCES litigios(id) ON DELETE CASCADE,
    usuario_modificador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fase_anterior VARCHAR(100),
    fase_nueva VARCHAR(100) NOT NULL,
    comentarios TEXT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


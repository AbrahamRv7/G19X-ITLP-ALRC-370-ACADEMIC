-- 1. TIPOS DE DATOS RESTRINGIDOS (ENUMS)
-- Fundamentales para las métricas: evitan que un usuario escriba "Activo", "activo" o "ACTIVO", 
-- lo cual arruinaría las agrupaciones en tus gráficas del dashboard.

CREATE TYPE rol_usuario AS ENUM ('admin', 'abogado', 'viewer');
CREATE TYPE estatus_contrato AS ENUM ('Borrador', 'En Revisión', 'Activo', 'Vencido', 'Terminado');
CREATE TYPE materia_litigio AS ENUM ('Laboral', 'Mercantil', 'Civil', 'Fiscal', 'Administrativo');
CREATE TYPE nivel_probabilidad AS ENUM ('Alta', 'Media', 'Baja');

-- 2. TABLAS PRINCIPALES CON TRAZABILIDAD Y RELACIONES

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario DEFAULT 'viewer',
    esta_activo BOOLEAN DEFAULT true, -- Borrado lógico (nunca se elimina el registro real)
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contratos (
    id SERIAL PRIMARY KEY,
    usuario_responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Relación: ¿Quién lo gestiona?
    tipo_contrato VARCHAR(100) NOT NULL, 
    contraparte VARCHAR(150) NOT NULL,
    departamento_solicitante VARCHAR(100) NOT NULL,
    fecha_firma DATE,
    fecha_vencimiento DATE,
    monto_operacion DECIMAL(15, 2) DEFAULT 0.00,
    estatus estatus_contrato DEFAULT 'Activo',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE litigios (
    id SERIAL PRIMARY KEY,
    usuario_responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Relación: Abogado a cargo
    expediente VARCHAR(50) UNIQUE NOT NULL,
    materia materia_litigio NOT NULL,
    fase_procesal VARCHAR(100) NOT NULL,
    monto_contingencia DECIMAL(15, 2) DEFAULT 0.00,
    probabilidad_exito nivel_probabilidad,
    esta_activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. NUEVA TABLA: HISTORIAL DE MOVIMIENTOS (EL MOTOR DE LOS KPIs)
-- Esta tabla te dará la métrica más valiosa para el área jurídica: 
-- "Cuánto tiempo promedio pasa un juicio estancado en cada fase".

CREATE TABLE historial_litigios (
    id SERIAL PRIMARY KEY,
    litigio_id INTEGER NOT NULL REFERENCES litigios(id) ON DELETE CASCADE,
    usuario_modificador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fase_anterior VARCHAR(100),
    fase_nueva VARCHAR(100) NOT NULL,
    comentarios TEXT,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
# ⚖️ PluriOne LegalOps

**PluriOne LegalOps** es una plataforma Full-Stack de nivel empresarial diseñada para la gestión integral de operaciones legales, seguimiento de contratos, control de litigios y análisis de contingencias financieras.

Este proyecto fue desarrollado como parte del programa de **Ingeniería en Sistemas Computacionales** para el Tecnológico Nacional de México / Instituto Tecnológico de La Piedad.


---


## 🔗 Enlaces del Proyecto en Producción

- **Frontend (Aplicación Web):** [https://g19-x-itlp-alrc-370-academic.vercel.app](https://g19-x-itlp-alrc-370-academic.vercel.app)

- **Backend (API REST):** [https://plurione-backend-ur9j.onrender.com](https://plurione-backend-ur9j.onrender.com)

- **Documentación Interactiva (Swagger UI):** [https://plurione-backend-ur9j.onrender.com/docs](https://plurione-backend-ur9j.onrender.com/docs)


---


## 🚀 Arquitectura del Sistema

El sistema opera bajo una arquitectura en la nube escalable y separada en tres capas:

- **Frontend (Cliente):** Aplicación de una sola página (SPA) desarrollada con React y Vite, desplegada en **Vercel**. Proporciona una interfaz fluida, analítica visual con Recharts y diseño responsivo.

- **Backend (API Rest):** Motor transaccional construido con Python y FastAPI, desplegado en **Render**. Gestiona la lógica de negocio, autenticación segura y endpoints automáticos.

- **Base de Datos:** Base de datos relacional alojada en **PostgreSQL** (Contenedor Dockerizado para desarrollo local / Render en producción), con esquemas administrados mediante SQLAlchemy y auto-migraciones.


> **Nota sobre el Asistente Jurídico:** Para esta fase del MVP, el "Asistente" evalúa expedientes mediante un motor de reglas jurídicas procesales basado en lógica estructurada y palabras clave, sin depender de APIs externas de LLMs.

> **Nota sobre expedientes:** Los expedientes se manejan de manera integrada como una vista directa dentro de los registros de litigios y contratos, por lo que no se requiere una tabla de base de datos dedicada exclusivamente a expedientes.


---



## ⚙️ Tecnologías Utilizadas

### Frontend

- **React 19** + **Vite**

- **React Router DOM** (Navegación protegida)

- **Recharts** (Dashboards y gráficas analíticas)

- **React Hot Toast** (Notificaciones de sistema)



### Backend

- **Python 3.10+** + **FastAPI**

- **SQLAlchemy** (ORM) + **Pydantic** (Validación de esquemas)

- **Passlib & Bcrypt** (Hashing de contraseñas)

- **PyJWT** (Autenticación basada en Tokens JSON Web)

- **Psycopg2** (Driver de PostgreSQL)


---


## 🧩 Módulos Principales

1. **Directorio Corporativo (CRM Legal):** Padrón de clientes con cálculo dinámico de exposición financiera, búsqueda inteligente y exportación CSV. Incluye **Ficha 360°** (vista centralizada).

2. **Gestión de Contratos:** Registro de instrumentos legales con alertas de caducidad y control de estatus.

3. **Control de Litigios (Juicios):** Seguimiento de expedientes judiciales con registro de riesgo económico y **Motor de Historial** (bitácora procesal interactiva).

4. **Panel de Indicadores (Dashboard):** KPIs financieros, gráficas de distribución de carga legal y métricas de rendimiento.

5. **Seguridad y Control de Acceso:** Rutas protegidas, autenticación vía JWT y endpoints restringidos para administradores.


---



## 🔐 Instalación y Despliegue Local

Asegúrate de tener instalados **Node.js (18+)**, **Python (3.10+)** y **Docker / Docker Compose**.



### 1. Clonar el repositorio

```bash

git clone https://github.com/AbrahamRv7/G19X-ITLP-ALRC-370-ACADEMIC.git

cd G19X-ITLP-ALRC-370-ACADEMIC

```

### 2. Configurar Base de Datos y Variables de Entorno

Copia el archivo `.env.example` en la carpeta `Backend` y renómbralo a `.env`. Asegúrate de que la contraseña en la `DATABASE_URL` coincida con el `docker-compose.yml`.

```bash

cp Backend/.env.example Backend/.env

docker-compose up -d
> **Nota de limpieza:** Si necesitas reiniciar el entorno y empezar con una base de datos totalmente vacía desde cero, ejecuta el comando `docker-compose down -v` antes de volver a levantar los contenedores.

```

### 3. Configurar y Ejecutar el Backend

```bash

cd Backend

python -m venv .venv

# Activar entorno (Windows: .venv\Scripts\activate | Mac/Linux: source .venv/bin/activate)

pip install -r requirements.txt

uvicorn main:app --reload --port 8000

```

*La API estará en `http://localhost:8000` y Swagger UI en `http://localhost:8000/docs`.*



### 4. Configurar y Ejecutar el Frontend

En una nueva terminal:

```bash

cd Frontend
cp .env.example .env
npm install
npm run dev

```

*La app web estará en `http://localhost:5173`.*



---


## 🔑 Usuario de Prueba Local

El sistema crea un administrador con las credenciales de tu `.env`. Para generar datos de prueba (clientes, contratos, litigios), ejecuta desde `Backend/`:

```bash

python seed.py

```

**Cuentas de Prueba Disponibles:**

| Correo | Rol | Contraseña |

|---|---|---|

| *(El definido en `INITIAL_ADMIN_EMAIL`)* | admin | *(La definida en `INITIAL_ADMIN_PASSWORD`)* |

| abogado@demo.local | abogado | Demo2026! |

| viewer@demo.local | viewer | Demo2026! |

---

## ✅ Pruebas Automáticas

Este proyecto utiliza `pytest` y `httpx`. Asegúrate de tener tu entorno virtual activado y ejecuta desde `Backend/`:

```bash

pytest tests/ -v

```

---

## 👨‍💻 Autor

**Abraham Rivera** | Estudiante de 8vo Semestre | Ingeniería en Sistemas Computacionales | Tecnológico Nacional de México / Instituto Tecnológico de La Piedad
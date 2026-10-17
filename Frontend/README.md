# ⚖️ PluriOne LegalOps — Plataforma de Métricas e Indicadores del Área Jurídica

**PluriOne LegalOps** es una plataforma Full-Stack diseñada para centralizar las operaciones de un departamento jurídico corporativo: administración de clientes, seguimiento del ciclo de vida de contratos, control de litigios (juicios), bitácora de transiciones procesales y cálculo de indicadores clave de desempeño (KPIs) legales y financieros.

---

## 🔗 Entornos Desplegados en Producción

- **Frontend (Vercel):** https://g19-x-itlp-alrc-370-academic.vercel.app
- **Backend API (Render):** https://plurione-backend-ur9j.onrender.com
- **Documentación OpenAPI / Swagger UI:** https://plurione-backend-ur9j.onrender.com/docs

---

## 🏗️ Arquitectura y Stack Real Implementado

El proyecto está distribuido en tres capas desacopladas[cite: 10]:

1. **Frontend (`Frontend/`):** SPA construida con **React 18**, **Vite**, **React Router DOM**, gráficas interactivas con **Recharts**, notificaciones con **React Hot Toast** y cliente HTTP **Axios** con interceptores de autenticación JWT[cite: 10].
2. **Backend (`Backend/`):** API RESTful en **Python 3.10+** con **FastAPI**, **SQLAlchemy 2.0**, validación de esquemas con **Pydantic v2**, hashing **Bcrypt (Passlib)** y control de acceso basado en roles (**RBAC**: `admin`, `abogado`, `viewer`) mediante **JWT**[cite: 10].
3. **Base de Datos (`db-init/`):** **PostgreSQL 15** contenedorizado localmente mediante `docker-compose.yml` y desplegado en Render Managed PostgreSQL[cite: 10].

---

## 📊 Indicadores y Módulos del Sistema

- **Métricas Jurídicas en Tiempo Real (`/dashboard/kpis` y `/metricas/*`):**
  - **Tiempo promedio por fase procesal (`GET /metricas/tiempo-promedio-fases`):** Calcula los días promedio que un litigio permanece en cada etapa procesal analizando las marcas de tiempo de `historial_litigios`.
  - **Contratos próximos a vencer:** Conteo preventivo de contratos activos con vencimiento en los próximos 30 días, además de caducidad automática al superar la fecha límite.
  - **Exposición financiera por probabilidad (`GET /metricas/riesgo-financiero`):** Agrupa la contingencia económica según probabilidad de éxito (`Alta`, `Media`, `Baja`).
  - **Carga de trabajo por abogado (`GET /metricas/carga-trabajo`):** Distribución de contratos y litigios asignados por responsable.
- **Directorio Corporativo y Ficha 360° (`/clientes`):** Padrón de clientes con consolidado de contratos, litigios, búsqueda dinámica y exportación a CSV (UTF-8).
- **Motor de Reglas Jurídicas (`/litigios/{id}/analizar` y `/chat`):** Sistema experto basado en reglas deterministas de negocio que evalúa el monto de contingencia, la probabilidad de éxito y la etapa procesal para emitir diagnósticos preventivos (no requiere llaves externas de LLM).

---

## ⚙️ Variables de Entorno

### Backend (`Backend/.env` — ver plantilla en `Backend/.env.example`)
| Variable | Descripción | Ejemplo Local |
| :--- | :--- | :--- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgresql://postgres:postgres@localhost:5432/plurione_db` |
| `SECRET_KEY` | Llave secreta para firma de tokens JWT | `clave_local_desarrollo_segura_64_chars` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Vigencia del token JWT en minutos | `60` |
| `INITIAL_ADMIN_EMAIL` | Correo del administrador creado al arranque | `admin@plurione.com` |
| `INITIAL_ADMIN_PASSWORD` | Contraseña inicial del administrador | `AdminPluriOne2026!` |
| `INITIAL_ADMIN_NAME` | Nombre del administrador inicial | `Administrador PluriOne` |
| `FRONTEND_ORIGIN` | Origen permitido por CORS | `http://localhost:5173` |

### Frontend (`Frontend/.env` — ver plantilla en `Frontend/.env.example`)
| Variable | Descripción | Ejemplo Local |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL base del backend FastAPI | `http://localhost:8000` |

---

## 🚀 Guía de Instalación y Ejecución Local (Paso a Paso)

### 1. Clonar el repositorio
```bash
git clone [https://github.com/AbrahamRv7/G19X-ITLP-ALRC-370-ACADEMIC.git](https://github.com/AbrahamRv7/G19X-ITLP-ALRC-370-ACADEMIC.git)
cd G19X-ITLP-ALRC-370-ACADEMIC
```

### 2. Levantar la Base de Datos PostgreSQL con Docker Compose
En la raíz del proyecto se incluye `docker-compose.yml` y el script `db-init/init.sql` que inicializa todas las tablas y tipos enumerados automáticamente:
```bash
docker-compose up -d
```

### 3. Configurar y ejecutar el Backend (FastAPI)
```bash
cd Backend
cp .env.example .env
# Edita .env con los datos de tu contenedor local de PostgreSQL
python -m venv .venv
.venv\Scripts\activate   # En Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Configurar y ejecutar el Frontend (React + Vite)
En una nueva terminal:
```bash
cd Frontend
cp .env.example .env
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173` y la documentación interactiva de la API en `http://localhost:8000/docs`.

---

## 🔐 Usuario de Prueba

Al iniciar el backend con las variables definidas en `Backend/.env`, el evento de arranque verifica y crea automáticamente el usuario administrador inicial configurado en `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` (rol `admin`), con permisos para dar de alta usuarios (`POST /usuarios`) y eliminar registros (`DELETE`).

---

## 👨‍💻 Autor
**Abraham Luis Rivera**  
Ingeniería en Sistemas Computacionales — Instituto Tecnológico de La Piedad (TecNM)
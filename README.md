# ⚖️ PluriOne LegalOps

**PluriOne LegalOps** es una plataforma Full-Stack de nivel empresarial diseñada para la gestión integral de operaciones legales, seguimiento de contratos, control de litigios y análisis de contingencias financieras. 

Este proyecto fue desarrollado como parte del programa de **Residencia Profesional** para la carrera de Ingeniería en Sistemas Computacionales.

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

> **Nota sobre el Asistente Jurídico:** Para esta fase del MVP, el "Asistente" evalúa expedientes mediante un motor de reglas jurídicas procesales basado en lógica estructurada y palabras clave, sin depender de llamadas a APIs externas de LLMs.

---

## ⚙️ Tecnologías Utilizadas

### Frontend
- **React 18** + **Vite**
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

1. **Directorio Corporativo (CRM Legal):** 
   * Padrón de clientes con cálculo dinámico en tiempo real de su exposición financiera (riesgo en litigios y montos en contratos).
   * Búsqueda inteligente y exportación completa a formato CSV.
   * **Ficha 360°:** Vista centralizada del expediente de un cliente con todo su historial asociado.
2. **Gestión de Contratos:** 
   * Registro de instrumentos legales con alertas de caducidad automática basadas en la fecha de vencimiento.
   * Control de estatus (Borrador, En Revisión, Activo, Vencido, Terminado) y vinculación directa a clientes.
3. **Control de Litigios (Juicios):** 
   * Seguimiento de expedientes judiciales con registro de riesgo económico (contingencia) y materia (Laboral, Mercantil, Civil, etc.).
   * **Motor de Historial:** Bitácora procesal y línea de tiempo interactiva que registra cada avance o cambio de fase del juicio.
4. **Panel de Indicadores (Dashboard):** 
   * KPIs financieros calculando el riesgo económico global de la empresa.
   * Gráficas de distribución de carga legal (Juicios por Materia y Estatus de Contratos).
   * Métricas de rendimiento y tiempos promedio por fase procesal.
5. **Seguridad y Control de Acceso:** 
   * Rutas protegidas mediante `Depends(get_current_user)` en FastAPI.
   * Autenticación vía JWT y endpoints de registro restringidos exclusivamente para administradores.

---

## 🔐 Instalación y Despliegue Local

Para ejecutar el proyecto en un entorno de desarrollo local, asegúrate de tener instalados **Node.js (18+)**, **Python (3.10+)** y **Docker / Docker Compose**.

### 1. Clonar el repositorio
```bash
git clone https://github.com/AbrahamRv7/G19X-ITLP-ALRC-370-ACADEMIC.git
cd G19X-ITLP-ALRC-370-ACADEMIC
```

### 2. Configurar Base de Datos y Variables de Entorno
En la carpeta `Backend`, copia el archivo `.env.example` y renómbralo a `.env`. Ajusta las variables si es necesario:
```bash
cp Backend/.env.example Backend/.env
```
Luego, desde la raíz del proyecto, inicia el contenedor de PostgreSQL para cargar el script inicial (`db-init/init.sql`):
```bash
docker-compose up -d
```

### 3. Configurar y Ejecutar el Backend
```bash
cd Backend
python -m venv .venv
# Activar el entorno virtual:
# En Windows: .venv\Scripts\activate
# En Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*La API estará disponible en `http://localhost:8000` y Swagger UI en `http://localhost:8000/docs`.*

### 4. Configurar y Ejecutar el Frontend
En una nueva terminal:
```bash
cd Frontend
npm install
npm run dev
```
*La aplicación web estará disponible en `http://localhost:5173`.*

---

## 🔑 Usuario de Prueba Local
Al ejecutar el backend por primera vez, el sistema creará un usuario administrador automático basándose en las credenciales proporcionadas en tu archivo `.env` (`INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`). Utiliza estas credenciales para iniciar sesión en la interfaz.

---

## 👨‍💻 Autor
**Abraham Rivera**  
Estudiante de 8vo Semestre | Ingeniería en Sistemas Computacionales | Instituto Tecnológico de La Piedad


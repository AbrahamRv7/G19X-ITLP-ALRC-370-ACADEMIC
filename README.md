# ⚖️ PluriOne: LegalOps Analytics & AI Copilot

PluriOne es una plataforma SaaS diseñada para modernizar y centralizar la operación de departamentos jurídicos corporativos. Este sistema permite la gestión del ciclo de vida de contratos, el control transaccional de litigios, la auditoría inmutable de expedientes y la generación de métricas directivas (KPIs) en tiempo real, potenciado por un asistente de Inteligencia Artificial.

## ✨ Características Principales

* **Dashboard Analítico en Tiempo Real:** Visualización de métricas financieras y riesgo económico usando Recharts.
* **Smart Contracts Management:** Seguimiento de estatus de contratos con cálculo de caducidad automática.
* **Control Transaccional de Litigios:** Registro de expedientes con bitácora de auditoría inmutable (trazabilidad de cambios procesales).
* **Copilot Legal (IA):** Asistente estratégico integrado mediante Azure OpenAI para resumir expedientes y sugerir recomendaciones.
* **Data Export:** Motor de exportación de tablas a formato CSV/Excel con codificación UTF-8 para reportes gerenciales.
* **Búsqueda Avanzada:** Filtrado reactivo en memoria para contrapartes, materias, estatus y expedientes.
* **Gobernanza y Seguridad:** Autenticación de usuarios mediante tokens JWT, contraseñas encriptadas con bcrypt y control de roles.

## 🛠️ Stack Tecnológico (Arquitectura Cliente-Servidor)

**Frontend (Capa de Presentación)**
* [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) - Framework UI y empaquetador.
* React Router DOM - Navegación SPA protegida.
* Recharts - Librería de visualización de datos.
* Axios - Cliente HTTP.
* Tailwind CSS / Estilos Modulares nativos.

**Backend (Capa de Lógica)**
* [FastAPI](https://fastapi.tiangolo.com/) - Framework asíncrono de alto rendimiento.
* Pydantic - Validación estricta de datos.
* Passlib & python-jose - Criptografía y JWT.
* Azure OpenAI API - Motor de Inteligencia Artificial.

**Base de Datos (Capa de Persistencia)**
* [PostgreSQL](https://www.postgresql.org/) - Motor relacional (Desplegado vía Docker).
* SQLAlchemy - ORM (Object-Relational Mapping).

## 🚀 Despliegue Local

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/plurione-legalops.git](https://github.com/tu-usuario/plurione-legalops.git)

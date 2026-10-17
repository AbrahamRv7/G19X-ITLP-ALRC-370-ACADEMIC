# 📄 Documento de Requisitos del Producto (PRD)
**Proyecto:** PluriOne LegalOps
**Autor:** Abraham Luis Rivera
**Institución:** Instituto Tecnológico de La Piedad (TecNM) - Residencia Profesional
**Versión:** 1.0 (MVP)

---

## 1. Visión del Producto
Centralizar, asegurar y medir las operaciones legales (LegalOps) de un departamento jurídico corporativo. PluriOne LegalOps elimina la dependencia de hojas de cálculo aisladas al proveer una plataforma Full-Stack que gestiona el ciclo de vida de contratos, historiales procesales de litigios y el cálculo automático de contingencias financieras.

## 2. Objetivos del Negocio
* **Visibilidad Financiera:** Calcular en tiempo real la exposición económica de la empresa frente a juicios y demandas activas.
* **Control de Tiempos Procesales:** Medir los cuellos de botella en los juzgados mediante el cálculo de días promedio por fase procesal.
* **Prevención de Riesgos:** Alertar de forma automática sobre contratos próximos a vencer (30 días) para evitar caducidades o renovaciones no deseadas.
* **Trazabilidad:** Mantener una bitácora inmutable (auditoría) de los cambios de fase en los expedientes judiciales.

## 3. Alcance del Producto Mínimo Viable (MVP 1.0)
El MVP abarca los siguientes módulos funcionales protegidos por Autenticación JWT y control de acceso basado en roles (RBAC):

1. **Directorio CRM (Clientes):** Alta, baja y ficha 360° con consolidado de asuntos por cliente.
2. **Control de Expedientes y Litigios:** Registro de juicios, contrapartes, juzgados y montos de contingencia.
3. **Bitácora Procesal:** Motor de historial que registra quién y cuándo cambió la fase de un juicio.
4. **Gestión de Contratos:** Control de estatus, montos de operación y fechas de vencimiento.
5. **Dashboard Analítico (Métricas Jurídicas):** Gráficas de carga de trabajo por abogado, riesgo por probabilidad de éxito, y juicios por materia.
6. **Sistema Experto Basado en Reglas:** Asistente integrado que emite diagnósticos preventivos según el monto de riesgo, la materia y la etapa del expediente.

## 4. Historias de Usuario (User Stories)

### Rol: Administrador
* **HU-01:** Como administrador, quiero visualizar el riesgo económico total consolidado en un Dashboard para reportarlo a dirección.
* **HU-02:** Como administrador, quiero tener permisos exclusivos para registrar nuevos abogados en el sistema y eliminar registros erróneos.
* **HU-03:** Como administrador, quiero ver la carga de trabajo (número de contratos y juicios) de cada abogado para balancear la asignación de expedientes.

### Rol: Abogado / Usuario Operativo
* **HU-04:** Como abogado, quiero registrar un cambio de fase procesal en un litigio para que quede guardado en el historial con fecha y hora.
* **HU-05:** Como abogado, quiero ver qué contratos están a menos de 30 días de vencer para gestionar sus renovaciones.
* **HU-06:** Como abogado, quiero poder editar las condiciones de un contrato si hay un convenio modificatorio.
* **HU-07:** Como abogado, quiero consultar el motor de reglas para obtener un diagnóstico rápido del peor escenario financiero de un expediente.

## 5. Requisitos No Funcionales
* **Seguridad:** Cifrado de contraseñas con Bcrypt. Rutas protegidas mediante JSON Web Tokens (JWT).
* **Arquitectura:** Separación estricta de Backend (FastAPI modularizado) y Frontend (React/Vite).
* **Base de Datos:** Relacional (PostgreSQL) con integridad referencial (llaves foráneas) y borrado en cascada para historiales.
* **Despliegue:** Servicios administrados en la nube (Vercel para Frontend, Render para API y Base de Datos) con variables de entorno para protección de secretos.

## 6. Métricas de Éxito del Software
* **Adopción:** Número de expedientes y contratos migrados a la plataforma en el primer trimestre.
* **Rendimiento:** Tiempos de respuesta de la API menores a 300ms en endpoints analíticos.
* **Confiabilidad:** 0 incidentes de accesos no autorizados a rutas de escritura (garantizado vía `get_current_user`).
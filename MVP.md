# Documento de Producto Mínimo Viable (MVP)
## Proyecto: PluriOne LegalOps

### 1. Funcionalidad Incluida en la Entrega Actual

El MVP de PluriOne LegalOps entregado incluye los siguientes módulos y funcionalidades, los cuales se encuentran completamente operativos y cumplen con los requerimientos iniciales del proyecto:

*   **Gestión de Clientes (CRM Legal):**
    *   Creación, lectura, actualización y eliminación (CRUD) de clientes.
    *   Vista detallada del cliente (Ficha 360°) que consolida su información, contratos y litigios asociados.
*   **Gestión de Contratos:**
    *   CRUD de contratos.
    *   Asignación de contratos a clientes específicos.
    *   Seguimiento del estatus del contrato (Borrador, En Revisión, Activo, Vencido, Terminado).
    *   Alertas automáticas de caducidad en el dashboard basadas en la fecha de vencimiento (≤ 30 días).
*   **Control de Litigios:**
    *   CRUD de litigios (expedientes judiciales).
    *   Vinculación de litigios con clientes.
    *   Registro del riesgo económico (contingencia) y materia legal.
*   **Historial y Bitácora Procesal:**
    *   Registro inmutable de los cambios de fase en los litigios.
    *   Visualización de la línea de tiempo procesal en la vista de detalle del juicio.
*   **Panel de Indicadores Jurídicos (Dashboard):**
    *   Visualización en tiempo real de métricas calculadas por el backend.
    *   Indicadores clave (KPIs): Contratos Activos, Contratos por Vencer (alerta preventiva calculada localmente), Litigios Activos y Riesgo Económico Total.
    *   Gráficas analíticas: Juicios por Materia (Gráfica de Pastel) y Estatus de Contratos (Gráfica de Barras).
    *   Métricas avanzadas: Duración Promedio por Fase Procesal, Exposición Financiera por Probabilidad y Carga de Trabajo por Abogado.
    *   Listados operativos de últimos contratos y litigios con filtros de búsqueda.
    *   Exportación de datos a formato CSV.
*   **Seguridad y Autenticación:**
    *   Sistema de login utilizando JSON Web Tokens (JWT).
    *   Contraseñas encriptadas mediante Bcrypt.
    *   Control de acceso basado en roles (RBAC): Sólo los administradores pueden crear nuevos usuarios y eliminar registros (contratos/litigios).
    *   Rutas del backend protegidas, requiriendo un token válido.
*   **Asistente Jurídico (Motor de Reglas):**
    *   Módulo integrado en el dashboard para analizar expedientes.
    *   Funcionamiento basado en un motor de reglas procesales estructuradas en el backend, respondiendo a consultas específicas mediante lógica predefinida.

### 2. Funcionalidad Excluida (Fuera del Alcance del MVP)

Las siguientes características fueron consideradas en etapas iniciales o mencionadas en la documentación, pero no forman parte del MVP entregado y se plantean para futuras iteraciones:

*   **Integración con Modelos de Lenguaje Grandes (LLMs):** El uso de servicios de inteligencia artificial externos, como Azure OpenAI, para el análisis de texto libre o generación de resúmenes legales no está implementado. El asistente actual opera exclusivamente con reglas locales.
*   **Gestión de Expedientes Independientes:** Aunque la base de datos contempla la estructura para expedientes, la interfaz de usuario para gestionarlos como una entidad separada de los litigios no fue conectada, priorizando la vista unificada dentro del módulo de litigios.
*   **Indicadores de Tendencia Temporal:** Gráficas que muestren la evolución histórica de métricas por mes o año (ej. nuevos contratos por mes) no están incluidas en esta versión.
*   **Carga y Almacenamiento de Documentos:** La funcionalidad para adjuntar, almacenar y previsualizar archivos físicos (PDFs, imágenes) vinculados a contratos o litigios no forma parte del MVP.

### 3. Guía de Pruebas (Test Cases)

A continuación, se describen los pasos para validar las historias de usuario principales definidas en el PRD:

#### Prueba 1: Autenticación y Control de Roles
1.  **Objetivo:** Verificar que el sistema distingue entre un Administrador y un Usuario normal.
2.  **Pasos:**
    *   Acceda a la URL del frontend y utilice las credenciales del Administrador Inicial (definidas en el archivo `.env`).
    *   Navegue a la sección "🛡️ Nuevo Usuario" en el Dashboard. Cree un usuario de prueba con rol "Usuario".
    *   Cierre sesión e inicie sesión con el nuevo usuario de prueba.
    *   Intente acceder directamente a la URL de creación de usuario (`/registrar-usuario`). El sistema debe redirigir o bloquear el acceso.
    *   En el listado de contratos o litigios, intente usar el botón "🗑️ Eliminar". El backend debe rechazar la operación devolviendo un error de permisos (403).

#### Prueba 2: Ciclo de Vida de un Contrato y Alertas
1.  **Objetivo:** Validar la creación, edición y el cálculo de la alerta de vencimiento de contratos.
2.  **Pasos:**
    *   En el Dashboard, navegue a "Nuevo Contrato" (o botón equivalente si se implementó acceso directo, de lo contrario, use la API/Swagger temporalmente si la pantalla de creación no está enlazada en el menú principal).
    *   Cree un contrato, asegurándose de establecer la "Fecha de Vencimiento" para una fecha que se encuentre dentro de los próximos 15 días a partir de la fecha actual. Defina un estatus inicial (ej. "Activo").
    *   Regrese al Dashboard. Verifique que la tarjeta de KPI "Por Vencer (≤ 30 días)" haya incrementado su valor en 1.
    *   Localice el contrato en el listado, haga clic en "✏️ Editar". Modifique el monto de la operación y cambie la fecha de vencimiento para el próximo año. Guarde los cambios.
    *   Verifique en el Dashboard que el nuevo monto se refleja y que el KPI de "Por Vencer" disminuyó, ya que el contrato ya no vence en los próximos 30 días.

#### Prueba 3: Gestión de Litigios y Bitácora Procesal
1.  **Objetivo:** Comprobar el seguimiento de fases y el cálculo del riesgo financiero.
2.  **Pasos:**
    *   Cree un nuevo Litigio asignándole una materia (ej. Laboral) y un Monto de Contingencia alto (ej. 500,000 MXN).
    *   En el listado de Juicios del Dashboard, verifique que el litigio aparece con el estilo de advertencia (color rojo) debido a su alto riesgo económico.
    *   Haga clic en "👁️ Detalles" del litigio creado.
    *   En la vista de detalle, utilice la opción para actualizar la fase procesal. Cambie la fase actual a "Sentencia" y agregue una nota.
    *   Verifique que la línea de tiempo se actualice inmediatamente mostrando el historial: la fase de creación inicial y el nuevo cambio a "Sentencia", junto con la fecha y hora de la modificación.

#### Prueba 4: Generación de Reportes (CSV)
1.  **Objetivo:** Asegurar la correcta exportación de los datos mostrados en pantalla.
2.  **Pasos:**
    *   En el Dashboard, ubique el panel de "📄 Últimos Contratos".
    *   Utilice el buscador para filtrar los contratos por un cliente específico.
    *   Haga clic en el botón "📥 Excel" ubicado en la cabecera de la tabla.
    *   Abra el archivo CSV descargado y verifique que su contenido corresponda exactamente a los datos (y opcionalmente a los filtros) que se visualizan en la interfaz web, sin caracteres extraños (validación UTF-8).
# Bitácora de Instalación Limpia · PluriOne LegalOps

| Paso | Qué hice | Resultado | Tiempo |
|---|---|---|---|
| 1 | Clonación limpia del repositorio en un directorio aislado fuera del workspace principal | Exitoso | 1 min |
| 2 | Copia y configuración de `Backend/.env.example` (verificando coincidencia con `POSTGRES_PASSWORD` del compose) y ejecución de `docker-compose up -d` | Exitoso (Contenedor PostgreSQL activo) | 3 min |
| 3 | Creación del entorno virtual (`.venv`), instalación de dependencias del backend con `pip` y arranque con `uvicorn` | Exitoso (API disponible en `http://localhost:8000`) | 4 min |
| 4 | Configuración del frontend copiando `.env.example` a `.env`, ejecución de `npm install` y arranque de Vite | Exitoso (SPA conectada en `http://localhost:5173`) | 5 min |
| 5 | Ejecución de las 4 pruebas del `MVP.md` (roles, permisos de admin/viewer, control de rutas protegidas y respuestas 403/422) | Exitoso (Todas las verificaciones pasaron al 100%) | 12 min |
# Flask Todo App

Aplicación web de gestión de tareas con usuarios, construida con Flask y SQLAlchemy.

## Características

✅ **Gestión de Usuarios**
- Crear, actualizar y eliminar usuarios
- Avatar con colores personalizables
- Validación de emails únicos

✅ **Gestión de Tareas**
- Crear, actualizar y eliminar tareas
- Prioridades (low, medium, high)
- Asignar tareas a usuarios
- Marcar como completadas
- Filtros por estado, prioridad y usuario
- Búsqueda por título

✅ **Sistema de Logging Avanzado**
- **events.log** - Eventos de negocio (creación, actualización, eliminación)
- **error.log** - Solo errores y excepciones
- **app.log** - Log completo (debug, info, warnings, errors)
- Rotación automática de logs (10 MB × 10 archivos)
- Herramienta `view_logs.py` para visualizar logs fácilmente

## Estructura del Proyecto

```
app_python/
├── app.py                 # Aplicación Flask principal
├── logger_config.py       # Configuración del sistema de logging
├── wsgi.py               # Entry point para Gunicorn
├── requirements.txt      # Dependencias Python
├── view_logs.py          # Herramienta para ver logs
├── .gitignore            # Archivos ignorados por Git
│
├── logs/                 # Logs de la aplicación (auto-generado)
│   ├── events.log       # Solo eventos de negocio
│   ├── error.log        # Solo errores
│   └── app.log          # Todo
│
├── templates/            # Templates HTML (si los tienes)
└── static/              # CSS, JS, imágenes (si los tienes)
```

## Instalación Local

### Requisitos

- Python 3.9 o superior
- pip

### Pasos

1. **Clonar o descargar el proyecto**

```bash
cd c:\Users\andresc\app_python
```

2. **Crear entorno virtual**

```bash
python -m venv venv
```

3. **Activar entorno virtual**

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

4. **Instalar dependencias**

```bash
pip install -r requirements.txt
```

5. **Ejecutar la aplicación**

```bash
python app.py
```

6. **Acceder a la aplicación**

Abre tu navegador en: `http://localhost:5000`

## Ver Logs

### Durante desarrollo

```bash
# Ver eventos de negocio en tiempo real
python view_logs.py events --follow

# Ver últimos 100 eventos
python view_logs.py events --tail 100

# Ver solo errores
python view_logs.py errors

# Ver todo (debug incluido)
python view_logs.py all

# Ver estadísticas
python view_logs.py stats
```

### Ejemplos de logs

**events.log:**
```
[2024-01-15 10:30:45] [USER_CREATED] Nuevo usuario creado | user_id=1 | name=Juan | email=juan@example.com
[2024-01-15 10:31:20] [TASK_CREATED] Nueva tarea creada | task_id=1 | title=Implementar login | priority=high | user_id=1
[2024-01-15 11:15:30] [TASK_COMPLETED] Tarea completada | task_id=1 | title=Implementar login
```

**error.log:**
```
[2024-01-15 10:45:12] ERROR in app (handle_exception:95): Excepción no manejada: division by zero
Traceback (most recent call last):
  ...
```

## API Endpoints

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Listar todos los usuarios |
| POST | `/api/users` | Crear nuevo usuario |
| PUT | `/api/users/<id>` | Actualizar usuario |
| DELETE | `/api/users/<id>` | Eliminar usuario |

### Tareas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tasks` | Listar tareas (con filtros) |
| POST | `/api/tasks` | Crear nueva tarea |
| PUT | `/api/tasks/<id>` | Actualizar tarea |
| DELETE | `/api/tasks/<id>` | Eliminar tarea |
| DELETE | `/api/tasks/clear-completed` | Eliminar todas las completadas |

### Ejemplos de uso

**Crear usuario:**
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez","email":"juan@example.com","color":"#ff5733"}'
```

**Crear tarea:**
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Implementar login","description":"Sistema de autenticación","priority":"high","user_id":1}'
```

**Filtrar tareas:**
```bash
# Tareas activas (no completadas)
curl "http://localhost:5000/api/tasks?status=active"

# Tareas de alta prioridad
curl "http://localhost:5000/api/tasks?priority=high"

# Tareas de un usuario específico
curl "http://localhost:5000/api/tasks?user=1"

# Buscar tareas
curl "http://localhost:5000/api/tasks?search=login"
```

## Despliegue en Producción

### AWS EC2 con Ubuntu 26.04

Ver guía completa de despliegue: **[DEPLOY.md](DEPLOY.md)**

Resumen:
1. Crear instancia EC2 con Ubuntu 26.04
2. Configurar Security Groups (SSH, HTTP, HTTPS)
3. Instalar Python, Nginx, Supervisor
4. Transferir código con `scp` o `git`
5. Configurar Gunicorn con Supervisor
6. Configurar Nginx como proxy reverso
7. (Opcional) Configurar HTTPS con Let's Encrypt

**Ver logs en producción:**
```bash
# Logs de eventos
tail -f /home/ubuntu/app_python/logs/events.log

# Logs de errores
tail -f /home/ubuntu/app_python/logs/error.log

# Todo
tail -f /home/ubuntu/app_python/logs/app.log
```

## Documentación Adicional

- **[DEPLOY.md](DEPLOY.md)** - Guía completa de despliegue en AWS EC2
- **[LOGGING.md](LOGGING.md)** - Documentación del sistema de logging

## Tecnologías

- **Backend:** Flask 3.0+
- **Base de datos:** SQLAlchemy (SQLite para desarrollo, PostgreSQL recomendado para producción)
- **Servidor:** Gunicorn (producción)
- **Proxy:** Nginx
- **Process Manager:** Supervisor
- **Logging:** Python logging con rotación automática

## Eventos Registrados

El sistema registra automáticamente:

| Evento | Descripción |
|--------|-------------|
| `USER_CREATED` | Nuevo usuario registrado |
| `USER_UPDATED` | Usuario actualizado (con cambios detallados) |
| `USER_DELETED` | Usuario eliminado |
| `TASK_CREATED` | Nueva tarea creada |
| `TASK_UPDATED` | Tarea actualizada (con cambios detallados) |
| `TASK_COMPLETED` | Tarea marcada como completada |
| `TASK_DELETED` | Tarea eliminada |
| `TASKS_CLEARED` | Limpieza masiva de tareas completadas |

## Desarrollo

### Añadir nuevos logs

```python
# Log simple
logger.info('Mensaje informativo')
logger.error('Error')

# Log de evento de negocio
from logger_config import log_event

log_event(logger, 'MI_EVENTO', 'Descripción', 
          campo1='valor1', campo2='valor2')
```

### Estructura de la base de datos

**Tabla User:**
- id (Integer, PK)
- name (String)
- email (String, unique)
- color (String, hex color)
- created_at (DateTime)

**Tabla Task:**
- id (Integer, PK)
- title (String)
- description (Text)
- completed (Boolean)
- priority (String: low/medium/high)
- user_id (Integer, FK a User)
- created_at (DateTime)
- updated_at (DateTime)

## Licencia

MIT

## Autor

Andrés C.

---

**¿Preguntas?**

- Ver [DEPLOY.md](DEPLOY.md) para despliegue
- Ver [LOGGING.md](LOGGING.md) para logging
- Revisar logs con `python view_logs.py events`

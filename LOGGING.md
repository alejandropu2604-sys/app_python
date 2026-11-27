# Sistema de Logging

La aplicación utiliza un sistema de logging avanzado con múltiples archivos separados por tipo de información.

## Archivos de Log

Todos los logs se guardan en la carpeta `logs/`:

### 1. `events.log` - Eventos de Negocio
Registra todas las acciones importantes de los usuarios:
- ✅ Creación de usuarios
- ✅ Actualización de usuarios
- ✅ Eliminación de usuarios
- ✅ Creación de tareas
- ✅ Actualización de tareas
- ✅ Completar tareas
- ✅ Eliminación de tareas
- ✅ Limpiar tareas completadas

**Formato:**
```
[2024-01-15 10:30:45] [USER_CREATED] Nuevo usuario creado | user_id=1 | name=Juan Pérez | email=juan@example.com
[2024-01-15 10:31:20] [TASK_CREATED] Nueva tarea creada | task_id=1 | title=Implementar login | priority=high | user_id=1
[2024-01-15 11:15:30] [TASK_COMPLETED] Tarea completada | task_id=1 | title=Implementar login
```

### 2. `error.log` - Errores y Excepciones
Solo contiene errores, excepciones y problemas críticos:
- ❌ Excepciones no controladas
- ❌ Errores de base de datos
- ❌ Errores 500
- ❌ Stack traces completos

**Formato:**
```
[2024-01-15 10:45:12] ERROR in app (handle_exception:95): Excepción no manejada: division by zero
Traceback (most recent call last):
  File "app.py", line 93, in some_function
    result = 10 / 0
ZeroDivisionError: division by zero
```

### 3. `app.log` - Log Completo
Contiene **todo**: debug, info, warnings y errors:
- 🔍 Consultas a la base de datos
- 🔍 Peticiones HTTP (método, path, IP, status)
- 🔍 Validaciones
- 🔍 Intentos fallidos (emails duplicados, etc.)
- ⚠️ Warnings
- ❌ Errores

**Formato:**
```
[2024-01-15 10:30:45] INFO in app (setup_logging:65): Aplicación iniciada
[2024-01-15 10:30:46] DEBUG in app (before_request_logging:85): GET /api/users | IP: 192.168.1.100
[2024-01-15 10:30:46] DEBUG in app (get_users:120): Consulta de usuarios: 5 encontrados
[2024-01-15 10:30:46] DEBUG in app (after_request_logging:90): GET /api/users | IP: 192.168.1.100 | Status: 200
```

## Rotación Automática

Los logs rotan automáticamente:
- **Tamaño máximo por archivo:** 10 MB
- **Archivos de respaldo:** 10 (conserva 100 MB de historial)
- **Formato de backups:** `events.log.1`, `events.log.2`, etc.

## Uso

### Ver logs desde la terminal

```bash
# Ver eventos de negocio (últimas 50 líneas)
python view_logs.py events

# Ver solo errores
python view_logs.py errors

# Ver todo (últimas 100 líneas)
python view_logs.py all --tail 100

# Seguir eventos en tiempo real (como tail -f)
python view_logs.py events --follow

# Ver estadísticas
python view_logs.py stats
```

### Ver logs en producción (EC2)

```bash
# Eventos de negocio
sudo tail -f /var/log/flask-app/events.log

# Errores
sudo tail -f /var/log/flask-app/error.log

# Todo
sudo tail -f /var/log/flask-app/app.log

# Buscar eventos específicos
grep "USER_CREATED" /var/log/flask-app/events.log
grep "TASK_COMPLETED" /var/log/flask-app/events.log | wc -l  # Contar tareas completadas
```

## Tipos de Eventos

| Código | Descripción |
|--------|-------------|
| `USER_CREATED` | Nuevo usuario registrado |
| `USER_UPDATED` | Usuario actualizado (con detalles de cambios) |
| `USER_DELETED` | Usuario eliminado |
| `TASK_CREATED` | Nueva tarea creada |
| `TASK_UPDATED` | Tarea actualizada (con detalles de cambios) |
| `TASK_COMPLETED` | Tarea marcada como completada |
| `TASK_DELETED` | Tarea eliminada |
| `TASKS_CLEARED` | Tareas completadas limpiadas en lote |

## Logging en Código

Si necesitas añadir más logs personalizados:

```python
# Log simple
logger.info('Mensaje informativo')
logger.warning('Advertencia')
logger.error('Error')
logger.debug('Información de depuración')

# Log de evento de negocio (aparece en events.log)
from logger_config import log_event

log_event(logger, 'MI_EVENTO', 'Descripción del evento', 
          dato1='valor1', dato2='valor2')

# Log de petición HTTP
from logger_config import log_request

log_request(logger, request, response_status=200)
```

## Monitoreo y Análisis

### Encontrar problemas comunes

```bash
# Emails duplicados intentados
grep "email duplicado" logs/app.log

# Intentos de acceso a recursos inexistentes
grep "no encontrado" logs/app.log

# Tareas completadas hoy
grep "TASK_COMPLETED" logs/events.log | grep "2024-01-15"

# Errores de los últimos 100 registros
tail -100 logs/error.log
```

### Estadísticas rápidas

```bash
# Total de usuarios creados
grep "USER_CREATED" logs/events.log | wc -l

# Total de tareas completadas
grep "TASK_COMPLETED" logs/events.log | wc -l

# Usuarios más activos
grep "TASK_CREATED" logs/events.log | grep -o "user_id=[0-9]*" | sort | uniq -c | sort -rn
```

## Configuración en Producción

En el servidor EC2, los logs de Supervisor estarán en:
- `/var/log/flask-app/flask-app.out.log` - stdout de la aplicación
- `/var/log/flask-app/flask-app.err.log` - stderr de la aplicación

Pero los logs **estructurados** de la aplicación estarán en:
- `/home/ubuntu/app_python/logs/events.log`
- `/home/ubuntu/app_python/logs/error.log`
- `/home/ubuntu/app_python/logs/app.log`

Para centralizar todos los logs en `/var/log/flask-app/`, modifica `logger_config.py`:

```python
# En lugar de:
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')

# Usa:
log_dir = '/var/log/flask-app' if os.path.exists('/var/log/flask-app') else \
          os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
```

## Privacidad y Seguridad

⚠️ **Importante:** Los logs pueden contener información sensible:
- Emails de usuarios
- IPs de clientes
- Descripciones de tareas

**Recomendaciones:**
1. No commitear logs al repositorio (ya incluido en `.gitignore`)
2. Rotar logs regularmente en producción
3. Proteger acceso a archivos de log (solo root/ubuntu)
4. Considerar ofuscar emails en logs de producción si es necesario

## Integración con Herramientas de Monitoreo

Los logs pueden integrarse con:
- **CloudWatch Logs** (AWS)
- **Loggly**
- **Datadog**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**

Ejemplo para CloudWatch (instalar CloudWatch Agent en EC2):
```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/path/to/cloudwatch-config.json
```

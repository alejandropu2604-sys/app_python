"""
Configuración de logging para la aplicación Flask.
Crea logs separados para eventos, errores y debug.
"""
import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logging(app):
    """
    Configura múltiples handlers de logging para la aplicación.
    
    - events.log: Eventos de negocio (crear usuario, tarea, etc.)
    - error.log: Solo errores y excepciones
    - app.log: Todo (debug, info, warning, error)
    """
    
    # Crear directorio de logs si no existe
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Formato detallado para los logs
    detailed_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s (%(funcName)s:%(lineno)d): %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Formato simple para eventos de negocio
    event_formatter = logging.Formatter(
        '[%(asctime)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 1. Handler para EVENTOS DE NEGOCIO
    event_handler = RotatingFileHandler(
        os.path.join(log_dir, 'events.log'),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    event_handler.setLevel(logging.INFO)
    event_handler.setFormatter(event_formatter)
    event_handler.addFilter(EventFilter())  # Solo logs marcados como 'event'
    
    # 2. Handler para ERRORES
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    
    # 3. Handler para LOG COMPLETO (debug, info, warning, error)
    app_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    app_handler.setLevel(logging.DEBUG)
    app_handler.setFormatter(detailed_formatter)
    
    # 4. Handler para CONSOLA (solo warning y superiores)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(detailed_formatter)
    
    # Configurar el logger de Flask
    app.logger.setLevel(logging.DEBUG)
    
    # Limpiar handlers existentes
    app.logger.handlers.clear()
    
    # Añadir todos los handlers
    app.logger.addHandler(event_handler)
    app.logger.addHandler(error_handler)
    app.logger.addHandler(app_handler)
    app.logger.addHandler(console_handler)
    
    # Evitar propagación a loggers padres
    app.logger.propagate = False
    
    # Log inicial
    app.logger.info('=' * 80)
    app.logger.info('Aplicación iniciada')
    app.logger.info('=' * 80)
    
    return app.logger


class EventFilter(logging.Filter):
    """
    Filtro personalizado que solo deja pasar logs marcados como 'event'.
    Uso: app.logger.info('Mensaje', extra={'event': True})
    """
    def filter(self, record):
        return hasattr(record, 'event') and record.event


def log_event(logger, event_type, description, **kwargs):
    """
    Helper para registrar eventos de negocio de forma consistente.
    
    Args:
        logger: El logger de Flask
        event_type: Tipo de evento (USER_CREATED, TASK_COMPLETED, etc.)
        description: Descripción del evento
        **kwargs: Datos adicionales (user_id, task_id, etc.)
    
    Ejemplo:
        log_event(app.logger, 'USER_CREATED', 'Nuevo usuario registrado', 
                  user_id=1, name='Juan', email='juan@example.com')
    """
    # Construir mensaje
    extra_data = ' | '.join([f'{k}={v}' for k, v in kwargs.items()])
    message = f"[{event_type}] {description}"
    if extra_data:
        message += f" | {extra_data}"
    
    # Registrar como evento
    logger.info(message, extra={'event': True})


def log_request(logger, request, response_status=None):
    """
    Registra información de la petición HTTP.
    
    Args:
        logger: El logger de Flask
        request: Objeto request de Flask
        response_status: Código de respuesta HTTP (opcional)
    """
    remote_addr = request.headers.get('X-Forwarded-For', request.remote_addr)
    message = f"{request.method} {request.path} | IP: {remote_addr}"
    
    if response_status:
        message += f" | Status: {response_status}"
    
    if request.args:
        message += f" | Query: {dict(request.args)}"
    
    logger.debug(message)

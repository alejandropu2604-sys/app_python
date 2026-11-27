from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from logger_config import setup_logging, log_event, log_request

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Configurar sistema de logging
logger = setup_logging(app)


# ─── Modelos ──────────────────────────────────────────────────────────────────

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    color = db.Column(db.String(7), default='#6366f1')   # hex color para el avatar
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tasks = db.relationship('Task', backref='assignee', lazy=True)

    def to_dict(self):
        pending = sum(1 for t in self.tasks if not t.completed)
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'color': self.color,
            'task_count': len(self.tasks),
            'pending_count': pending,
            'created_at': self.created_at.strftime('%d/%m/%Y'),
        }


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(10), default='medium')   # low | medium | high
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'priority': self.priority,
            'user_id': self.user_id,
            'user_name': self.assignee.name if self.assignee else None,
            'user_color': self.assignee.color if self.assignee else None,
            'created_at': self.created_at.strftime('%d/%m/%Y %H:%M'),
            'updated_at': self.updated_at.strftime('%d/%m/%Y %H:%M'),
        }


with app.app_context():
    db.create_all()
    logger.info('Base de datos inicializada correctamente')


# ─── Middleware de logging ────────────────────────────────────────────────────

@app.before_request
def before_request_logging():
    """Registra cada petición HTTP"""
    log_request(logger, request)


@app.after_request
def after_request_logging(response):
    """Registra la respuesta de cada petición"""
    log_request(logger, request, response.status_code)
    return response


@app.errorhandler(Exception)
def handle_exception(e):
    """Captura todas las excepciones no manejadas"""
    logger.error(f'Excepción no manejada: {str(e)}', exc_info=True)
    return jsonify({'error': 'Error interno del servidor'}), 500


# ─── Vistas ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


# ─── API Usuarios ─────────────────────────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.order_by(User.name).all()
    logger.debug(f'Consulta de usuarios: {len(users)} encontrados')
    return jsonify([u.to_dict() for u in users])


@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()

    if not name:
        logger.warning(f'Intento de crear usuario sin nombre | IP: {request.remote_addr}')
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    if not email:
        logger.warning(f'Intento de crear usuario sin email | IP: {request.remote_addr}')
        return jsonify({'error': 'El email es obligatorio'}), 400
    if User.query.filter_by(email=email).first():
        logger.warning(f'Intento de crear usuario con email duplicado: {email}')
        return jsonify({'error': 'Ya existe un usuario con ese email'}), 409

    user = User(
        name=name,
        email=email,
        color=data.get('color', '#6366f1'),
    )
    db.session.add(user)
    db.session.commit()
    
    # Log de evento de negocio
    log_event(logger, 'USER_CREATED', 'Nuevo usuario creado', 
              user_id=user.id, name=user.name, email=user.email)
    
    return jsonify(user.to_dict()), 201


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        logger.warning(f'Intento de actualizar usuario inexistente: {user_id}')
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data = request.get_json()
    changes = []

    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'El nombre es obligatorio'}), 400
        if user.name != name:
            changes.append(f'name: {user.name} -> {name}')
        user.name = name

    if 'email' in data:
        email = data['email'].strip().lower()
        if not email:
            return jsonify({'error': 'El email es obligatorio'}), 400
        conflict = User.query.filter_by(email=email).first()
        if conflict and conflict.id != user_id:
            logger.warning(f'Intento de cambiar email a uno duplicado: {email}')
            return jsonify({'error': 'Ya existe un usuario con ese email'}), 409
        if user.email != email:
            changes.append(f'email: {user.email} -> {email}')
        user.email = email

    if 'color' in data:
        if user.color != data['color']:
            changes.append(f'color: {user.color} -> {data["color"]}')
        user.color = data['color']

    db.session.commit()
    
    # Log de evento
    if changes:
        log_event(logger, 'USER_UPDATED', 'Usuario actualizado', 
                  user_id=user_id, changes=', '.join(changes))
    
    return jsonify(user.to_dict())


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        logger.warning(f'Intento de eliminar usuario inexistente: {user_id}')
        return jsonify({'error': 'Usuario no encontrado'}), 404

    # Desasignar sus tareas en lugar de borrarlas
    task_count = len(user.tasks)
    for task in user.tasks:
        task.user_id = None

    user_name = user.name
    user_email = user.email
    
    db.session.delete(user)
    db.session.commit()
    
    # Log de evento
    log_event(logger, 'USER_DELETED', 'Usuario eliminado', 
              user_id=user_id, name=user_name, email=user_email, 
              unassigned_tasks=task_count)
    
    return jsonify({'message': 'Usuario eliminado'})


# ─── API Tareas ───────────────────────────────────────────────────────────────

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    filter_status   = request.args.get('status', 'all')
    filter_priority = request.args.get('priority', 'all')
    filter_user     = request.args.get('user', 'all')
    search          = request.args.get('search', '').strip()

    query = Task.query

    if filter_status == 'active':
        query = query.filter_by(completed=False)
    elif filter_status == 'completed':
        query = query.filter_by(completed=True)

    if filter_priority != 'all':
        query = query.filter_by(priority=filter_priority)

    if filter_user == 'unassigned':
        query = query.filter(Task.user_id.is_(None))
    elif filter_user != 'all':
        try:
            query = query.filter_by(user_id=int(filter_user))
        except ValueError:
            pass

    if search:
        query = query.filter(Task.title.ilike(f'%{search}%'))

    tasks = query.order_by(Task.created_at.desc()).all()
    
    logger.debug(f'Consulta de tareas: {len(tasks)} encontradas | Filtros: status={filter_status}, priority={filter_priority}, user={filter_user}, search={search}')
    
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        logger.warning(f'Intento de crear tarea sin título | IP: {request.remote_addr}')
        return jsonify({'error': 'El título es obligatorio'}), 400

    user_id = data.get('user_id') or None
    if user_id and not db.session.get(User, user_id):
        logger.warning(f'Intento de asignar tarea a usuario inexistente: {user_id}')
        return jsonify({'error': 'Usuario no encontrado'}), 404

    task = Task(
        title=title,
        description=(data.get('description') or '').strip(),
        priority=data.get('priority', 'medium'),
        user_id=user_id,
    )
    db.session.add(task)
    db.session.commit()
    
    # Log de evento
    log_event(logger, 'TASK_CREATED', 'Nueva tarea creada', 
              task_id=task.id, title=task.title, priority=task.priority, 
              user_id=user_id if user_id else 'sin asignar')
    
    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        logger.warning(f'Intento de actualizar tarea inexistente: {task_id}')
        return jsonify({'error': 'Tarea no encontrada'}), 404

    data = request.get_json()
    changes = []

    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return jsonify({'error': 'El título es obligatorio'}), 400
        if task.title != title:
            changes.append(f'title: "{task.title}" -> "{title}"')
        task.title = title

    if 'description' in data:
        new_desc = data['description'].strip()
        if task.description != new_desc:
            changes.append('description: modificada')
        task.description = new_desc

    if 'completed' in data:
        new_completed = bool(data['completed'])
        if task.completed != new_completed:
            changes.append(f'completed: {task.completed} -> {new_completed}')
            # Log especial para completar tareas
            if new_completed:
                log_event(logger, 'TASK_COMPLETED', 'Tarea completada', 
                          task_id=task_id, title=task.title)
        task.completed = new_completed

    if 'priority' in data:
        if task.priority != data['priority']:
            changes.append(f'priority: {task.priority} -> {data["priority"]}')
        task.priority = data['priority']

    if 'user_id' in data:
        uid = data['user_id']
        if uid is not None and not db.session.get(User, uid):
            logger.warning(f'Intento de asignar tarea a usuario inexistente: {uid}')
            return jsonify({'error': 'Usuario no encontrado'}), 404
        if task.user_id != uid:
            old_user = task.user_id if task.user_id else 'sin asignar'
            new_user = uid if uid else 'sin asignar'
            changes.append(f'user_id: {old_user} -> {new_user}')
        task.user_id = uid

    task.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Log de evento
    if changes:
        log_event(logger, 'TASK_UPDATED', 'Tarea actualizada', 
                  task_id=task_id, changes=', '.join(changes))
    
    return jsonify(task.to_dict())


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        logger.warning(f'Intento de eliminar tarea inexistente: {task_id}')
        return jsonify({'error': 'Tarea no encontrada'}), 404

    task_title = task.title
    was_completed = task.completed
    
    db.session.delete(task)
    db.session.commit()
    
    # Log de evento
    log_event(logger, 'TASK_DELETED', 'Tarea eliminada', 
              task_id=task_id, title=task_title, completed=was_completed)
    
    return jsonify({'message': 'Tarea eliminada'})


@app.route('/api/tasks/clear-completed', methods=['DELETE'])
def clear_completed():
    completed_tasks = Task.query.filter_by(completed=True).all()
    count = len(completed_tasks)
    
    Task.query.filter_by(completed=True).delete()
    db.session.commit()
    
    # Log de evento
    log_event(logger, 'TASKS_CLEARED', 'Tareas completadas eliminadas', count=count)
    
    return jsonify({'message': 'Tareas completadas eliminadas'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)

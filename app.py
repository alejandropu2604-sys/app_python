from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    completed = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(10), default='medium')  # low, medium, high
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'priority': self.priority,
            'created_at': self.created_at.strftime('%d/%m/%Y %H:%M'),
            'updated_at': self.updated_at.strftime('%d/%m/%Y %H:%M'),
        }


with app.app_context():
    db.create_all()


@app.route('/')
def index():
    return render_template('index.html')


# --- API REST ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    filter_status = request.args.get('status', 'all')      # all | active | completed
    filter_priority = request.args.get('priority', 'all')  # all | low | medium | high
    search = request.args.get('search', '').strip()

    query = Task.query

    if filter_status == 'active':
        query = query.filter_by(completed=False)
    elif filter_status == 'completed':
        query = query.filter_by(completed=True)

    if filter_priority != 'all':
        query = query.filter_by(priority=filter_priority)

    if search:
        query = query.filter(Task.title.ilike(f'%{search}%'))

    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'El título es obligatorio'}), 400

    task = Task(
        title=title,
        description=(data.get('description') or '').strip(),
        priority=data.get('priority', 'medium'),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({'error': 'Tarea no encontrada'}), 404

    data = request.get_json()

    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return jsonify({'error': 'El título es obligatorio'}), 400
        task.title = title

    if 'description' in data:
        task.description = data['description'].strip()

    if 'completed' in data:
        task.completed = bool(data['completed'])

    if 'priority' in data:
        task.priority = data['priority']

    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(task.to_dict())


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({'error': 'Tarea no encontrada'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Tarea eliminada'})


@app.route('/api/tasks/clear-completed', methods=['DELETE'])
def clear_completed():
    Task.query.filter_by(completed=True).delete()
    db.session.commit()
    return jsonify({'message': 'Tareas completadas eliminadas'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)

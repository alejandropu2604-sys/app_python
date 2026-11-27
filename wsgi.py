"""
WSGI entry point para Gunicorn.
Uso: gunicorn --workers 3 --bind 0.0.0.0:8000 wsgi:app
"""
from app import app

if __name__ == "__main__":
    app.run()

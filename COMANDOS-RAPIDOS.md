# ⚡ Comandos Rápidos

Referencia rápida de todos los comandos útiles para desarrollo y producción.

---

## 🏃‍♂️ Desarrollo Local

### Instalación Inicial

```bash
# Crear entorno virtual
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Ejecutar Aplicación

```bash
# Modo desarrollo (con auto-reload)
python app.py

# Modo producción local (con Gunicorn)
gunicorn --workers 3 --bind 0.0.0.0:8000 wsgi:app
```

### Ver Logs

```bash
# Eventos de negocio
python view_logs.py events

# Solo errores
python view_logs.py errors

# Todo (debug incluido)
python view_logs.py all

# Tiempo real (seguir)
python view_logs.py events --follow

# Últimas N líneas
python view_logs.py events --tail 100

# Estadísticas
python view_logs.py stats
```

### Probar el Sistema

```bash
# Ejecutar simulador de actividad
powershell -ExecutionPolicy Bypass -File test_logs.ps1
```

---

## 🌐 API - Ejemplos con curl

### Usuarios

```bash
# Listar todos
curl http://localhost:5000/api/users

# Crear usuario
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez","email":"juan@test.com","color":"#ff5733"}'

# Actualizar usuario
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez Actualizado","color":"#00ff00"}'

# Eliminar usuario
curl -X DELETE http://localhost:5000/api/users/1
```

### Tareas

```bash
# Listar todas
curl http://localhost:5000/api/tasks

# Filtrar por estado
curl "http://localhost:5000/api/tasks?status=active"
curl "http://localhost:5000/api/tasks?status=completed"

# Filtrar por prioridad
curl "http://localhost:5000/api/tasks?priority=high"

# Filtrar por usuario
curl "http://localhost:5000/api/tasks?user=1"

# Buscar
curl "http://localhost:5000/api/tasks?search=login"

# Crear tarea
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi tarea","description":"Descripción","priority":"high","user_id":1}'

# Actualizar tarea
curl -X PUT http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Tarea actualizada","completed":true}'

# Eliminar tarea
curl -X DELETE http://localhost:5000/api/tasks/1

# Limpiar completadas
curl -X DELETE http://localhost:5000/api/tasks/clear-completed
```

---

## 🔍 Búsqueda en Logs (Desarrollo - Windows)

### PowerShell

```powershell
# Buscar eventos de usuarios
Select-String -Path "logs\events.log" -Pattern "USER_"

# Buscar eventos de tareas
Select-String -Path "logs\events.log" -Pattern "TASK_"

# Contar usuarios creados
(Select-String -Path "logs\events.log" -Pattern "USER_CREATED").Count

# Contar tareas completadas
(Select-String -Path "logs\events.log" -Pattern "TASK_COMPLETED").Count

# Ver últimos 20 errores
Get-Content logs\error.log -Tail 20

# Ver eventos de hoy
Get-Content logs\events.log | Select-String (Get-Date -Format "yyyy-MM-dd")

# Buscar por user_id
Select-String -Path "logs\events.log" -Pattern "user_id=1"

# Buscar por task_id
Select-String -Path "logs\events.log" -Pattern "task_id=5"
```

---

## 🔍 Búsqueda en Logs (Producción - Linux)

### Bash

```bash
# Ver eventos en tiempo real
tail -f /home/ubuntu/app_python/logs/events.log

# Ver últimos 50 eventos
tail -50 /home/ubuntu/app_python/logs/events.log

# Buscar usuarios creados
grep "USER_CREATED" /home/ubuntu/app_python/logs/events.log

# Contar tareas completadas
grep "TASK_COMPLETED" /home/ubuntu/app_python/logs/events.log | wc -l

# Ver actividad de hoy
grep "$(date +%Y-%m-%d)" /home/ubuntu/app_python/logs/events.log

# Ver actividad de un usuario
grep "user_id=1" /home/ubuntu/app_python/logs/events.log

# Ver cambios en una tarea
grep "task_id=5" /home/ubuntu/app_python/logs/events.log | grep "TASK_"

# Ver intentos fallidos
grep -i "no encontrado\|duplicado" /home/ubuntu/app_python/logs/app.log

# Ver últimos errores
tail -50 /home/ubuntu/app_python/logs/error.log
```

---

## 🚀 Producción (AWS EC2)

### Conexión SSH

```bash
# Dar permisos a clave (solo primera vez)
chmod 400 tu-clave.pem

# Conectar
ssh -i tu-clave.pem ubuntu@<IP-EC2>
```

### Transferir Archivos

```bash
# Copiar archivo individual
scp -i tu-clave.pem app.py ubuntu@<IP-EC2>:/home/ubuntu/app_python/

# Copiar toda la carpeta
scp -i tu-clave.pem -r c:\Users\andresc\app_python ubuntu@<IP-EC2>:/home/ubuntu/
```

### Gestión de Servicios

```bash
# Ver estado
sudo supervisorctl status flask-app
sudo systemctl status nginx

# Reiniciar aplicación
sudo supervisorctl restart flask-app

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar ambos
sudo supervisorctl restart flask-app && sudo systemctl restart nginx

# Ver logs de Supervisor
sudo supervisorctl tail flask-app
sudo supervisorctl tail -f flask-app  # Seguir

# Ver logs de Nginx
sudo tail -f /var/log/nginx/flask-app-access.log
sudo tail -f /var/log/nginx/flask-app-error.log
```

### Actualizar Código

```bash
# Si usas Git
cd /home/ubuntu/app_python
git pull origin main
sudo supervisorctl restart flask-app

# Si usas SCP (desde local)
scp -i tu-clave.pem app.py ubuntu@<IP-EC2>:/home/ubuntu/app_python/
ssh -i tu-clave.pem ubuntu@<IP-EC2> "sudo supervisorctl restart flask-app"
```

### Ver Logs de la Aplicación

```bash
# Eventos de negocio (tiempo real)
tail -f /home/ubuntu/app_python/logs/events.log

# Errores
tail -f /home/ubuntu/app_python/logs/error.log

# Todo
tail -f /home/ubuntu/app_python/logs/app.log

# Con view_logs.py
cd /home/ubuntu/app_python
python3 view_logs.py events --follow
```

### Monitoreo

```bash
# Uso de recursos
htop

# Espacio en disco
df -h

# Uso de memoria
free -h

# Procesos Python
ps aux | grep python

# Puertos en uso
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :80

# Últimas peticiones HTTP
tail -20 /var/log/nginx/flask-app-access.log

# Peticiones por minuto (últimos 5 minutos)
tail -300 /var/log/nginx/flask-app-access.log | grep "$(date +%d/%b/%Y:%H:%M)" | wc -l
```

---

## 🗄️ Base de Datos

### SQLite (Desarrollo)

```bash
# Abrir base de datos
sqlite3 todo.db

# Comandos útiles en SQLite
.tables                    # Ver tablas
.schema user              # Ver estructura de tabla
SELECT * FROM user;       # Ver usuarios
SELECT * FROM task;       # Ver tareas
.exit                     # Salir
```

### Backup

```bash
# Hacer backup
cp todo.db todo.db.backup

# Restaurar backup
cp todo.db.backup todo.db

# Backup en producción
scp -i tu-clave.pem ubuntu@<IP-EC2>:/home/ubuntu/app_python/todo.db ./backup-$(date +%Y%m%d).db
```

---

## 🐛 Troubleshooting

### La aplicación no inicia

```bash
# Ver errores en detalle
python app.py

# Verificar dependencias
pip list

# Verificar sintaxis
python -m py_compile app.py

# Ver logs de error
cat logs/error.log
```

### Puertos ocupados

```bash
# Ver qué está usando el puerto 5000
netstat -ano | findstr :5000     # Windows
lsof -i :5000                    # Linux/Mac

# Matar proceso
taskkill /PID <PID> /F           # Windows
kill -9 <PID>                    # Linux/Mac
```

### Permisos (Producción)

```bash
# Dar permisos correctos
sudo chown -R ubuntu:ubuntu /home/ubuntu/app_python
sudo chmod -R 755 /home/ubuntu/app_python

# Verificar permisos de logs
ls -la /home/ubuntu/app_python/logs/
sudo chown -R ubuntu:ubuntu /home/ubuntu/app_python/logs/
```

### Logs no se generan

```bash
# Verificar que el directorio existe
ls -la logs/

# Crear manualmente si no existe
mkdir -p logs

# Verificar permisos de escritura
touch logs/test.txt
rm logs/test.txt
```

---

## 🔧 Git

```bash
# Inicializar repo
git init
git add .
git commit -m "Initial commit con sistema de logging"

# Conectar a GitHub
git remote add origin https://github.com/tu-usuario/app_python.git
git push -u origin main

# Ver cambios
git status
git diff

# Commit de cambios
git add .
git commit -m "Descripción del cambio"
git push

# Ver historial
git log --oneline
```

---

## 📊 Estadísticas y Analytics

### Eventos más comunes

```bash
# Top 10 eventos (Linux)
cut -d']' -f3 logs/events.log | sort | uniq -c | sort -rn | head -10

# Usuarios más activos (Linux)
grep -o "user_id=[0-9]*" logs/events.log | sort | uniq -c | sort -rn | head -10
```

### Actividad por hora

```bash
# Eventos por hora hoy (Linux)
grep "$(date +%Y-%m-%d)" logs/events.log | cut -d' ' -f2 | cut -d':' -f1 | sort | uniq -c
```

### Tareas completadas por usuario

```bash
# Linux
grep "TASK_COMPLETED" logs/events.log | grep -o "user_id=[0-9]*" | sort | uniq -c | sort -rn
```

---

## 🎨 Tips Útiles

### Alias útiles (añadir a .bashrc o .zshrc)

```bash
# Logs
alias logs-events='tail -f ~/app_python/logs/events.log'
alias logs-errors='tail -f ~/app_python/logs/error.log'
alias logs-app='tail -f ~/app_python/logs/app.log'

# App
alias app-restart='sudo supervisorctl restart flask-app'
alias app-status='sudo supervisorctl status flask-app'
alias app-logs='sudo supervisorctl tail -f flask-app'

# Nginx
alias nginx-reload='sudo systemctl reload nginx'
alias nginx-restart='sudo systemctl restart nginx'
alias nginx-logs='tail -f /var/log/nginx/flask-app-access.log'
```

### Variables de entorno útiles

```bash
# En .bashrc o .env
export FLASK_APP=app.py
export FLASK_ENV=development
export PYTHONUNBUFFERED=1
```

---

## 📚 Documentación

- [README.md](README.md) - Descripción general
- [DEPLOY.md](DEPLOY.md) - Guía de despliegue completa
- [LOGGING.md](LOGGING.md) - Sistema de logging
- [QUICKSTART-LOGS.md](QUICKSTART-LOGS.md) - Inicio rápido
- [CHANGELOG.md](CHANGELOG.md) - Historial de cambios

---

**💡 Tip:** Guarda este archivo como favorito para acceso rápido a comandos comunes.

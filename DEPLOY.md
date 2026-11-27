# Guía de Despliegue en AWS EC2 (Ubuntu 26.04)

## Preparación Local

### 1. Verificar que todo funciona localmente

```bash
# Activar entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Probar la aplicación
python app.py
```

Accede a `http://localhost:5000` y verifica que funciona.

---

## Configuración en AWS

### 2. Crear instancia EC2

1. **Acceder a AWS Console** → EC2 → Launch Instance
2. **Configuración:**
   - **Nombre:** `flask-todo-app` (o el que prefieras)
   - **AMI:** Ubuntu Server 26.04 LTS
   - **Tipo de instancia:** `t2.micro` (gratis en free tier) o `t2.small`
   - **Key pair:** Crear nueva o usar existente (descarga el `.pem`)
   - **Security Group:**
     - SSH (22) desde "Mi IP"
     - HTTP (80) desde "Anywhere" (0.0.0.0/0)
     - HTTPS (443) desde "Anywhere" (0.0.0.0/0) - opcional
3. **Storage:** 8-10 GB es suficiente
4. **Launch Instance**

### 3. Configurar Security Group

Ir a **Security Groups** y verificar reglas:

| Type  | Protocol | Port | Source    | Description |
|-------|----------|------|-----------|-------------|
| SSH   | TCP      | 22   | Mi IP     | SSH access  |
| HTTP  | TCP      | 80   | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP      | 443  | 0.0.0.0/0 | SSL traffic |

---

## Despliegue

### 4. Conectar por SSH

```bash
# Dar permisos a la clave (solo la primera vez)
chmod 400 tu-clave.pem

# Conectar
ssh -i tu-clave.pem ubuntu@<IP-PUBLICA-EC2>
```

**Obtener IP pública:** AWS Console → EC2 → Instances → Seleccionar tu instancia → "Public IPv4 address"

### 5. Instalar dependencias del sistema

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python y herramientas
sudo apt install -y \
  python3 \
  python3-pip \
  python3-venv \
  nginx \
  supervisor \
  git

# Verificar versiones
python3 --version
nginx -v
```

### 6. Transferir código al servidor

**Opción A: Con SCP (desde tu máquina local - Windows)**

```powershell
# Copiar toda la carpeta
scp -i tu-clave.pem -r c:\Users\andresc\app_python ubuntu@<IP-EC2>:/home/ubuntu/

# O archivos individuales
scp -i tu-clave.pem app.py requirements.txt logger_config.py wsgi.py ubuntu@<IP-EC2>:/home/ubuntu/app_python/
```

**Opción B: Con Git (recomendado)**

```bash
# En el servidor EC2
cd /home/ubuntu
git clone https://github.com/tu-usuario/app_python.git
cd app_python
```

### 7. Configurar aplicación Python

```bash
cd /home/ubuntu/app_python

# Crear entorno virtual
python3 -m venv venv

# Activar entorno
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo wsgi.py si no existe
cat > wsgi.py << 'EOF'
from app import app

if __name__ == "__main__":
    app.run()
EOF

# Crear directorio de logs
mkdir -p logs

# Verificar que funciona
python app.py &
sleep 2
curl http://localhost:5000
kill %1  # Detener el proceso de prueba
```

### 8. Configurar Supervisor

Supervisor mantiene la aplicación corriendo automáticamente.

```bash
sudo nano /etc/supervisor/conf.d/flask-app.conf
```

**Contenido:**

```ini
[program:flask-app]
directory=/home/ubuntu/app_python
command=/home/ubuntu/app_python/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:8000 wsgi:app
user=ubuntu
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/var/log/flask-app/flask-app.err.log
stdout_logfile=/var/log/flask-app/flask-app.out.log
environment=PYTHONUNBUFFERED=1
```

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/flask-app
sudo chown ubuntu:ubuntu /var/log/flask-app

# Recargar y arrancar
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start flask-app

# Verificar estado
sudo supervisorctl status flask-app
```

### 9. Configurar Nginx

Nginx actúa como proxy reverso y sirve la aplicación en el puerto 80.

```bash
sudo nano /etc/nginx/sites-available/flask-app
```

**Contenido:**

```nginx
server {
    listen 80;
    server_name <IP-PUBLICA-EC2>;  # Cambiar por tu IP o dominio

    # Logs de Nginx
    access_log /var/log/nginx/flask-app-access.log;
    error_log /var/log/nginx/flask-app-error.log;

    # Proxy a la aplicación Flask
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Archivos estáticos (si tienes carpeta static/)
    location /static {
        alias /home/ubuntu/app_python/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Desactivar logs para favicon
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        return 204;
    }
}
```

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/flask-app /etc/nginx/sites-enabled/

# Eliminar configuración default
sudo rm /etc/nginx/sites-enabled/default

# Verificar sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Habilitar Nginx en boot
sudo systemctl enable nginx
```

### 10. Verificar despliegue

```bash
# Estado de servicios
sudo supervisorctl status flask-app
sudo systemctl status nginx

# Ver logs de la aplicación
tail -f /var/log/flask-app/flask-app.out.log
tail -f /home/ubuntu/app_python/logs/events.log

# Probar desde el servidor
curl http://localhost

# Ver logs de Nginx
sudo tail -f /var/log/nginx/flask-app-access.log
```

**Desde tu navegador:**  
Abre `http://<IP-PUBLICA-EC2>`

---

## Verificación de Logs

### Logs disponibles

```bash
# Logs de la aplicación (estructurados)
tail -f /home/ubuntu/app_python/logs/events.log   # Eventos de negocio
tail -f /home/ubuntu/app_python/logs/error.log    # Solo errores
tail -f /home/ubuntu/app_python/logs/app.log      # Todo (debug, info, etc)

# Logs de Supervisor (stdout/stderr de Gunicorn)
tail -f /var/log/flask-app/flask-app.out.log
tail -f /var/log/flask-app/flask-app.err.log

# Logs de Nginx
tail -f /var/log/nginx/flask-app-access.log
tail -f /var/log/nginx/flask-app-error.log
```

### Ver eventos en tiempo real

```bash
cd /home/ubuntu/app_python
python3 view_logs.py events --follow
```

---

## Gestión de la Aplicación

### Reiniciar la aplicación

```bash
# Reiniciar app
sudo supervisorctl restart flask-app

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar ambos
sudo supervisorctl restart flask-app && sudo systemctl restart nginx
```

### Actualizar código

```bash
cd /home/ubuntu/app_python

# Si usas Git
git pull origin main

# Si usas SCP, transferir archivos nuevamente desde local
# scp -i tu-clave.pem app.py ubuntu@<IP-EC2>:/home/ubuntu/app_python/

# Reiniciar aplicación
sudo supervisorctl restart flask-app
```

### Ver estado

```bash
# Estado de todos los servicios
sudo supervisorctl status

# Logs en tiempo real
sudo supervisorctl tail -f flask-app

# Estado detallado de Nginx
sudo systemctl status nginx
```

---

## Configuración Adicional (Opcional)

### A. Añadir dominio personalizado

Si tienes un dominio (ej: `miapp.com`):

1. **En tu proveedor de dominio:** Crear registro A apuntando a la IP de tu EC2
2. **En el servidor:**

```bash
sudo nano /etc/nginx/sites-available/flask-app
```

Cambiar `server_name`:
```nginx
server_name miapp.com www.miapp.com;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### B. Configurar HTTPS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL (cambiar por tu dominio)
sudo certbot --nginx -d miapp.com -d www.miapp.com

# Renovación automática (Certbot ya lo configura)
sudo certbot renew --dry-run
```

### C. Configurar base de datos PostgreSQL (para producción)

SQLite no es recomendable para producción. Para usar PostgreSQL:

```bash
# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Crear base de datos
sudo -u postgres psql
CREATE DATABASE todoapp;
CREATE USER todouser WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE todoapp TO todouser;
\q

# Instalar driver Python
source /home/ubuntu/app_python/venv/bin/activate
pip install psycopg2-binary

# Actualizar app.py
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://todouser:password@localhost/todoapp'
```

### D. Variables de entorno

Para configuraciones sensibles, usa un archivo `.env`:

```bash
nano /home/ubuntu/app_python/.env
```

```env
DATABASE_URI=postgresql://todouser:password@localhost/todoapp
SECRET_KEY=tu_clave_secreta_muy_larga
FLASK_ENV=production
```

Instalar `python-dotenv`:
```bash
pip install python-dotenv
```

En `app.py`:
```python
from dotenv import load_dotenv
import os

load_dotenv()

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///todo.db')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
```

---

## Troubleshooting

### La aplicación no inicia

```bash
# Ver logs de errores
sudo supervisorctl tail flask-app stderr

# Ver logs completos
tail -50 /var/log/flask-app/flask-app.err.log
tail -50 /home/ubuntu/app_python/logs/error.log

# Intentar arrancar manualmente para ver errores
cd /home/ubuntu/app_python
source venv/bin/activate
gunicorn --bind 0.0.0.0:8000 wsgi:app
```

### Error 502 Bad Gateway (Nginx)

```bash
# Verificar que Gunicorn está corriendo
sudo supervisorctl status flask-app

# Si no está corriendo, ver por qué
sudo supervisorctl tail flask-app stderr

# Verificar que el puerto 8000 está escuchando
sudo netstat -tlnp | grep 8000
```

### Cambios no se reflejan

```bash
# Reiniciar completamente
sudo supervisorctl restart flask-app
sudo systemctl reload nginx

# Limpiar cache del navegador (Ctrl+Shift+R)
```

### Permisos negados

```bash
# Dar permisos correctos
sudo chown -R ubuntu:ubuntu /home/ubuntu/app_python
sudo chmod -R 755 /home/ubuntu/app_python
```

### Ver todas las peticiones HTTP

```bash
# Nginx access log (todas las peticiones)
tail -f /var/log/nginx/flask-app-access.log

# Logs de la app (peticiones con detalles)
tail -f /home/ubuntu/app_python/logs/app.log | grep "GET\|POST\|PUT\|DELETE"
```

---

## Checklist de Despliegue

- [ ] Instancia EC2 creada con Ubuntu 26.04
- [ ] Security Group configurado (SSH, HTTP, HTTPS)
- [ ] Conexión SSH establecida
- [ ] Python, Nginx, Supervisor instalados
- [ ] Código transferido al servidor
- [ ] Entorno virtual creado y dependencias instaladas
- [ ] Supervisor configurado y aplicación corriendo
- [ ] Nginx configurado como proxy reverso
- [ ] Aplicación accesible desde navegador
- [ ] Logs funcionando correctamente
- [ ] (Opcional) Dominio configurado
- [ ] (Opcional) HTTPS con Let's Encrypt
- [ ] (Opcional) PostgreSQL configurado

---

## Comandos Útiles Rápidos

```bash
# Reiniciar todo
sudo supervisorctl restart flask-app && sudo systemctl reload nginx

# Ver logs en vivo (eventos de negocio)
tail -f ~/app_python/logs/events.log

# Ver todas las peticiones HTTP
tail -f /var/log/nginx/flask-app-access.log

# Estado general
sudo supervisorctl status && sudo systemctl status nginx --no-pager

# Espacio en disco
df -h

# Uso de memoria
free -h

# Procesos Python corriendo
ps aux | grep python
```

---

## Mantenimiento

### Rotación de logs

Los logs de la aplicación rotan automáticamente (10 MB × 10 archivos).

Para Nginx y Supervisor:

```bash
# Configurado automáticamente en Ubuntu con logrotate
cat /etc/logrotate.d/nginx
cat /etc/logrotate.d/supervisor
```

### Backups

Hacer backup de:
- Base de datos: `/home/ubuntu/app_python/todo.db` (SQLite)
- Logs importantes (opcional)
- Configuración de Nginx y Supervisor

```bash
# Backup manual
tar -czf backup-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/app_python/todo.db \
  /home/ubuntu/app_python/logs/ \
  /etc/nginx/sites-available/flask-app \
  /etc/supervisor/conf.d/flask-app.conf
```

### Actualizaciones del sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot  # Si hay actualizaciones del kernel
```

---

## Seguridad

- ✅ No commitear `.env` ni configuraciones con passwords
- ✅ Cambiar contraseñas default de bases de datos
- ✅ Mantener el sistema actualizado
- ✅ Usar HTTPS en producción
- ✅ Limitar acceso SSH solo a tu IP
- ✅ Configurar firewall (UFW)

```bash
# Configurar firewall básico
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

¡Despliegue completado! 🚀

Tu aplicación debería estar corriendo en `http://<IP-EC2>` con logs completos de eventos, errores y peticiones.

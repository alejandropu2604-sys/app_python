# Quick Start - Sistema de Logging

## 🚀 Inicio Rápido (5 minutos)

### 1. Ejecuta la aplicación

```bash
python app.py
```

### 2. Haz algunas peticiones

Abre otra terminal y ejecuta:

```bash
# Crear un usuario
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Juan Pérez\",\"email\":\"juan@test.com\"}"

# Crear una tarea
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Mi primera tarea\",\"priority\":\"high\",\"user_id\":1}"

# Completar la tarea
curl -X PUT http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d "{\"completed\":true}"
```

### 3. Ve los logs en tiempo real

Abre **otra terminal** y ejecuta:

```bash
# Ver eventos de negocio en tiempo real
python view_logs.py events --follow
```

Verás algo como:

```
[2024-01-15 10:30:45] [USER_CREATED] Nuevo usuario creado | user_id=1 | name=Juan Pérez | email=juan@test.com
[2024-01-15 10:31:20] [TASK_CREATED] Nueva tarea creada | task_id=1 | title=Mi primera tarea | priority=high | user_id=1
[2024-01-15 10:32:10] [TASK_COMPLETED] Tarea completada | task_id=1 | title=Mi primera tarea
```

---

## 📊 Ver Logs de Diferentes Tipos

```bash
# Solo eventos de negocio (últimas 50 líneas)
python view_logs.py events

# Solo errores
python view_logs.py errors

# Todo (debug, info, warnings, errors)
python view_logs.py all

# Últimas 100 líneas
python view_logs.py events --tail 100

# Estadísticas
python view_logs.py stats
```

---

## 🔍 Buscar Información Específica

### En desarrollo (Windows)

```powershell
# Buscar eventos de usuarios
Select-String -Path "logs\events.log" -Pattern "USER_"

# Contar tareas completadas
(Select-String -Path "logs\events.log" -Pattern "TASK_COMPLETED").Count

# Ver últimos errores
Get-Content logs\error.log -Tail 20
```

### En desarrollo (Linux/Mac) o en producción

```bash
# Buscar usuarios creados
grep "USER_CREATED" logs/events.log

# Contar tareas completadas
grep "TASK_COMPLETED" logs/events.log | wc -l

# Ver usuarios creados hoy
grep "USER_CREATED" logs/events.log | grep "$(date +%Y-%m-%d)"

# Ver solo los emails de usuarios creados
grep "USER_CREATED" logs/events.log | grep -o "email=[^ ]*"

# Ver tareas de alta prioridad creadas
grep "TASK_CREATED" logs/events.log | grep "priority=high"
```

---

## 🎯 Casos de Uso Comunes

### Ver actividad de un usuario específico

```bash
grep "user_id=1" logs/events.log
```

### Ver qué pasó en un rango de tiempo

```bash
# Entre las 10:00 y 11:00 de hoy
grep "2024-01-15 10:" logs/events.log
grep "2024-01-15 11:" logs/events.log
```

### Encontrar errores específicos

```bash
# Intentos de email duplicado
grep "email duplicado" logs/app.log

# Intentos de acceder a recursos inexistentes
grep "no encontrado" logs/app.log
```

### Auditoría de cambios

```bash
# Ver todos los cambios en un usuario
grep "user_id=1" logs/events.log | grep "USER_"

# Ver qué tareas se actualizaron
grep "TASK_UPDATED" logs/events.log
```

---

## 🔥 Simulador de Actividad

Quieres ver el sistema de logs en acción? Ejecuta este script:

**test_logs.sh** (Linux/Mac) o **test_logs.ps1** (Windows PowerShell):

### Windows (PowerShell)

```powershell
# test_logs.ps1

Write-Host "🧪 Simulando actividad en la aplicación..." -ForegroundColor Green

# Crear usuarios
Write-Host "`n1. Creando usuarios..." -ForegroundColor Cyan
$users = @(
    @{name="Juan Pérez"; email="juan@test.com"},
    @{name="María García"; email="maria@test.com"},
    @{name="Carlos López"; email="carlos@test.com"}
)

foreach ($user in $users) {
    $body = @{name=$user.name; email=$user.email} | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/users" -Method POST -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  ✓ Usuario creado: $($user.name)"
    Start-Sleep -Milliseconds 500
}

# Crear tareas
Write-Host "`n2. Creando tareas..." -ForegroundColor Cyan
$tasks = @(
    @{title="Implementar login"; priority="high"; user_id=1},
    @{title="Diseñar UI"; priority="medium"; user_id=2},
    @{title="Testing"; priority="low"; user_id=3},
    @{title="Documentación"; priority="medium"; user_id=1}
)

foreach ($task in $tasks) {
    $body = $task | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/tasks" -Method POST -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  ✓ Tarea creada: $($task.title)"
    Start-Sleep -Milliseconds 500
}

# Completar algunas tareas
Write-Host "`n3. Completando tareas..." -ForegroundColor Cyan
@(1, 3) | ForEach-Object {
    $body = @{completed=$true} | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:5000/api/tasks/$_" -Method PUT -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  ✓ Tarea #$_ completada"
    Start-Sleep -Milliseconds 500
}

# Intentar crear usuario con email duplicado (generará warning)
Write-Host "`n4. Intentando crear usuario duplicado (generará warning)..." -ForegroundColor Yellow
$body = @{name="Juan Duplicado"; email="juan@test.com"} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:5000/api/users" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop | Out-Null
} catch {
    Write-Host "  ✓ Error capturado correctamente: Email duplicado" -ForegroundColor Yellow
}

Write-Host "`n✅ Simulación completa!" -ForegroundColor Green
Write-Host "`n📋 Ahora ejecuta: python view_logs.py events" -ForegroundColor Magenta
```

### Linux/Mac

```bash
#!/bin/bash
# test_logs.sh

echo "🧪 Simulando actividad en la aplicación..."

# Crear usuarios
echo -e "\n1. Creando usuarios..."
curl -s -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"name":"Juan Pérez","email":"juan@test.com"}' > /dev/null
echo "  ✓ Usuario creado: Juan Pérez"
sleep 0.5

curl -s -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"name":"María García","email":"maria@test.com"}' > /dev/null
echo "  ✓ Usuario creado: María García"
sleep 0.5

curl -s -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"name":"Carlos López","email":"carlos@test.com"}' > /dev/null
echo "  ✓ Usuario creado: Carlos López"
sleep 0.5

# Crear tareas
echo -e "\n2. Creando tareas..."
curl -s -X POST http://localhost:5000/api/tasks -H "Content-Type: application/json" -d '{"title":"Implementar login","priority":"high","user_id":1}' > /dev/null
echo "  ✓ Tarea creada: Implementar login"
sleep 0.5

curl -s -X POST http://localhost:5000/api/tasks -H "Content-Type: application/json" -d '{"title":"Diseñar UI","priority":"medium","user_id":2}' > /dev/null
echo "  ✓ Tarea creada: Diseñar UI"
sleep 0.5

# Completar tareas
echo -e "\n3. Completando tareas..."
curl -s -X PUT http://localhost:5000/api/tasks/1 -H "Content-Type: application/json" -d '{"completed":true}' > /dev/null
echo "  ✓ Tarea #1 completada"
sleep 0.5

# Intentar duplicado
echo -e "\n4. Intentando crear usuario duplicado (generará warning)..."
curl -s -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"name":"Juan Duplicado","email":"juan@test.com"}' > /dev/null
echo "  ✓ Error capturado correctamente: Email duplicado"

echo -e "\n✅ Simulación completa!"
echo -e "\n📋 Ahora ejecuta: python view_logs.py events"
```

---

## 📁 Estructura de Logs

```
logs/
├── events.log     ← 👁️ Mira este para eventos de negocio
├── error.log      ← 🚨 Mira este si algo falla
└── app.log        ← 🔍 Mira este para debug completo
```

---

## 💡 Tips

1. **Desarrollo:** Usa `python view_logs.py events --follow` en una terminal aparte
2. **Producción:** Usa `tail -f logs/events.log` en el servidor
3. **Debug:** Revisa `app.log` para ver todas las peticiones HTTP
4. **Errores:** Revisa `error.log` para stack traces completos

---

## ❓ ¿Qué evento busco?

| Quiero saber... | Busca esto |
|----------------|-----------|
| ¿Cuántos usuarios se registraron? | `grep USER_CREATED logs/events.log \| wc -l` |
| ¿Qué tareas completó un usuario? | `grep "user_id=1" logs/events.log \| grep TASK_COMPLETED` |
| ¿Hubo errores? | `cat logs/error.log` |
| ¿Qué se cambió en una tarea? | `grep "task_id=5" logs/events.log \| grep UPDATED` |
| ¿Cuál fue la última actividad? | `tail -1 logs/events.log` |

---

🎉 **¡Listo!** Ya tienes logs completos de todo lo que pasa en tu aplicación.

Ver más: [LOGGING.md](LOGGING.md) | [DEPLOY.md](DEPLOY.md)

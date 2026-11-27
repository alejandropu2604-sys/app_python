# Script para probar el sistema de logging
# Ejecutar: powershell -ExecutionPolicy Bypass -File test_logs.ps1

Write-Host "🧪 Simulando actividad en la aplicación..." -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:5000"

# Verificar que la app está corriendo
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/users" -TimeoutSec 2
} catch {
    Write-Host "❌ Error: La aplicación no está corriendo en $baseUrl" -ForegroundColor Red
    Write-Host "   Ejecuta primero: python app.py" -ForegroundColor Yellow
    exit 1
}

# Crear usuarios
Write-Host "1. Creando usuarios..." -ForegroundColor Cyan
$users = @(
    @{name="Juan Pérez"; email="juan@test.com"; color="#ff5733"},
    @{name="María García"; email="maria@test.com"; color="#33ff57"},
    @{name="Carlos López"; email="carlos@test.com"; color="#3357ff"}
)

$userIds = @()
foreach ($user in $users) {
    try {
        $body = $user | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $body -ContentType "application/json"
        $userIds += $result.id
        Write-Host "  ✓ Usuario creado: $($user.name) (ID: $($result.id))" -ForegroundColor Green
        Start-Sleep -Milliseconds 300
    } catch {
        Write-Host "  ⚠ No se pudo crear: $($user.name)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Crear tareas
Write-Host "2. Creando tareas..." -ForegroundColor Cyan
$tasks = @(
    @{title="Implementar sistema de login"; priority="high"; user_id=$userIds[0]; description="Autenticación con JWT"},
    @{title="Diseñar interfaz de usuario"; priority="medium"; user_id=$userIds[1]; description="UI/UX moderno"},
    @{title="Escribir tests unitarios"; priority="low"; user_id=$userIds[2]; description="Cobertura > 80%"},
    @{title="Documentar API"; priority="medium"; user_id=$userIds[0]; description="OpenAPI/Swagger"},
    @{title="Configurar CI/CD"; priority="high"; user_id=$userIds[1]; description="GitHub Actions"}
)

$taskIds = @()
foreach ($task in $tasks) {
    try {
        $body = $task | ConvertTo-Json
        $result = Invoke-RestMethod -Uri "$baseUrl/api/tasks" -Method POST -Body $body -ContentType "application/json"
        $taskIds += $result.id
        Write-Host "  ✓ Tarea creada: $($task.title) (ID: $($result.id))" -ForegroundColor Green
        Start-Sleep -Milliseconds 300
    } catch {
        Write-Host "  ⚠ No se pudo crear tarea: $($task.title)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Actualizar algunas tareas
Write-Host "3. Actualizando tareas..." -ForegroundColor Cyan
if ($taskIds.Count -gt 0) {
    $body = @{priority="urgent"} | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($taskIds[0])" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ Tarea #$($taskIds[0]) cambiada a prioridad urgente" -ForegroundColor Green
    Start-Sleep -Milliseconds 300
}

Write-Host ""

# Completar algunas tareas
Write-Host "4. Completando tareas..." -ForegroundColor Cyan
foreach ($taskId in $taskIds[0..2]) {
    if ($taskId) {
        $body = @{completed=$true} | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$taskId" -Method PUT -Body $body -ContentType "application/json"
        Write-Host "  ✓ Tarea #$taskId completada" -ForegroundColor Green
        Start-Sleep -Milliseconds 300
    }
}

Write-Host ""

# Actualizar usuario
Write-Host "5. Actualizando usuario..." -ForegroundColor Cyan
if ($userIds.Count -gt 0) {
    $body = @{name="Juan Pérez Actualizado"; color="#ffaa00"} | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/api/users/$($userIds[0])" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ Usuario #$($userIds[0]) actualizado" -ForegroundColor Green
    Start-Sleep -Milliseconds 300
}

Write-Host ""

# Intentar crear usuario con email duplicado (generará warning en logs)
Write-Host "6. Intentando crear usuario duplicado (generará warning)..." -ForegroundColor Yellow
try {
    $body = @{name="Juan Duplicado"; email="juan@test.com"} | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
} catch {
    Write-Host "  ✓ Error capturado correctamente: Email duplicado" -ForegroundColor Yellow
}

Write-Host ""

# Intentar acceder a recurso inexistente (generará warning en logs)
Write-Host "7. Intentando acceder a recurso inexistente..." -ForegroundColor Yellow
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/users/9999" -Method PUT -Body '{"name":"Test"}' -ContentType "application/json" -ErrorAction Stop
} catch {
    Write-Host "  ✓ Error capturado correctamente: Usuario no encontrado" -ForegroundColor Yellow
}

Write-Host ""

# Eliminar una tarea
Write-Host "8. Eliminando una tarea..." -ForegroundColor Cyan
if ($taskIds.Count -gt 4) {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($taskIds[4])" -Method DELETE
    Write-Host "  ✓ Tarea #$($taskIds[4]) eliminada" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "✅ Simulación completa!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 Ver los logs generados:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   python view_logs.py events          " -NoNewline
Write-Host "← Eventos de negocio" -ForegroundColor Gray
Write-Host "   python view_logs.py errors          " -NoNewline
Write-Host "← Errores (si los hay)" -ForegroundColor Gray
Write-Host "   python view_logs.py all --tail 50   " -NoNewline
Write-Host "← Todo (últimas 50 líneas)" -ForegroundColor Gray
Write-Host "   python view_logs.py events --follow " -NoNewline
Write-Host "← Seguir en tiempo real" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Estadísticas:" -ForegroundColor Cyan
Write-Host "   python view_logs.py stats" -ForegroundColor White
Write-Host ""

#!/usr/bin/env python3
"""
Herramienta para visualizar y filtrar logs de la aplicación.
Uso:
    python view_logs.py events           # Ver solo eventos de negocio
    python view_logs.py errors           # Ver solo errores
    python view_logs.py all              # Ver todo
    python view_logs.py events --tail 50 # Ver últimas 50 líneas
    python view_logs.py events --follow  # Seguir en tiempo real (como tail -f)
"""

import os
import sys
import time
from pathlib import Path

LOG_DIR = Path(__file__).parent / 'logs'

LOG_FILES = {
    'events': LOG_DIR / 'events.log',
    'errors': LOG_DIR / 'error.log',
    'all': LOG_DIR / 'app.log',
}


def tail_file(filepath, lines=50):
    """Lee las últimas N líneas de un archivo"""
    if not filepath.exists():
        print(f"⚠️  El archivo {filepath} no existe aún.")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.readlines()
        for line in content[-lines:]:
            print(line.rstrip())


def follow_file(filepath):
    """Sigue un archivo en tiempo real (como tail -f)"""
    if not filepath.exists():
        print(f"⚠️  Esperando que se cree el archivo {filepath}...")
        while not filepath.exists():
            time.sleep(0.5)
    
    print(f"📋 Siguiendo {filepath.name} en tiempo real (Ctrl+C para salir)...\n")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        # Ir al final del archivo
        f.seek(0, os.SEEK_END)
        
        try:
            while True:
                line = f.readline()
                if line:
                    print(line.rstrip())
                else:
                    time.sleep(0.1)
        except KeyboardInterrupt:
            print("\n\n👋 Detenido.")


def print_stats():
    """Muestra estadísticas de los logs"""
    print("📊 Estadísticas de Logs")
    print("=" * 60)
    
    for log_type, filepath in LOG_FILES.items():
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                size_kb = filepath.stat().st_size / 1024
                print(f"{log_type.upper():10} | {len(lines):6} líneas | {size_kb:7.2f} KB")
        else:
            print(f"{log_type.upper():10} | No existe aún")
    
    print("=" * 60)


def main():
    if len(sys.argv) < 2:
        print("Uso: python view_logs.py [events|errors|all|stats] [--tail N] [--follow]")
        print("\nOpciones:")
        print("  events   - Ver eventos de negocio (creación usuarios, tareas, etc)")
        print("  errors   - Ver solo errores y excepciones")
        print("  all      - Ver todos los logs (incluye debug)")
        print("  stats    - Ver estadísticas de los logs")
        print("\nFlags:")
        print("  --tail N   - Mostrar últimas N líneas (default: 50)")
        print("  --follow   - Seguir el log en tiempo real")
        sys.exit(1)
    
    log_type = sys.argv[1]
    
    if log_type == 'stats':
        print_stats()
        return
    
    if log_type not in LOG_FILES:
        print(f"❌ Tipo de log inválido: {log_type}")
        print(f"   Opciones válidas: {', '.join(LOG_FILES.keys())}, stats")
        sys.exit(1)
    
    filepath = LOG_FILES[log_type]
    
    # Verificar flags
    follow = '--follow' in sys.argv or '-f' in sys.argv
    tail_lines = 50
    
    if '--tail' in sys.argv:
        idx = sys.argv.index('--tail')
        if idx + 1 < len(sys.argv):
            try:
                tail_lines = int(sys.argv[idx + 1])
            except ValueError:
                print("⚠️  --tail requiere un número")
                sys.exit(1)
    
    # Ejecutar
    if follow:
        follow_file(filepath)
    else:
        print(f"📋 Últimas {tail_lines} líneas de {filepath.name}\n")
        tail_file(filepath, tail_lines)


if __name__ == '__main__':
    main()

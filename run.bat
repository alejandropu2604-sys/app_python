@echo off
set PYTHON=C:\Users\alejandrop\AppData\Local\Programs\Python\Python315\python.exe

echo Instalando dependencias...
%PYTHON% -m pip install -r requirements.txt --quiet

echo.
echo Iniciando ToDo App en http://localhost:5000
%PYTHON% app.py
pause

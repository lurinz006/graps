@echo off
echo Starting GRAPS System...

cd Graps-master

echo Starting GRAPS Backend (API Server)...
start "GRAPS Backend API" cmd /k "cd backend && php artisan serve"

echo Starting GRAPS Background Worker...
start "GRAPS Background Queue" cmd /k "cd backend && php artisan queue:work"

echo Starting GRAPS Frontend...
start "GRAPS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All servers are starting in separate windows! 
echo You can close this window now.

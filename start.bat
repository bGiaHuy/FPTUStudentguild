@echo off
title FPTU Student Guide - Start Script

echo ===================================================
echo [1/3] Khoi dong Database (PostgreSQL/PostGIS)...
echo ===================================================
docker rm -f fptu_guide_db 2>nul
docker-compose up -d

echo.
echo ===================================================
echo [2/3] Khoi dong Backend (FastAPI)...
echo ===================================================
start cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload"

echo.
echo ===================================================
echo [3/3] Khoi dong Frontend (React + Vite)...
echo ===================================================
start cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Tat ca cac dich vu dang duoc khoi dong!
echo ===================================================
pause

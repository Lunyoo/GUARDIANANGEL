@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
chcp 65001 >nul
echo =========================================
echo Docker Desktop - Reparacao de Ambiente
echo ATENCAO: Isto vai remover imagens/volumes e recriar o "docker-desktop-data".
echo Voce precisara reconstruir as imagens depois.
echo =========================================

set /p CONFIRM="Digite SIM para continuar: "
if /I not "%CONFIRM%"=="SIM" (
  echo Operacao cancelada.
  pause
  exit /b 0
)

echo [1/6] Encerrando Docker Desktop e WSL...
taskkill /IM "Docker Desktop.exe" /F >nul 2>&1
wsl --shutdown >nul 2>&1

echo [2/6] Removendo dados corrompidos do WSL (docker-desktop e docker-desktop-data)...
wsl --unregister docker-desktop >nul 2>&1
wsl --unregister docker-desktop-data >nul 2>&1

echo [3/6] Limpando caches do Docker (pasta local)...
set "DOCKER_APPDATA=%LocalAppData%\Docker"
if exist "%DOCKER_APPDATA%" (
  rmdir /S /Q "%DOCKER_APPDATA%" >nul 2>&1
)

echo [4/6] Limpando caches do Docker (program data)...
set "DOCKER_PROGDATA=%ProgramData%\DockerDesktop"
if exist "%DOCKER_PROGDATA%" (
  rmdir /S /Q "%DOCKER_PROGDATA%" >nul 2>&1
)

echo [5/6] Reiniciando Docker Desktop...
set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if exist "%DOCKER_EXE%" (
  start "" "%DOCKER_EXE%"
) else (
  echo [AVISO] Nao encontrei "%DOCKER_EXE%". Inicie o Docker Desktop manualmente.
)

echo [6/6] Aguardando Docker Engine (ate 180s)...
for /L %%i in (1,1,90) do (
  docker version --format "{{.Server.Version}}" >nul 2>&1 && goto :ready
  timeout /t 2 /nobreak >nul
)
echo [ERRO] Docker Engine nao ficou pronto. Abra o Docker Desktop e tente novamente.
pause
exit /b 1

:ready
echo [OK] Docker pronto. Agora execute novamente: start.bat
pause
exit /b 0

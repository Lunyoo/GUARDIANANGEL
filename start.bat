@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
echo 🎮 NEXUS GAMING INTELLIGENCE - INICIALIZADOR
echo ==============================================

REM Verificar se Docker CLI existe
@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION
chcp 65001 >nul
echo NEXUS GAMING INTELLIGENCE - INICIALIZADOR
echo =========================================

REM 1) Verificar se Docker CLI existe
docker --version >nul 2>&1
if errorlevel 1 (
        echo [ERRO] Docker nao encontrado. Instale o Docker Desktop em: https://www.docker.com/products/docker-desktop/
        pause
        exit /b 1
)

REM 2) Garantir que o Docker Desktop esta em execucao (start se preciso)
echo [INFO] Verificando Docker Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "^n  $proc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue; ^n  if (-not $proc) { ^n    Write-Host '[INFO] Iniciando Docker Desktop...'; ^n    $exe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'; ^n    if (Test-Path $exe) { Start-Process -FilePath $exe | Out-Null } else { Write-Host '[AVISO] Nao foi possivel localizar o Docker Desktop em %ProgramFiles%'; } ^n  } ^n" >nul 2>&1

REM 3) Aguardar o Docker Engine ficar pronto com timeout (nao travar)
echo [INFO] Aguardando Docker Engine (ate 180s)...
set "_READY=0"
for /L %%i in (1,1,90) do (
    docker version --format "{{.Server.Version}}" >nul 2>&1
    if not errorlevel 1 (
        set "_READY=1"
        goto :docker_ready
    )
    timeout /t 2 /nobreak >nul
)

if "%_READY%" NEQ "1" (
    echo [ERRO] Docker Engine nao ficou pronto. Abra o "Docker Desktop" manualmente, aguarde ficar "running" e execute este script novamente.
    pause
    exit /b 1
)

:docker_ready
echo [OK] Docker pronto.

REM 4) Detectar comando Compose (v2: "docker compose" ou v1: "docker-compose")
set "COMPOSE_CMD=docker compose"
%COMPOSE_CMD% version >nul 2>&1
if errorlevel 1 (
    set "COMPOSE_CMD=docker-compose"
)
echo [OK] Usando: %COMPOSE_CMD%

REM Ajustar timeouts para redes lentas
set COMPOSE_HTTP_TIMEOUT=240
set DOCKER_CLIENT_TIMEOUT=240

REM 5) Garantir .env
if not exist .env (
    if exist .env.example (
        echo [INFO] Criando .env a partir de .env.example
        copy /Y .env.example .env >nul
    ) else (
        echo [AVISO] .env nao encontrado (seguindo com variaveis padrao do compose)
    )
)

REM 6) Derrubar stack anterior (se existir)
echo [INFO] Parando containers anteriores...
%COMPOSE_CMD% down -v >nul 2>&1

REM 7) Subir stack (build + up) com uma tentativa de recuperacao automatica
set "_RETRIED=0"

:docker_up
echo [INFO] Construindo e iniciando servicos (pode demorar na primeira vez)...
%COMPOSE_CMD% up -d --build
if errorlevel 1 (
    echo [AVISO] Falha ao construir/iniciar da primeira tentativa.
    if "%_RETRIED%"=="0" (
        echo [TENTATIVA] Limpando caches do Docker e reiniciando WSL/Docker Desktop...
        docker system prune -af --volumes >nul 2>&1
        docker builder prune -af >nul 2>&1
        powershell -NoProfile -ExecutionPolicy Bypass -Command "wsl -l -v; wsl --shutdown" >nul 2>&1
        echo [INFO] Reiniciando Docker Desktop...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "^n  $exe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'; ^n  if (Test-Path $exe) { Start-Process -FilePath $exe | Out-Null } ^n" >nul 2>&1
        echo [INFO] Aguardando Docker Engine apos reinicio (ate 120s)...
        for /L %%j in (1,1,60) do (
            docker version --format "{{.Server.Version}}" >nul 2>&1 && goto :retry_ready
            timeout /t 2 /nobreak >nul
        )
        :retry_ready
        set "_RETRIED=1"
        goto :docker_up
    ) else (
    echo [ERRO] Falha ao construir/iniciar apos tentativa de recuperacao. Veja logs completos com: %COMPOSE_CMD% logs --no-color
    echo [DICA] Se o erro citar "input/output error" ou blobs em containerd, rode: repair-docker.bat
        pause
        exit /b 1
    )
)

REM 8) Mostrar status e endpoints
echo.
echo =========================================
echo [OK] NEXUS INICIADO
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo ML:       http://localhost:8000
echo Scraping: http://localhost:8080
echo.
echo Admin: alexvinitius@gmail.com  Senha: admin123
echo.
echo Dicas:
echo - Acompanhe logs: %COMPOSE_CMD% logs -f --tail=100
echo - Parar stack:   %COMPOSE_CMD% down -v
echo =========================================
pause
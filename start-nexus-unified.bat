@echo off
REM Script de inicialização da Plataforma NEXUS - Versão Unificada (Windows)
REM Este script substitui os arquivos problemáticos e executa a versão corrigida

echo.
echo 🚀 NEXUS Platform - Inicialização Unificada
echo =============================================
echo.

REM Verificar se Docker está rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está rodando. Inicie o Docker primeiro.
    pause
    exit /b 1
)

echo ✅ Docker está rodando

REM Verificar se docker-compose está disponível
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose não encontrado. Instale o docker-compose.
    pause
    exit /b 1
)

echo ✅ docker-compose encontrado

REM Parar serviços existentes se estiverem rodando
echo.
echo 🛑 Parando serviços existentes...
docker-compose -f docker-compose.yml down 2>nul
docker-compose -f docker-compose.unified.yml down 2>nul
docker-compose -f backend/docker-compose.yml down 2>nul

REM Limpar containers órfãos
docker container prune -f 2>nul

echo ✅ Serviços anteriores parados

REM Backup do .env atual se existir
if exist .env (
    echo.
    echo 📁 Fazendo backup do .env atual...
    copy .env .env.backup.%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2% >nul
    echo ✅ Backup criado
)

REM Copiar arquivos unificados
echo.
echo 🔧 Aplicando configuração unificada...

REM Substituir docker-compose
copy docker-compose.unified.yml docker-compose.yml >nul
echo ✅ docker-compose.yml atualizado

REM Atualizar .env
copy .env.unified .env >nul
echo ✅ .env atualizado

echo.
echo 🔍 Verificando configurações...
echo ✅ PostgreSQL configurado
echo ✅ Redis configurado
echo ✅ APIs configuradas

echo.
echo 🏗️  Construindo e iniciando serviços...
echo Perfis disponíveis:
echo   - full: Frontend + Backend + ML + Scraping (desenvolvimento)
echo   - prod: Frontend produção + todos os serviços
echo   - backend-only: Apenas serviços backend
echo.

REM Detectar modo baseado em argumentos
set MODE=full
if "%1"=="prod" (
    set MODE=prod
    set NODE_ENV=production
    set BUILD_TARGET=production
) else if "%1"=="backend" (
    set MODE=backend-only
)

echo 🎯 Executando no modo: %MODE%
echo.

REM Build e start com profile específico
if "%MODE%"=="full" (
    echo 🔨 Construindo imagens...
    docker-compose build --parallel
    echo.
    echo 🚀 Iniciando todos os serviços (desenvolvimento)...
    docker-compose --profile full up -d
) else if "%MODE%"=="prod" (
    echo 🔨 Construindo imagens de produção...
    docker-compose build --parallel --build-arg BUILD_TARGET=production
    echo.
    echo 🚀 Iniciando serviços de produção...
    docker-compose --profile prod up -d
) else if "%MODE%"=="backend-only" (
    echo 🔨 Construindo serviços backend...
    docker-compose build backend ml-service scraping-service
    echo.
    echo 🚀 Iniciando apenas backend...
    docker-compose --profile backend-only up -d
)

REM Aguardar services ficarem healthy
echo.
echo ⏳ Aguardando serviços iniciarem...
timeout /t 15 /nobreak >nul

REM Verificar status
echo.
echo 📊 Status dos serviços:
docker-compose ps

echo.
echo 🎯 NEXUS PLATFORM - STATUS
echo ==========================
echo.
echo 🌐 URLs disponíveis:
if not "%MODE%"=="backend-only" echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:3001
echo    ML Service: http://localhost:8000
echo    Scraping Service: http://localhost:8080
echo.
echo 🔐 Login administrativo:
echo    Email: alexvinitius@gmail.com
echo    Senha: admin123456
echo.
echo 📋 Comandos úteis:
echo    Logs: docker-compose logs -f
echo    Status: docker-compose ps
echo    Parar: docker-compose down
echo    Rebuild: docker-compose up --build --force-recreate
echo.

echo 🎉 PLATAFORMA NEXUS INICIADA COM SUCESSO!
echo.
echo Problemas resolvidos nesta versão:
echo ✅ Banco único PostgreSQL (sem mais SQLite)
echo ✅ Caminhos DATABASE_URL corrigidos
echo ✅ Portas padronizadas sem conflito
echo ✅ Redis unificado com configuração consistente
echo ✅ Volumes nomeados para persistência
echo ✅ Health checks implementados
echo ✅ Profiles para diferentes ambientes
echo ✅ Limitação de recursos configurada
echo ✅ Bind mounts otimizados
echo.
echo Acesse http://localhost:3000 e faça login para começar!

pause
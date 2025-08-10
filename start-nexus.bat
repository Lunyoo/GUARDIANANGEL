@echo off
echo 🚀 Iniciando Plataforma NEXUS Gaming Intelligence...
echo ==================================================

REM Verificar se Docker está instalado
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker não encontrado. Por favor, instale o Docker primeiro.
    echo 👉 https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro.
    echo 👉 https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo ✅ Docker encontrado
echo ✅ Docker Compose encontrado
echo.

REM Verificar se o arquivo .env existe
if not exist .env (
    echo ❌ Arquivo .env não encontrado!
    if exist .env.example (
        echo 📝 Criando .env a partir do .env.example...
        copy .env.example .env >nul
        echo ✅ Arquivo .env criado. Configure suas APIs antes de continuar.
        echo 📝 Edite o arquivo .env com suas credenciais reais.
        pause
        exit /b 1
    ) else (
        echo ❌ Arquivo .env.example não encontrado!
        pause
        exit /b 1
    )
)

echo ✅ Arquivo .env encontrado
echo.

REM Criar diretórios necessários
echo 📁 Criando diretórios necessários...
if not exist backend\data mkdir backend\data
if not exist ml-service\models mkdir ml-service\models
if not exist scraping-service\data mkdir scraping-service\data
echo ✅ Diretórios criados
echo.

REM Parar containers existentes
echo 🛑 Parando containers existentes...
docker-compose down --remove-orphans
echo.

REM Construir e iniciar os serviços
echo 🏗️ Construindo e iniciando serviços...
echo ⏳ Isso pode demorar alguns minutos na primeira execução...
echo.

docker-compose up --build -d

REM Aguardar um pouco para os containers subirem
echo.
echo 🔍 Verificando status dos containers...
timeout /t 10 /nobreak >nul

REM Verificar status
docker-compose ps

echo.
echo 🎉 Plataforma NEXUS iniciada!
echo.
echo 🌐 Acesse a plataforma em: http://localhost:3000
echo 🔑 Login de administrador: alexvinitius@gmail.com
echo.
echo 📊 Serviços disponíveis:
echo   • Frontend:         http://localhost:3000
echo   • Backend API:      http://localhost:3001
echo   • ML Service:       http://localhost:8000
echo   • Scraping Service: http://localhost:8080
echo.
echo 📋 Comandos úteis:
echo   • Ver logs:         docker-compose logs -f
echo   • Parar plataforma: docker-compose down
echo   • Status:           docker-compose ps
echo.
echo ==================================================
echo 🚀 Script de inicialização concluído!
pause
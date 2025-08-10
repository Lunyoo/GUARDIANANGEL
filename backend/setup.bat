@echo off
echo 🎮 Nexus Gaming Intelligence - Setup Script
echo =============================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your actual API keys and configuration
    echo 📋 Required configurations:
    echo    - FACEBOOK_ACCESS_TOKEN
    echo    - FACEBOOK_AD_ACCOUNT_ID
    echo    - JWT_SECRET (generate a secure secret)
    echo    - Other API keys as needed
    echo.
    pause
)

echo 🏗️  Building Docker images...
docker-compose build

echo 🚀 Starting services...
docker-compose up -d

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak

echo 🔍 Checking service health...
REM Note: curl checks would require curl to be installed on Windows
echo Please check the services manually at:
echo    - Backend API: http://localhost:3001/health
echo    - ML Service: http://localhost:8001/health
echo    - Scraper Service: http://localhost:8002/health

echo.
echo 🎉 Setup completed!
echo.
echo 📋 Service URLs:
echo    - Backend API: http://localhost:3001
echo    - ML Service: http://localhost:8001
echo    - Scraper Service: http://localhost:8002
echo.
echo 🔗 Useful endpoints:
echo    - Health Check: http://localhost:3001/health
echo    - API Status: http://localhost:3001/api/status
echo    - API Docs: http://localhost:3001 (welcome page)
echo.
echo 📝 Next steps:
echo    1. Test the API endpoints
echo    2. Register a user via POST /api/auth/register
echo    3. Configure your Facebook API credentials
echo    4. Start using the platform!
echo.
echo 📖 Check README.md for detailed API documentation
echo 🐛 Run 'docker-compose logs -f' to monitor logs
pause
#!/bin/bash

echo "🎮 Nexus Gaming Intelligence - Setup Script"
echo "============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual API keys and configuration"
    echo "📋 Required configurations:"
    echo "   - FACEBOOK_ACCESS_TOKEN"
    echo "   - FACEBOOK_AD_ACCOUNT_ID"
    echo "   - JWT_SECRET (generate a secure secret)"
    echo "   - Other API keys as needed"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is not responding"
fi

# Check ML service
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ ML Service is healthy"
else
    echo "⚠️  ML Service is not responding (may still be starting)"
fi

# Check Scraper service
if curl -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Scraper Service is healthy"
else
    echo "⚠️  Scraper Service is not responding (may still be starting)"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Service URLs:"
echo "   - Backend API: http://localhost:3001"
echo "   - ML Service: http://localhost:8001"
echo "   - Scraper Service: http://localhost:8002"
echo ""
echo "🔗 Useful endpoints:"
echo "   - Health Check: http://localhost:3001/health"
echo "   - API Status: http://localhost:3001/api/status"
echo "   - API Docs: http://localhost:3001 (welcome page)"
echo ""
echo "📝 Next steps:"
echo "   1. Test the API endpoints"
echo "   2. Register a user via POST /api/auth/register"
echo "   3. Configure your Facebook API credentials"
echo "   4. Start using the platform!"
echo ""
echo "📖 Check README.md for detailed API documentation"
echo "🐛 Run 'docker-compose logs -f' to monitor logs"
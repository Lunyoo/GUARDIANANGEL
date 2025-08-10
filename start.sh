#!/bin/bash

echo "🎮 NEXUS GAMING INTELLIGENCE - INICIALIZADOR"
echo "=============================================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale Docker primeiro."
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose encontrados"

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
fi

echo "✅ Arquivo .env configurado"

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null

# Limpar containers antigos (opcional)
echo "🧹 Limpando containers antigos..."
docker system prune -f >/dev/null 2>&1

# Construir e iniciar
echo "🚀 Construindo e iniciando todos os serviços..."
docker-compose up --build -d

# Aguardar serviços subirem
echo "⏳ Aguardando serviços iniciarem..."
sleep 30

# Verificar saúde dos serviços
echo "🔍 Verificando saúde dos serviços..."

services=(
    "http://localhost:3000:Frontend"
    "http://localhost:3001/health:Backend" 
    "http://localhost:8000/health:ML Service"
    "http://localhost:8080/health:Scraping Service"
)

for service in "${services[@]}"; do
    url=$(echo $service | cut -d: -f1-2)
    name=$(echo $service | cut -d: -f3)
    
    if curl -s $url >/dev/null 2>&1; then
        echo "✅ $name - OK"
    else
        echo "❌ $name - ERRO"
    fi
done

echo ""
echo "🎯 NEXUS GAMING INTELLIGENCE INICIADO!"
echo "======================================"
echo "🎮 Frontend: http://localhost:3000"
echo "📡 Backend: http://localhost:3001"
echo "🤖 ML Service: http://localhost:8000"
echo "🕷️ Scraping: http://localhost:8080"
echo ""
echo "📧 Login: alexvinitius@gmail.com"
echo "🔑 Senha: nexus2024"
echo ""
echo "📋 Logs: docker-compose logs -f"
echo "🛑 Parar: docker-compose down"
echo ""
echo "🚀 Bom game! 🎮"
#!/bin/bash

# 🚀 Script de Inicialização da Plataforma NEXUS
# Execute este script para subir toda a plataforma

echo "🚀 Iniciando Plataforma NEXUS Gaming Intelligence..."
echo "=================================================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Por favor, instale o Docker primeiro."
    echo "👉 https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro."
    echo "👉 https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker encontrado: $(docker --version)"
echo "✅ Docker Compose encontrado: $(docker-compose --version)"
echo ""

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📝 Criando .env a partir do .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Arquivo .env criado. Configure suas APIs antes de continuar."
        echo "📝 Edite o arquivo .env com suas credenciais reais."
        exit 1
    else
        echo "❌ Arquivo .env.example não encontrado!"
        exit 1
    fi
fi

echo "✅ Arquivo .env encontrado"
echo ""

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p backend/data
mkdir -p ml-service/models
mkdir -p scraping-service/data
echo "✅ Diretórios criados"
echo ""

# Parar containers existentes se estiverem rodando
echo "🛑 Parando containers existentes..."
docker-compose down --remove-orphans
echo ""

# Construir e iniciar os serviços
echo "🏗️  Construindo e iniciando serviços..."
echo "⏳ Isso pode demorar alguns minutos na primeira execução..."
echo ""

# Executar docker-compose com build
docker-compose up --build -d

# Verificar se os containers subiram
echo ""
echo "🔍 Verificando status dos containers..."
sleep 10

# Verificar cada serviço
services=("redis" "backend" "ml-service" "scraping-service" "frontend")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "${service}.*Up"; then
        echo "✅ $service - Rodando"
    else
        echo "❌ $service - Falhou ao iniciar"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo "🎉 Plataforma NEXUS iniciada com sucesso!"
    echo ""
    echo "🌐 Acesse a plataforma em: http://localhost:3000"
    echo "🔑 Login de administrador: alexvinitius@gmail.com"
    echo ""
    echo "📊 Serviços disponíveis:"
    echo "  • Frontend:         http://localhost:3000"
    echo "  • Backend API:      http://localhost:3001"
    echo "  • ML Service:       http://localhost:8000"
    echo "  • Scraping Service: http://localhost:8080"
    echo ""
    echo "📋 Comandos úteis:"
    echo "  • Ver logs:         docker-compose logs -f"
    echo "  • Parar plataforma: docker-compose down"
    echo "  • Status:           docker-compose ps"
    echo ""
    echo "🔍 Health checks:"
    echo "  • Backend:   curl http://localhost:3001/health"
    echo "  • ML:        curl http://localhost:8000/health"
    echo "  • Scraping:  curl http://localhost:8080/health"
else
    echo "❌ Alguns serviços falharam ao iniciar!"
    echo ""
    echo "🔧 Para verificar problemas:"
    echo "  • docker-compose logs -f"
    echo "  • docker-compose ps"
    echo ""
    echo "📝 Logs completos dos serviços:"
    docker-compose logs --tail=20
fi

echo ""
echo "=================================================="
echo "🚀 Script de inicialização concluído!"
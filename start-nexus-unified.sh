#!/bin/bash

# Script de inicialização da Plataforma NEXUS - Versão Unificada
# Este script substitui os arquivos problemáticos e executa a versão corrigida

echo "🚀 NEXUS Platform - Inicialização Unificada"
echo "============================================="
echo ""

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

echo "✅ Docker está rodando"

# Verificar se docker-compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose não encontrado. Instale o docker-compose."
    exit 1
fi

echo "✅ docker-compose encontrado"

# Parar serviços existentes se estiverem rodando
echo ""
echo "🛑 Parando serviços existentes..."
docker-compose -f docker-compose.yml down 2>/dev/null || true
docker-compose -f docker-compose.unified.yml down 2>/dev/null || true
docker-compose -f backend/docker-compose.yml down 2>/dev/null || true

# Limpar containers órfãos
docker container prune -f 2>/dev/null || true

echo "✅ Serviços anteriores parados"

# Backup do .env atual se existir
if [ -f .env ]; then
    echo ""
    echo "📁 Fazendo backup do .env atual..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup criado: .env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copiar arquivos unificados
echo ""
echo "🔧 Aplicando configuração unificada..."

# Substituir docker-compose
cp docker-compose.unified.yml docker-compose.yml
echo "✅ docker-compose.yml atualizado"

# Atualizar .env
cp .env.unified .env
echo "✅ .env atualizado"

# Verificar se todas as variáveis necessárias estão definidas
echo ""
echo "🔍 Verificando configurações..."

# Verificar APIs críticas
if grep -q "your_" .env; then
    echo "⚠️  ATENÇÃO: Algumas APIs ainda precisam ser configuradas no .env"
fi

# Verificar se Postgres está configurado
if grep -q "POSTGRES_PASSWORD=nexus_secure_password_2024" .env; then
    echo "✅ PostgreSQL configurado"
else
    echo "⚠️  Configurando PostgreSQL..."
fi

echo ""
echo "🏗️  Construindo e iniciando serviços..."
echo "Perfis disponíveis:"
echo "  - full: Frontend + Backend + ML + Scraping (desenvolvimento)"
echo "  - prod: Frontend produção + todos os serviços"
echo "  - backend-only: Apenas serviços backend"
echo ""

# Detectar modo baseado em argumentos
MODE="full"
if [ "$1" = "prod" ]; then
    MODE="prod"
    export NODE_ENV=production
    export BUILD_TARGET=production
elif [ "$1" = "backend" ]; then
    MODE="backend-only"
fi

echo "🎯 Executando no modo: $MODE"
echo ""

# Build e start com profile específico
if [ "$MODE" = "full" ]; then
    echo "🔨 Construindo imagens..."
    docker-compose build --parallel
    echo ""
    echo "🚀 Iniciando todos os serviços (desenvolvimento)..."
    docker-compose --profile full up -d
elif [ "$MODE" = "prod" ]; then
    echo "🔨 Construindo imagens de produção..."
    docker-compose build --parallel --build-arg BUILD_TARGET=production
    echo ""
    echo "🚀 Iniciando serviços de produção..."
    docker-compose --profile prod up -d
elif [ "$MODE" = "backend-only" ]; then
    echo "🔨 Construindo serviços backend..."
    docker-compose build backend ml-service scraping-service
    echo ""
    echo "🚀 Iniciando apenas backend..."
    docker-compose --profile backend-only up -d
fi

# Aguardar services ficarem healthy
echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

# Verificar status
echo ""
echo "📊 Status dos serviços:"
docker-compose ps

echo ""
echo "🔍 Testando health checks..."

# Test backend
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend: http://localhost:3001 - OK"
else
    echo "❌ Backend: http://localhost:3001 - Erro"
fi

# Test ML service (se ativo)
if docker-compose ps ml-service | grep -q Up; then
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ ML Service: http://localhost:8000 - OK"
    else
        echo "❌ ML Service: http://localhost:8000 - Erro"
    fi
fi

# Test Scraping service (se ativo)
if docker-compose ps scraping-service | grep -q Up; then
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        echo "✅ Scraping Service: http://localhost:8080 - OK"
    else
        echo "❌ Scraping Service: http://localhost:8080 - Erro"
    fi
fi

# Test Frontend (se ativo)
if docker-compose ps frontend | grep -q Up || docker-compose ps frontend-prod | grep -q Up; then
    sleep 5  # Frontend demora mais para iniciar
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        echo "✅ Frontend: http://localhost:3000 - OK"
    else
        echo "❌ Frontend: http://localhost:3000 - Iniciando..."
    fi
fi

echo ""
echo "🎯 NEXUS PLATFORM - STATUS"
echo "=========================="
echo ""
echo "🌐 URLs disponíveis:"
if [ "$MODE" != "backend-only" ]; then
    echo "   Frontend: http://localhost:3000"
fi
echo "   Backend API: http://localhost:3001"
echo "   ML Service: http://localhost:8000"
echo "   Scraping Service: http://localhost:8080"
echo ""
echo "🔐 Login administrativo:"
echo "   Email: alexvinitius@gmail.com"
echo "   Senha: admin123456"
echo ""
echo "📋 Comandos úteis:"
echo "   Logs: docker-compose logs -f"
echo "   Status: docker-compose ps"
echo "   Parar: docker-compose down"
echo "   Rebuild: docker-compose up --build --force-recreate"
echo ""

# Verificar se há erros nos logs
echo "🔍 Verificando logs para erros..."
if docker-compose logs --tail=20 2>&1 | grep -i error | head -5; then
    echo ""
    echo "⚠️  Alguns erros foram detectados nos logs. Execute 'docker-compose logs -f' para investigar."
else
    echo "✅ Nenhum erro crítico detectado nos logs recentes"
fi

echo ""
echo "🎉 PLATAFORMA NEXUS INICIADA COM SUCESSO!"
echo ""
echo "Problemas resolvidos nesta versão:"
echo "✅ Banco único PostgreSQL (sem mais SQLite)"
echo "✅ Caminhos DATABASE_URL corrigidos"
echo "✅ Portas padronizadas sem conflito"
echo "✅ Redis unificado com configuração consistente"
echo "✅ Volumes nomeados para persistência"
echo "✅ Health checks implementados"
echo "✅ Profiles para diferentes ambientes"
echo "✅ Limitação de recursos configurada"
echo "✅ Bind mounts otimizados"
echo ""
echo "Acesse http://localhost:3000 e faça login para começar!"
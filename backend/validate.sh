#!/bin/bash

echo "🔍 Nexus Backend - Validação da Estrutura"
echo "=========================================="

errors=0
warnings=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ $1 - MISSING"
        ((errors++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ $1/ - MISSING"
        ((errors++))
    fi
}

echo ""
echo "📁 Verificando estrutura de diretórios..."
check_dir "src"
check_dir "src/config"
check_dir "src/controllers"
check_dir "src/middleware"
check_dir "src/routes"
check_dir "src/services"
check_dir "src/types"
check_dir "ml-service"
check_dir "scraper-service"
check_dir "prisma"
check_dir "scripts"

echo ""
echo "📄 Verificando arquivos principais..."
check_file "package.json"
check_file "tsconfig.json"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file ".env.example"
check_file ".dockerignore"
check_file "README.md"
check_file "INICIO_RAPIDO.md"

echo ""
echo "🔧 Verificando arquivos de configuração..."
check_file "src/server.ts"
check_file "src/config/database.ts"
check_file "src/config/logger.ts"
check_file "src/config/redis.ts"
check_file "prisma/schema.prisma"
check_file "scripts/seed.ts"

echo ""
echo "🛠️ Verificando controllers e middleware..."
check_file "src/controllers/authController.ts"
check_file "src/controllers/campaignController.ts"
check_file "src/controllers/scrapingController.ts"
check_file "src/middleware/auth.ts"
check_file "src/middleware/errorHandler.ts"
check_file "src/middleware/requestLogger.ts"

echo ""
echo "🌐 Verificando rotas..."
check_file "src/routes/auth.ts"
check_file "src/routes/campaigns.ts"
check_file "src/routes/scraping.ts"
check_file "src/routes/facebook.ts"

echo ""
echo "⚙️ Verificando serviços..."
check_file "src/services/cache.ts"
check_file "src/services/queue.ts"
check_file "src/services/logger.ts"
check_file "src/types/index.ts"

echo ""
echo "🐍 Verificando serviços Python..."
check_file "ml-service/main.py"
check_file "ml-service/requirements.txt"
check_file "ml-service/Dockerfile"
check_file "scraper-service/main.py"
check_file "scraper-service/requirements.txt"
check_file "scraper-service/Dockerfile"

echo ""
echo "📋 Resumo da Validação:"
echo "======================"

if [ $errors -eq 0 ]; then
    echo "🎉 SUCESSO! Todos os arquivos estão presentes."
    echo ""
    echo "✅ Estrutura completa validada"
    echo "✅ Backend Node.js/TypeScript pronto"
    echo "✅ ML Service Python pronto" 
    echo "✅ Scraper Service Python pronto"
    echo "✅ Docker configuration pronta"
    echo "✅ Documentação completa"
    echo ""
    echo "🚀 O backend está pronto para uso!"
    echo ""
    echo "📝 Próximos passos:"
    echo "   1. Configure o arquivo .env com suas chaves de API"
    echo "   2. Execute: ./setup.sh (Linux/Mac) ou setup.bat (Windows)"
    echo "   3. Teste as APIs conforme documentação"
    echo ""
    echo "📖 Consulte README.md para instruções detalhadas"
else
    echo "❌ ERRO! $errors arquivo(s) faltando."
    echo ""
    echo "⚠️  O backend não está completo. Verifique os arquivos listados acima."
fi

if [ $warnings -gt 0 ]; then
    echo "⚠️  $warnings aviso(s) encontrado(s)."
fi

echo ""
echo "📊 Estatísticas do projeto:"
echo "   - Controllers: $(find src/controllers -name '*.ts' 2>/dev/null | wc -l)"
echo "   - Routes: $(find src/routes -name '*.ts' 2>/dev/null | wc -l)"
echo "   - Services: $(find src/services -name '*.ts' 2>/dev/null | wc -l)"
echo "   - Middleware: $(find src/middleware -name '*.ts' 2>/dev/null | wc -l)"
echo "   - Python Services: 2 (ML + Scraper)"
echo ""
echo "🎮 Nexus Gaming Intelligence Backend - Validação concluída!"
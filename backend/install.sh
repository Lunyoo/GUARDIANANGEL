#!/bin/bash

echo "🚀 NEXUS GAMING INTELLIGENCE - INSTALAÇÃO AUTOMÁTICA"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    log_error "Execute este script dentro do diretório BACKEND_FODAO"
    exit 1
fi

log_info "Iniciando instalação do Nexus Gaming Intelligence Backend..."

# 1. Verificar Node.js
log_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js versão $NODE_VERSION encontrada. É necessário Node.js 18+"
    exit 1
fi

log_success "Node.js $(node -v) encontrado"

# 2. Verificar Python
log_info "Verificando Python..."
if ! command -v python3 &> /dev/null; then
    log_error "Python3 não encontrado. Instale Python 3.9+ primeiro."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
log_success "Python $PYTHON_VERSION encontrado"

# 3. Verificar Docker (opcional)
log_info "Verificando Docker..."
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    log_success "Docker e Docker Compose encontrados"
    DOCKER_AVAILABLE=true
else
    log_warning "Docker não encontrado. Instalação manual será necessária."
    DOCKER_AVAILABLE=false
fi

# 4. Perguntar método de instalação
echo ""
echo "Escolha o método de instalação:"
echo "1) Docker (Recomendado) - Automático e isolado"
echo "2) Manual - Instalar dependências localmente"

if [ "$DOCKER_AVAILABLE" = true ]; then
    read -p "Digite sua escolha (1 ou 2): " choice
else
    log_warning "Docker não disponível. Usando instalação manual."
    choice=2
fi

echo ""

if [ "$choice" = "1" ] && [ "$DOCKER_AVAILABLE" = true ]; then
    # === INSTALAÇÃO COM DOCKER ===
    log_info "🐳 Instalação com Docker selecionada"
    
    # Verificar arquivo .env
    if [ ! -f ".env" ]; then
        log_info "Criando arquivo .env..."
        cp .env.example .env 2>/dev/null || echo "# Configure suas variáveis aqui" > .env
        log_warning "Configure o arquivo .env antes de continuar!"
        log_info "Edite o arquivo .env com suas credenciais reais:"
        echo "  - FACEBOOK_ACCESS_TOKEN"
        echo "  - KIWIFY_CLIENT_SECRET"  
        echo "  - IDEOGRAM_API_KEY"
        echo "  - OPENAI_API_KEY"
        echo ""
        read -p "Pressione ENTER após configurar o .env..."
    fi

    log_info "Construindo e iniciando containers..."
    docker-compose build
    docker-compose up -d
    
    log_info "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Executar migrações
    log_info "Executando migrações do banco..."
    docker-compose exec api npx prisma migrate deploy
    docker-compose exec api npx prisma db seed
    
    log_success "🎉 Instalação com Docker concluída!"
    log_info "Serviços disponíveis em:"
    echo "  - API Principal: http://localhost:3001"
    echo "  - ML Service: http://localhost:8000"
    echo "  - Dashboard Filas: http://localhost:3001/admin/queues"
    echo "  - Redis UI: http://localhost:8081"
    echo "  - PostgreSQL UI: http://localhost:8080"

else
    # === INSTALAÇÃO MANUAL ===
    log_info "🔧 Instalação manual selecionada"
    
    # 5. Verificar PostgreSQL
    log_info "Verificando PostgreSQL..."
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL não encontrado. Instale PostgreSQL 15+ primeiro."
        echo "Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
        echo "macOS: brew install postgresql"
        exit 1
    fi
    log_success "PostgreSQL encontrado"

    # 6. Verificar Redis
    log_info "Verificando Redis..."
    if ! command -v redis-server &> /dev/null; then
        log_error "Redis não encontrado. Instale Redis primeiro."
        echo "Ubuntu/Debian: sudo apt install redis-server"
        echo "macOS: brew install redis"
        exit 1
    fi
    log_success "Redis encontrado"

    # 7. Instalar dependências Node.js
    log_info "Instalando dependências Node.js..."
    npm install

    # 8. Configurar banco de dados
    if [ ! -f ".env" ]; then
        log_info "Criando arquivo .env..."
        cp .env.example .env 2>/dev/null || cat > .env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://nexus_user:nexus_password@localhost:5432/nexus_gaming_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Configure suas APIs aqui:
FACEBOOK_ACCESS_TOKEN=""
FACEBOOK_AD_ACCOUNT_ID=""
KIWIFY_CLIENT_SECRET=""
IDEOGRAM_API_KEY=""
OPENAI_API_KEY=""
ADMIN_EMAIL="alexvinitius@gmail.com"
EOF
        log_warning "Configure o arquivo .env com suas credenciais!"
    fi

    # 9. Criar banco de dados
    log_info "Configurando banco de dados..."
    sudo -u postgres createdb nexus_gaming_db 2>/dev/null || log_warning "Banco já existe"
    sudo -u postgres psql -c "CREATE USER nexus_user WITH PASSWORD 'nexus_password';" 2>/dev/null || log_warning "Usuário já existe"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nexus_gaming_db TO nexus_user;" 2>/dev/null

    # 10. Executar migrações
    log_info "Executando migrações..."
    npx prisma migrate deploy
    npx prisma db seed

    # 11. Instalar dependências Python (ML Service)
    log_info "Instalando dependências do ML Service..."
    cd ml-service
    python3 -m pip install -r requirements.txt
    mkdir -p models
    cd ..

    # 12. Instalar dependências Python (Scraping)
    log_info "Instalando dependências do Scraping Service..."
    cd scraping-service
    python3 -m pip install -r requirements.txt
    python3 -m playwright install chromium
    cd ..

    # 13. Criar diretórios necessários
    mkdir -p logs uploads screenshots

    log_success "🎉 Instalação manual concluída!"
    log_info "Para iniciar os serviços:"
    echo "  Terminal 1: npm run dev"
    echo "  Terminal 2: python3 ml-service/main.py"
    echo "  Terminal 3: redis-server"
    echo "  Terminal 4: sudo systemctl start postgresql"
fi

# Verificar se os serviços estão rodando
echo ""
log_info "Verificando serviços..."

# Aguardar um pouco para os serviços ficarem prontos
sleep 5

# Testar API Principal
if curl -s http://localhost:3001/health > /dev/null; then
    log_success "✅ API Principal rodando em http://localhost:3001"
else
    log_warning "⚠️  API Principal não está respondendo"
fi

# Testar ML Service
if curl -s http://localhost:8000/health > /dev/null; then
    log_success "✅ ML Service rodando em http://localhost:8000"
else
    log_warning "⚠️  ML Service não está respondendo"
fi

# Instruções finais
echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "=================="
echo "1. Configure o arquivo .env com suas credenciais reais"
echo "2. Acesse http://localhost:3001/health para verificar status"
echo "3. Registre-se na API em /api/auth/register"
echo "4. Configure suas APIs no sistema"
echo "5. Inicie sua primeira automação!"
echo ""
echo "📖 Documentação completa: README.md"
echo "🆘 Suporte: alexvinitius@gmail.com"
echo ""
log_success "🚀 BACKEND FODÃO PRONTO PARA DOMINAR! 💪"
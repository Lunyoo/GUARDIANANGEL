# 🎮 Nexus Gaming Intelligence - Backend Completo

Plataforma completa de inteligência para Facebook Ads com análise preditiva, scraping automatizado e machine learning.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API Endpoints](#api-endpoints)
- [Monitoramento](#monitoramento)
- [Desenvolvimento](#desenvolvimento)
- [Produção](#produção)

## 🎯 Visão Geral

O backend Nexus Gaming Intelligence é uma solução completa que combina:

- **Node.js/Express**: API principal com autenticação JWT
- **PostgreSQL**: Banco de dados principal
- **Redis**: Cache e sistema de filas
- **Python ML Service**: Análise preditiva e machine learning
- **Python Scraper Service**: Web scraping inteligente
- **Docker**: Orquestração completa de serviços

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Backend API   │────│   PostgreSQL    │
│   (React)       │    │   (Node.js)     │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │     Redis       │
                       │ (Cache + Queue) │
                       └─────────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
         ┌─────────────────┐        ┌─────────────────┐
         │   ML Service    │        │ Scraper Service │
         │   (Python)      │        │   (Python)      │
         └─────────────────┘        └─────────────────┘
```

## 🛠️ Pré-requisitos

### Docker (Recomendado)
- Docker Engine 20.10+
- Docker Compose 2.0+

### Instalação Local
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

## 🚀 Instalação

### Opção 1: Docker (Recomendado)

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd BACKEND_FODAO
```

2. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Inicie todos os serviços:**
```bash
docker-compose up -d
```

4. **Aguarde a inicialização completa:**
```bash
# Monitore os logs
docker-compose logs -f

# Verifique o status dos serviços
docker-compose ps
```

### Opção 2: Instalação Local

1. **Backend Principal:**
```bash
# Instalar dependências
npm install

# Configurar banco
npm run prisma:generate
npm run prisma:push
npm run seed

# Iniciar em desenvolvimento
npm run dev
```

2. **ML Service:**
```bash
cd ml-service
pip install -r requirements.txt
python main.py
```

3. **Scraper Service:**
```bash
cd scraper-service
pip install -r requirements.txt
# Instalar Playwright browsers
playwright install chromium
python main.py
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Backend
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://nexus_user:nexus_password@localhost:5432/nexus_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="seu-jwt-secret-super-seguro"
JWT_EXPIRES_IN="7d"

# Facebook API
FACEBOOK_ACCESS_TOKEN="seu-facebook-token"
FACEBOOK_AD_ACCOUNT_ID="act_sua-conta-id"
FACEBOOK_APP_ID="seu-app-id"
FACEBOOK_APP_SECRET="seu-app-secret"

# Kiwify API
KIWIFY_CLIENT_ID="seu-kiwify-client-id"
KIWIFY_CLIENT_SECRET="seu-kiwify-client-secret"

# Ideogram API
IDEOGRAM_API_KEY="sua-ideogram-api-key"

# OpenAI (para chat NEXUS)
OPENAI_API_KEY="sua-openai-api-key"

# Admin User
ADMIN_EMAIL="alexvinitius@gmail.com"
ADMIN_PASSWORD="admin123456"
```

### Configuração dos Serviços Python

Os serviços ML e Scraper são configurados automaticamente via variáveis de ambiente no docker-compose.

## 🎮 Uso

### 1. Verificar Status dos Serviços

```bash
# Health check geral
curl http://localhost:3001/health

# Status da API
curl http://localhost:3001/api/status

# ML Service
curl http://localhost:8001/health

# Scraper Service
curl http://localhost:8002/health
```

### 2. Autenticação

```bash
# Registrar usuário
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123",
    "name": "Nome do Usuário"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }'
```

### 3. Usar APIs (com token JWT)

```bash
# Obter campanhas
curl -H "Authorization: Bearer SEU_JWT_TOKEN" \
  http://localhost:3001/api/campaigns

# Iniciar scraping
curl -X POST http://localhost:3001/api/scraping/scrape \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "traicao",
    "ad_type": "GREY",
    "max_results": 20
  }'

# Automação completa
curl -X POST http://localhost:3001/api/scraping/automation/complete \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "niche": "emagrecimento",
    "ad_type": "GREY",
    "investment": 500
  }'
```

## 📊 API Endpoints

### Autenticação (`/api/auth`)
- `POST /register` - Registrar usuário
- `POST /login` - Login
- `GET /profile` - Obter perfil
- `PUT /profile` - Atualizar perfil
- `PUT /api-config` - Configurar APIs
- `PUT /change-password` - Alterar senha
- `POST /logout` - Logout
- `GET /verify` - Verificar token

### Campanhas (`/api/campaigns`)
- `GET /` - Listar campanhas
- `POST /` - Criar campanha
- `GET /:id` - Obter campanha
- `PUT /:id` - Atualizar campanha
- `DELETE /:id` - Deletar campanha
- `PUT /:id/metrics` - Atualizar métricas
- `GET /:id/analytics` - Obter analytics

### Scraping (`/api/scraping`)
- `POST /scrape` - Iniciar scraping
- `GET /job/:jobId/status` - Status do job
- `GET /results` - Listar resultados
- `GET /results/:id` - Obter resultado
- `DELETE /results/:id` - Deletar resultado
- `POST /automation/complete` - Automação completa
- `GET /automation/:jobId/status` - Status automação
- `GET /automation/history` - Histórico

### Facebook API (`/api/facebook`)
- `GET /test` - Testar conexão
- `GET /campaigns` - Obter campanhas do Facebook
- `GET /ads` - Obter anúncios
- `POST /kiwify/oauth` - OAuth Kiwify
- `GET /ideogram/test` - Testar Ideogram

### ML Service (`http://localhost:8001`)
- `POST /predict` - Fazer predição
- `POST /train` - Treinar modelo
- `GET /models` - Listar modelos
- `GET /health` - Health check

### Scraper Service (`http://localhost:8002`)
- `POST /scrape` - Scraping de anúncios
- `GET /niches` - Listar nichos disponíveis
- `POST /analyze-competitor` - Analisar concorrente
- `GET /health` - Health check

## 📈 Monitoramento

### Logs

```bash
# Logs do backend
docker-compose logs -f backend

# Logs do ML service
docker-compose logs -f ml-service

# Logs do scraper service
docker-compose logs -f scraper-service

# Logs de todos os serviços
docker-compose logs -f
```

### Métricas

```bash
# Status das filas
curl http://localhost:3001/api/status

# Modelos ML disponíveis
curl http://localhost:8001/models

# Nichos de scraping disponíveis
curl http://localhost:8002/niches
```

### Health Checks

Todos os serviços possuem health checks configurados:

- Backend: `http://localhost:3001/health`
- ML Service: `http://localhost:8001/health`
- Scraper Service: `http://localhost:8002/health`

## 👨‍💻 Desenvolvimento

### Estrutura do Projeto

```
BACKEND_FODAO/
├── src/                    # Backend principal (Node.js)
│   ├── config/            # Configurações (DB, Redis, Logger)
│   ├── controllers/       # Controllers da API
│   ├── middleware/        # Middlewares (Auth, Error, Logging)
│   ├── routes/           # Rotas da API
│   ├── services/         # Serviços (Cache, Queue, Logger)
│   ├── types/            # Tipos TypeScript
│   └── server.ts         # Servidor principal
├── ml-service/           # Serviço ML (Python)
│   ├── main.py          # API FastAPI
│   ├── requirements.txt
│   └── Dockerfile
├── scraper-service/      # Serviço Scraping (Python)
│   ├── main.py          # API FastAPI + Playwright
│   ├── requirements.txt
│   └── Dockerfile
├── prisma/              # Schema do banco
├── scripts/             # Scripts de seed
└── docker-compose.yml   # Orquestração Docker
```

### Scripts Disponíveis

```bash
# Backend
npm run dev              # Desenvolvimento
npm run build           # Build para produção
npm run start           # Iniciar produção
npm run prisma:generate # Gerar cliente Prisma
npm run prisma:push     # Aplicar schema
npm run seed            # Popular banco

# Docker
npm run docker:build    # Build das imagens
npm run docker:up       # Subir serviços
npm run docker:down     # Parar serviços
```

### Adicionando Novos Endpoints

1. **Controller**: Crie em `src/controllers/`
2. **Route**: Adicione em `src/routes/`
3. **Types**: Defina em `src/types/`
4. **Middleware**: Se necessário, em `src/middleware/`

### Adicionando Novos Modelos ML

1. Edite `ml-service/main.py`
2. Adicione lógica de treinamento
3. Configure novos endpoints se necessário

## 🚀 Produção

### Build e Deploy

```bash
# Build das imagens
docker-compose build

# Deploy em produção
docker-compose -f docker-compose.yml up -d
```

### Configurações de Produção

1. **Environment**: Defina `NODE_ENV=production`
2. **SSL**: Configure certificados SSL
3. **Reverse Proxy**: Use nginx/caddy na frente
4. **Monitoramento**: Configure logs externos
5. **Backups**: Configure backup automático do PostgreSQL

### Exemplo nginx.conf

```nginx
server {
    listen 80;
    server_name api.nexusgaming.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🐛 Solução de Problemas

### Problemas Comuns

1. **Porta já em uso**: Altere as portas no docker-compose.yml
2. **Erro de permissão**: Execute com sudo ou configure Docker sem sudo
3. **Banco não conecta**: Verifique se PostgreSQL está rodando
4. **Browser scraper falha**: Instale dependências do Chrome

### Debug

```bash
# Logs detalhados
DEBUG=* npm run dev

# Logs específicos do scraper
docker-compose logs scraper-service

# Conectar no container
docker-compose exec backend sh
```

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte e dúvidas:
- Email: alexvinitius@gmail.com
- GitHub Issues: Use as issues do repositório

---

**🎮 Nexus Gaming Intelligence - Automatize seu marketing digital com IA!**
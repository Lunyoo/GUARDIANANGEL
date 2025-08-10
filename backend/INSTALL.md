# 🚀 INSTRUÇÕES DE INSTALAÇÃO COMPLETAS

## Pré-requisitos
Certifique-se de ter instalado:
- Node.js 18+
- Python 3.9+
- PostgreSQL 15+
- Redis 7+

## 🐳 OPÇÃO 1: Instalação com Docker (Recomendada)

```bash
# 1. Entrar no diretório
cd BACKEND_FODAO

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas credenciais reais

# 3. Dar permissão ao script
chmod +x install.sh

# 4. Executar instalação automática
./install.sh

# OU manualmente:
docker-compose up -d
```

## 🔧 OPÇÃO 2: Instalação Manual

```bash
# 1. Instalar dependências Node.js
cd BACKEND_FODAO
npm install

# 2. Configurar .env
cp .env.example .env
# Editar com suas credenciais

# 3. Configurar banco PostgreSQL
createdb nexus_gaming_db
npx prisma migrate deploy
npx prisma db seed

# 4. Instalar Python ML Service
cd ml-service
pip install -r requirements.txt
cd ..

# 5. Instalar Python Scraping
cd scraping-service
pip install -r requirements.txt
playwright install chromium
cd ..

# 6. Iniciar serviços (4 terminais)
Terminal 1: npm run dev           # API (porta 3001)
Terminal 2: python3 ml-service/main.py  # ML (porta 8000)
Terminal 3: redis-server          # Redis
Terminal 4: # PostgreSQL já rodando
```

## 🔑 Configuração de APIs (.env)

```bash
# Facebook Marketing API
FACEBOOK_ACCESS_TOKEN="EAAVVGCUptjwBP..." # Seu token real
FACEBOOK_AD_ACCOUNT_ID="act_1060618782717636"
FACEBOOK_APP_ID="1500937074619964"
FACEBOOK_APP_SECRET="a302627ce52f9222532e95b8c0c27397"

# Kiwify
KIWIFY_CLIENT_SECRET="7969fe7b268052a5cfe67c040a539a7a..."

# Ideogram AI
IDEOGRAM_API_KEY="VNRXO6_4G0Miln5ngDTQqQHwkKRwx..."

# OpenAI
OPENAI_API_KEY="sk-proj-rjjK4G9F9oBcbEsLgd..."

# Admin
ADMIN_EMAIL="alexvinitius@gmail.com"
```

## ✅ Verificação

Após instalação, acesse:
- API: http://localhost:3001/health
- ML: http://localhost:8000/health  
- Dashboard: http://localhost:3001/admin/queues

## 🎯 Primeiro Uso

1. **Registrar admin:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alexvinitius@gmail.com","password":"admin123","nome":"Alex"}'
```

2. **Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alexvinitius@gmail.com","password":"admin123"}'
```

3. **Testar automação:**
```bash
curl -X POST http://localhost:3001/api/automacao/start \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nicho":"fitness","tipoNicho":"GREY","investimento":500}'
```

## 🚨 Problemas Comuns

**Erro "permission denied":**
```bash
chmod +x install.sh
```

**PostgreSQL não conecta:**
```bash
sudo systemctl start postgresql
createdb nexus_gaming_db
```

**Redis não conecta:**
```bash
redis-server --daemonize yes
```

**Python dependencies fail:**
```bash
python3 -m pip install --upgrade pip
pip install -r requirements.txt
```

## 💪 BACKEND FODÃO PRONTO! 🚀
# 🚀 Início Rápido - Nexus Backend

## Passos para Rodar o Backend

### 1. Preparação
```bash
# 1.1. Entre na pasta do backend
cd backend

# 1.2. Configure suas APIs
cp .env.example .env
# Edite o arquivo .env com suas chaves de API
```

### 2. Executar (Escolha uma opção)

#### Opção A: Script Automático (Recomendado)
```bash
# Linux/Mac
./setup.sh

# Windows
setup.bat
```

#### Opção B: Docker Manual
```bash
# Construir e iniciar
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

#### Opção C: Instalação Local
```bash
# Backend
npm install
npm run prisma:push
npm run seed
npm run dev

# ML Service (terminal 2)
cd ml-service
pip install -r requirements.txt
python main.py

# Scraper Service (terminal 3)
cd scraper-service
pip install -r requirements.txt
python main.py
```

### 3. Testar
```bash
# Verifique se está funcionando
curl http://localhost:3001/health

# Ou abra no navegador:
# http://localhost:3001
```

### 4. URLs dos Serviços
- **Backend Principal**: http://localhost:3001
- **ML Service**: http://localhost:8001  
- **Scraper Service**: http://localhost:8002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 5. Login Inicial
- **Email**: alexvinitius@gmail.com
- **Senha**: admin123456 (ou o que definiu no .env)

---

## ⚙️ Configuração Essencial (.env)

Edite o arquivo `.env` com suas configurações:

```env
# 🔑 JWT (OBRIGATÓRIO - gere uma chave segura)
JWT_SECRET="sua-chave-jwt-super-segura-aqui-min-32-chars"

# 📘 Facebook API (OBRIGATÓRIO para funcionar)
FACEBOOK_ACCESS_TOKEN="EAAxxxxxxxxxxxxx"
FACEBOOK_AD_ACCOUNT_ID="act_xxxxxxxxxx"
FACEBOOK_APP_ID="xxxxxxxxxx"
FACEBOOK_APP_SECRET="xxxxxxxxxx"

# 🥝 Kiwify (opcional)
KIWIFY_CLIENT_ID="seu-client-id"
KIWIFY_CLIENT_SECRET="seu-client-secret"

# 🎨 Ideogram (opcional)
IDEOGRAM_API_KEY="sua-api-key"

# 🤖 OpenAI (opcional - para chat)
OPENAI_API_KEY="sk-xxxxxxxxxx"

# 👤 Admin (opcional - personalizar)
ADMIN_EMAIL="seuemail@gmail.com"
ADMIN_PASSWORD="suasenha123"
```

---

## 🧪 Testando a API

### Registrar usuário:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@email.com","password":"123456","name":"Teste"}'
```

### Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@email.com","password":"123456"}'
```

### Usar APIs (substitua SEU_TOKEN pelo token recebido no login):
```bash
# Ver campanhas
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://localhost:3001/api/campaigns

# Iniciar scraping
curl -X POST http://localhost:3001/api/scraping/scrape \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"niche":"traicao","ad_type":"GREY","max_results":10}'
```

---

## 🐛 Problemas Comuns

### "Porta já em uso"
```bash
# Parar serviços
docker-compose down

# Ou mudar portas no docker-compose.yml
```

### "Erro de conexão com banco"
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Recriar banco
docker-compose down -v
docker-compose up -d
```

### "Browser do scraper falha"
```bash
# Ver logs do scraper
docker-compose logs scraper-service

# Restartar apenas o scraper
docker-compose restart scraper-service
```

---

## 📚 Documentação Completa

Para documentação detalhada, veja o arquivo `README.md`.

---

**🎮 Nexus Gaming Intelligence está pronto!**
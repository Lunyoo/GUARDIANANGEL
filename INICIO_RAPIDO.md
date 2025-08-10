# 🚀 Início Rápido - Nexus Gaming Intelligence

## 📋OPENAI_API_KEY="sua_chave_openai_aqui"Visão Geral

Este projeto é uma **Plataforma de Inteligência de Marketing Digital** com duas partes:
- **Frontend** (Spark/Vite): Interface do usuário em React/TypeScript
- **Backend** (Node.js): API completa com banco PostgreSQL, Redis, ML e Scraping

---

## 🎯 Passos para Rodar Completo

### 1. 📁 Estrutura do Projeto
```
nexus-intelligence/
├── 📱 Frontend (Spark) - Interface web
├── 🔧 backend/ - API, Banco, ML e Scraping
└── 📝 Documentação
```

### 2. ⚙️ Preparação Inicial

#### 2.1. Configure suas APIs
```bash
# Entre na pasta do backend
cd backend

# Configure suas chaves de API
cp .env.example .env
# Edite o arquivo .env com suas configurações reais
```

#### 2.2. Configuração Essencial (.env)
Edite o arquivo `backend/.env` com suas configurações:

```env
# 🔑 JWT (OBRIGATÓRIO - gere uma chave segura)
JWT_SECRET="sua-chave-jwt-super-segura-aqui-min-32-chars"

# 📘 Facebook API (OBRIGATÓRIO para funcionar)
FACEBOOK_ACCESS_TOKEN="EAAVVGCUptjwBPOFUdoqhk9fFAZA3clvMhwcQSp44wmHNJlZCivwJ56I4TaSU2otIjC1LvWZCj2PmonK9ahak1BYgmNcZBMKhSjIIoGKwZBogwamnHGrlxb7yn5GUH0UzEm0SUgPIj0ZBTITAHZCnCvBxc0nhrdNopLzFhLRaAZAcQgaA4BGWZBeKOHYmCEnRSDmZCrdUTXO0CuBhhm6xZC6"
FACEBOOK_AD_ACCOUNT_ID="act_1060618782717636"
FACEBOOK_APP_ID="1500937074619964"
FACEBOOK_APP_SECRET="a302627ce52f9222532e95b8c0c27397"

# 🥝 Kiwify (opcional)
KIWIFY_CLIENT_ID="7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982"
KIWIFY_CLIENT_SECRET="sua-client-secret"

# 🎨 Ideogram (opcional)
IDEOGRAM_API_KEY="sua_chave_ideogram_aqui"

# 🤖 OpenAI (opcional - para chat IA)
OPENAI_API_KEY="sua_chave_openai_aqui"

# 👤 Admin (configure seu email como admin)
ADMIN_EMAIL="alexvinitius@gmail.com"
ADMIN_PASSWORD="admin123456"
```

### 3. 🚀 Executar (3 Opções)

#### Opção A: 🎯 Script Automático (RECOMENDADO)
```bash
cd backend

# Linux/Mac
./setup.sh

# Windows
setup.bat
```
**Isso instala tudo automaticamente!**

#### Opção B: 🐳 Docker Completo
```bash
cd backend

# Construir e iniciar tudo
docker-compose up -d

# Verificar se funcionou
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f
```

#### Opção C: 💻 Instalação Local
```bash
cd backend

# 1. Backend Principal
npm install
npm run prisma:push
npm run seed
npm run dev

# 2. ML Service (novo terminal)
cd ml-service
pip install -r requirements.txt
python main.py

# 3. Scraper Service (novo terminal)
cd scraper-service
pip install -r requirements.txt
python main.py
```

### 4. 🌐 Frontend (Spark)
```bash
# Na pasta raiz do projeto (não na pasta backend)
npm install
npm run dev
```

---

## 🔗 URLs dos Serviços

Após executar, você terá:

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **🎮 Frontend (Nexus)** | http://localhost:5173 | Interface principal |
| **🔧 Backend API** | http://localhost:3001 | API principal |
| **🤖 ML Service** | http://localhost:8001 | Inteligência artificial |
| **🕷️ Scraper Service** | http://localhost:8002 | Web scraping |
| **🗄️ PostgreSQL** | localhost:5432 | Banco de dados |
| **⚡ Redis** | localhost:6379 | Cache |

---

## 🔐 Login Inicial

1. Abra: http://localhost:5173
2. **Email**: `alexvinitius@gmail.com`
3. **Senha**: `admin123456` (ou o que definiu no .env)
4. Configure suas APIs nas Configurações

---

## 🧪 Testando a API

### Health Check:
```bash
curl http://localhost:3001/health
```

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
  -d '{"email":"alexvinitius@gmail.com","password":"admin123456"}'
```

### Usar APIs (substitua TOKEN pelo recebido no login):
```bash
# Ver campanhas do Facebook
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/facebook/campaigns

# Iniciar scraping inteligente
curl -X POST http://localhost:3001/api/scraping/start \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"niche":"infoproduto","type":"GREY","maxResults":20}'

# Previsão de ML
curl -X POST http://localhost:3001/api/ml/predict \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaign_name":"Teste","budget":100,"objective":"CONVERSIONS"}'
```

---

## 🐛 Problemas Comuns

### ❌ "Porta já em uso"
```bash
# Parar todos os serviços
cd backend
docker-compose down

# Ou alterar portas no docker-compose.yml
```

### ❌ "Erro de conexão com banco"
```bash
# Recriar completamente
cd backend
docker-compose down -v
docker-compose up -d

# Aguardar 30s para o banco subir
npm run prisma:push
npm run seed
```

### ❌ "Browser do scraper não abre"
```bash
# Ver logs detalhados
cd backend
docker-compose logs scraper-service

# Restartar só o scraper
docker-compose restart scraper-service
```

### ❌ "Frontend não carrega dados"
1. Verifique se o backend está rodando: http://localhost:3001/health
2. Confirme suas APIs do Facebook no arquivo `.env`
3. Faça login com: `alexvinitius@gmail.com`

### ❌ "Token Facebook inválido"
1. Vá ao [Facebook Developers](https://developers.facebook.com)
2. Gere um novo token de longa duração
3. Atualize `FACEBOOK_ACCESS_TOKEN` no `.env`
4. Reinicie o backend

---

## 📚 Recursos Avançados

### 🎯 Automação Completa NEXUS
- Investe dinheiro → IA encontra ofertas vencedoras → Cria produtos → Lança campanhas
- Acesse em: **Frontend > Automação Completa**

### 🧠 Intelligence Hub
- Scraping universal de anúncios
- Análise de ofertas com Machine Learning
- Acesse em: **Frontend > Intelligence Hub**

### 🤖 Chat NEXUS (IA Avançada)
- Conversa com IA que controla todo o sistema
- Pode modificar campanhas, análises e configurações
- Botão no canto superior direito da interface

### 📊 Piloto Automático
- IA autônoma que otimiza campanhas automaticamente
- Ativa/Desativa conforme necessário
- Sugestões inteligentes baseadas em performance

---

## 📁 Estrutura Completa

```
projeto/
├── 🎮 Frontend Nexus (Spark)
│   ├── src/App.tsx - Interface principal
│   ├── components/ - Componentes React
│   └── hooks/ - Lógica React
│
├── 🔧 backend/ - Backend completo
│   ├── src/ - Código Node.js/TypeScript
│   ├── prisma/ - Banco de dados
│   ├── ml-service/ - Python ML
│   ├── scraper-service/ - Python Scraping
│   └── docker-compose.yml - Orquestração
│
└── 📝 Documentação
    ├── INICIO_RAPIDO.md (este arquivo)
    ├── README.md - Documentação detalhada
    └── PRD.md - Especificação técnica
```

---

## 🎯 Próximos Passos

1. ✅ Execute o projeto (Opção A recomendada)
2. ✅ Faça login no sistema
3. ✅ Configure suas APIs nas Configurações
4. ✅ Teste o Intelligence Hub
5. ✅ Use a Automação Completa NEXUS
6. ✅ Converse com o Chat NEXUS

---

**🎮 Seu Nexus Gaming Intelligence está pronto para dominar o marketing digital!**

*Qualquer dúvida, consulte os logs ou a documentação completa.*
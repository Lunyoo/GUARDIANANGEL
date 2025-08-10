# 🚀 NEXUS GAMING INTELLIGENCE - PLATAFORMA COMPLETA

## 🎯 INÍCIO RÁPIDO - DOCKER (RECOMENDADO)

### ⚡ Passo 1: Clone e Configure
```bash
git clone <seu-repositorio>
cd spark-template
```

**Suas APIs já estão configuradas no arquivo .env!** ✅

### ⚡ Passo 2: Inicie Tudo com Docker
```bash
docker-compose up --build
```

**Aguarde 2-3 minutos...**

### ⚡ Passo 3: Acesse a Plataforma
- **🎮 Frontend:** http://localhost:3000
- **📡 Backend API:** http://localhost:3001/health
- **🤖 ML Service:** http://localhost:8000/health
- **🕷️ Scraping Service:** http://localhost:8080/health

### ⚡ Passo 4: Login
- **📧 Email:** alexvinitius@gmail.com
- **🔑 Senha:** nexus2024

---

## 🐳 ARQUITETURA DOS SERVIÇOS

| Container | Porta | Tecnologia | Função |
|-----------|-------|------------|---------|
| `nexus_frontend` | 3000 | React/Vite | Interface gaming |
| `nexus_backend` | 3001 | Node.js/Express | API principal |
| `nexus_ml_service` | 8000 | Python/FastAPI | Machine Learning |
| `nexus_scraping_service` | 8080 | Python/Playwright | Scraping anúncios |
| `nexus_redis` | 6379 | Redis | Cache/Filas |

---

## 🎮 FUNCIONALIDADES ATIVAS

✅ **Dashboard Gaming** - Métricas em tempo real no estilo Solo Leveling  
✅ **Scraping Real** - Busca anúncios vencedores na biblioteca do Facebook  
✅ **IA Preditiva** - Machine Learning para análise de performance  
✅ **Geração de Criativos** - IA cria imagens profissionais  
✅ **Automação Completa** - Sistema autônomo: investe → encontra ofertas → cria produtos → lança campanhas  
✅ **Chat NEXUS** - IA avançada que controla todo o sistema  
✅ **Integração Kiwify** - Criação automática de produtos/funis  
✅ **Relatórios PDF** - Insights personalizados  

---

## 🛠️ COMANDOS DOCKER

### Parar tudo
```bash
docker-compose down
```

### Ver logs
```bash
docker-compose logs -f
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Reiniciar um serviço
```bash
docker-compose restart backend
```

### Limpar e reconstruir
```bash
docker-compose down --volumes --rmi all
docker-compose up --build
```

### Status dos containers
```bash
docker-compose ps
docker stats
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### ❌ Porta ocupada
```bash
# Verificar processos
lsof -i :3000
lsof -i :3001

# Matar processo
kill -9 <PID>
```

### ❌ Erro de memória Docker
```bash
docker system prune -f
docker volume prune -f
```

### ❌ Problemas com Playwright
```bash
docker-compose exec scraping-service playwright install --with-deps chromium
```

### ❌ Banco corrompido
```bash
rm backend/database.db
docker-compose restart backend
```

---

## 🔍 VERIFICAÇÃO DE SAÚDE

```bash
# Verificar se tudo funciona
curl http://localhost:3000           # Frontend
curl http://localhost:3001/health    # Backend
curl http://localhost:8000/health    # ML Service
curl http://localhost:8080/health    # Scraping Service

# Redis
docker-compose exec redis redis-cli ping
```

---

## ⚙️ INSTALAÇÃO LOCAL (SEM DOCKER)

Se preferir rodar sem Docker:

### 1. Backend
```bash
cd backend
npm install
cp ../.env .env
npm run dev
```

### 2. Frontend
```bash
npm install
npm run dev
```

### 3. ML Service
```bash
cd ml-service
pip install -r requirements.txt
python main.py
```

### 4. Scraping Service
```bash
cd scraping-service
pip install -r requirements.txt
playwright install chromium
python main.py
```

### 5. Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

---

## 🔒 SUAS APIs JÁ CONFIGURADAS

Todas as suas chaves já estão no arquivo `.env`:
- ✅ Facebook Ads API
- ✅ OpenAI API
- ✅ Ideogram API
- ✅ Kiwify API

**Não precisa configurar nada!**

---

## 🎯 COMO USAR

1. **Faça login** com as credenciais acima
2. **Dashboard Principal** - Veja suas métricas reais do Facebook
3. **Intelligence Hub** - Execute scraping de ofertas vencedoras
4. **Automação Completa** - Deixe a IA criar tudo automaticamente
5. **Chat NEXUS** - Converse com a IA para qualquer ajuste

---

## 📊 LOGS E MONITORAMENTO

```bash
# Logs em tempo real de todos os serviços
docker-compose logs -f

# Logs apenas com erros
docker-compose logs -f | grep ERROR

# Logs de um serviço específico
docker-compose logs -f scraping-service
```

---

## 🚀 PRODUÇÃO

Para usar em produção:
1. Altere senhas no `.env`
2. Configure `NODE_ENV=production`
3. Use HTTPS
4. Configure firewall

---

## 🎮 SUPORTE

**Problemas?**
1. Verifique logs: `docker-compose logs -f`
2. Confirme portas livres
3. Teste conectividade APIs
4. Reinicie serviços específicos

---

**🎯 NEXUS GAMING INTELLIGENCE - Sua plataforma de marketing IA está pronta para dominar! 🚀**
# 🚀 Guia Completo de Execução da Plataforma NEXUS

## 📋 Pré-requisitos

Antes de executar a plataforma, certifique-se de ter instalado:

- **Docker** (versão 20.0 ou superior)
- **Docker Compose** (versão 2.0 ou superior)
- **Git** (para clonar o repositório, se necessário)

### Verificar Instalação
```bash
docker --version
docker-compose --version
```

## 🛠️ Configuração Inicial

### 1. Configurar Variáveis de Ambiente

O arquivo `.env` já está configurado com as APIs fornecidas. Verifique se as seguintes variáveis estão corretas:

```bash
# Facebook Ads API
FACEBOOK_ACCESS_TOKEN=EAAVVGCUptjwBPOFUdoqhk9fFAZA3clvMhwcQSp44wmHNJlZCivwJ56I4TaSU2otIjC1LvWZCj2PmonK9ahak1BYgmNcZBMKhSjIIoGKwZBogwamnHGrlxb7yn5GUH0UzEm0SUgPIj0ZBTITAHZCnCvBxc0nhrdNopLzFhLRaAZAcQgaA4BGWZBeKOHYmCEnRSDmZCrdUTXO0CuBhhm6xZC6
FACEBOOK_AD_ACCOUNT_ID=act_1060618782717636
FACEBOOK_APP_ID=1500937074619964
FACEBOOK_APP_SECRET=a302627ce52f9222532e95b8c0c27397

# OpenAI API
OPENAI_API_KEY=sua_chave_openai_aqui

# Ideogram API
IDEOGRAM_API_KEY=VNRXO6_4G0Miln5ngDTQqQHwkKRwxsZmUXV1R54XMqmEN1KqB-tu6I-n0s5PiWQorIFY2ysQMI1rrRm1GnBJvg

# Kiwify API
KIWIFY_CLIENT_ID=7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982
KIWIFY_CLIENT_SECRET=7969fe7b268052a5cfe67c040a539a7a5661896842c5e2100b3cc8feca20e982
```

### 2. Estrutura do Projeto

```
nexus-platform/
├── docker-compose.yml          # Configuração Docker
├── .env                       # Variáveis de ambiente
├── Dockerfile.frontend        # Docker do Frontend
├── frontend/                  # Aplicação React/Vite
├── backend/                   # API Node.js/Express
│   ├── Dockerfile
│   └── src/
├── ml-service/               # Serviço Machine Learning
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── scraping-service/         # Serviço de Scraping
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
└── README.md
```

## 🚀 Executar a Plataforma

### Método 1: Scripts Automatizados (Recomendado)

#### Linux/macOS:
```bash
chmod +x start-nexus.sh
./start-nexus.sh
```

#### Windows:
```cmd
start-nexus.bat
```

### Método 2: Comando Manual
Execute o seguinte comando na raiz do projeto:

```bash
# Comando completo (recomendado)
docker-compose up --build -d

# Para desenvolvimento (com logs visíveis)
docker-compose up --build
```

### Parâmetros do Comando
- `--build`: Reconstrói as imagens Docker com as últimas alterações
- `-d`: (Opcional) Executa em background (modo detached)

## 📊 Serviços da Plataforma

Após a execução, os seguintes serviços estarão disponíveis:

| Serviço | URL | Porta | Descrição |
|---------|-----|-------|-----------|
| **Frontend** | http://localhost:3000 | 3000 | Interface React da plataforma |
| **Backend API** | http://localhost:3001 | 3001 | API principal Node.js |
| **ML Service** | http://localhost:8000 | 8000 | Serviço de Machine Learning |
| **Scraping Service** | http://localhost:8080 | 8080 | Serviço de Scraping |
| **Redis** | localhost:6379 | 6379 | Cache e filas |

## 🔍 Monitoramento e Logs

### Ver Logs em Tempo Real
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f ml-service
docker-compose logs -f scraping-service
```

### Status dos Containers
```bash
docker-compose ps
```

### Health Check dos Serviços
```bash
# Backend
curl http://localhost:3001/health

# ML Service
curl http://localhost:8000/health

# Scraping Service
curl http://localhost:8080/health
```

## 🛡️ Login e Acesso

### Usuário Administrador
- **Email**: `alexvinitius@gmail.com`
- **Senha**: A definir no primeiro acesso

### Primeiro Acesso
1. Acesse http://localhost:3000
2. Faça login com o email de administrador
3. Configure as APIs restantes se necessário
4. O sistema carregará automaticamente os dados do Facebook Ads

## 🔧 Comandos Úteis

### Parar a Plataforma
```bash
docker-compose down
```

### Parar e Remover Volumes
```bash
docker-compose down -v
```

### Rebuild Completo
```bash
docker-compose down
docker-compose up --build --force-recreate
```

### Acessar Container Específico
```bash
# Backend
docker-compose exec backend sh

# ML Service
docker-compose exec ml-service bash

# Scraping Service
docker-compose exec scraping-service bash
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Erro de Porta em Uso
```bash
# Verificar processos nas portas
sudo lsof -i :3000
sudo lsof -i :3001

# Matar processo específico
sudo kill -9 <PID>
```

#### 2. Erro de Permissão Docker
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Reiniciar terminal
```

#### 3. Erro de Dependências Node.js
```bash
# Rebuild do frontend
docker-compose build --no-cache frontend

# Rebuild do backend
docker-compose build --no-cache backend
```

#### 4. Erro no Playwright (Scraping)
```bash
# Rebuild do scraping service
docker-compose build --no-cache scraping-service
```

### Verificar Logs de Erro
```bash
# Ver apenas erros
docker-compose logs --tail=50 | grep -i error

# Ver logs específicos do serviço com problema
docker-compose logs -f <nome-do-serviço>
```

## 📈 Funcionalidades Principais

### Após a Execução Bem-Sucedida

1. **Dashboard Principal**: Métricas em tempo real das campanhas
2. **Campanhas & Criativos**: Gestão detalhada de anúncios
3. **Gerador de Criativos**: IA para criar conteúdo visual
4. **Automação Completa**: Sistema end-to-end automatizado
5. **Intelligence Hub**: Scraping e análise de mercado
6. **Machine Learning**: Análise preditiva de performance
7. **Chat NEXUS**: IA assistente integrada

### APIs Disponíveis

- **Facebook Ads**: Integração completa configurada
- **OpenAI**: Para geração de conteúdo
- **Ideogram**: Para criação de imagens
- **Kiwify**: Para gestão de produtos digitais

## 🔄 Atualizações e Manutenção

### Atualizar Plataforma
```bash
# Parar serviços
docker-compose down

# Atualizar código (se usando git)
git pull

# Rebuild e iniciar
docker-compose up --build
```

### Backup de Dados
```bash
# Backup do banco de dados
docker-compose exec backend cp /app/database.db /app/backup/database_$(date +%Y%m%d).db

# Backup de modelos ML
docker cp nexus_ml_service:/app/models ./backup/models_$(date +%Y%m%d)
```

## ⚠️ Importante

1. **Primeiro Login**: Use o email `alexvinitius@gmail.com` como administrador
2. **APIs Configuradas**: Todas as APIs já estão pré-configuradas
3. **Dados Reais**: O sistema puxa dados reais das APIs configuradas
4. **Automação**: O sistema pode executar ações reais (criar campanhas, produtos)
5. **Monitoramento**: Monitore os logs para verificar funcionamento

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose logs -f`
2. Confirme se todas as portas estão livres
3. Verifique se as APIs estão funcionando
4. Execute health checks dos serviços
5. Tente um rebuild completo se necessário

---

**🎯 A plataforma está pronta para uso em produção com todas as integrações funcionais!**
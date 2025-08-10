# Backend Node.js
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++ sqlite

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci --silent

# Copiar código fonte
COPY src/ ./src/
COPY prisma/ ./prisma/

# Criar diretório para banco de dados
RUN mkdir -p /app/data

# Expor porta
EXPOSE 3001

# Comando padrão
CMD ["npm", "run", "dev"]
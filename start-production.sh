#!/bin/bash

# Script de produção otimizado para VPS
# Reduz uso de CPU e memória

echo "🚀 Iniciando Guardian Angel em modo produção otimizado..."

# Configurações de ambiente para produção
export NODE_ENV=production
export PORT=3001
export AUTO_DB=1
export DATABASE_URL=file:./backend/prisma/neural_system.db
export JWT_SECRET=${JWT_SECRET:-prodsecret}
export ADMIN_EMAIL=${ADMIN_EMAIL:-admin@test.com}

# Otimizações de CPU/Memória
export NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"
export WA_HEADLESS=true

# Desabilitar features pesadas em VPS pequena (opcional)
# export ALLOCATOR_AUTO=false
# export ALLOCATOR_AUTO_ENROLL_CRON=false

echo "📦 Construindo frontend..."
npm run build

echo "📦 Construindo backend..."
cd backend && npm run build && cd ..

echo "🎯 Servindo aplicação em modo produção..."
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"

# Inicia backend em produção
cd backend && npm start &
BACKEND_PID=$!

# Aguarda backend inicializar
sleep 5

# Serve frontend estático via servidor simples
cd .. && npx serve dist -l 3000 &
FRONTEND_PID=$!

echo "✅ Aplicação rodando!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Cleanup function
cleanup() {
    echo "🛑 Parando aplicação..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Aguarda
wait

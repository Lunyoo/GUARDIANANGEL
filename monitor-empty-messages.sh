#!/bin/bash

# 🧪 MONITOR PARA TESTE DE MENSAGENS VAZIAS
# 
# Este script monitora os logs do backend em tempo real
# Para testar:
# 1. Execute este script
# 2. Envie uma mensagem VAZIA para o WhatsApp
# 3. Observe se a validação funciona nos logs

echo "🔍 === MONITOR DE MENSAGENS VAZIAS ==="
echo ""
echo "📞 COMO TESTAR:"
echo "   1. Deixe este monitor rodando"
echo "   2. Abra o WhatsApp Web (que já está conectado)"
echo "   3. Envie uma mensagem VAZIA (apenas espaços ou Enter)"
echo "   4. Observe os logs aqui"
echo ""
echo "✅ BACKEND STATUS: $(curl -s http://localhost:3001/health | jq -r .status)"
echo "⏰ MONITORANDO LOGS..."
echo "=========================================="
echo ""

# Monitorar task do backend em tempo real
cd /home/alex/GUARDIANANGEL

# Função para filtrar logs relevantes
filter_relevant_logs() {
    grep -E "(ENTRADA processConversationMessage|💬 UserMessage|🚨.*VAZIA|🔄 Usando fallback|GPT RESPOSTA RAW|RESPOSTA VAZIA DETECTADA|processInbound|BRIDGE.*MENSAGEM)" --line-buffered --color=always
}

echo "🎯 Aguardando mensagens..."

# Se o log file existir, monitorar ele
if [ -f "backend/logs/combined.log" ]; then
    echo "📁 Monitorando: backend/logs/combined.log"
    tail -f backend/logs/combined.log | filter_relevant_logs
else
    echo "📁 Log file não encontrado, monitorando task output..."
    # Como fallback, mostrar instruções
    echo ""
    echo "⚠️  Para ver os logs em tempo real:"
    echo "   - Abra outro terminal"
    echo "   - Execute: cd /home/alex/GUARDIANANGEL"
    echo "   - Execute: npm run --prefix backend dev"
    echo ""
    echo "📱 TESTE AGORA:"
    echo "   1. Abra WhatsApp Web"
    echo "   2. Envie mensagem vazia: '   ' (só espaços)"
    echo "   3. Envie mensagem: '' (vazia)"
    echo "   4. Observe os logs no terminal do backend"
    echo ""
    
    # Monitorar via curl se o backend responder com logs
    while true; do
        sleep 2
        echo -n "."
    done
fi

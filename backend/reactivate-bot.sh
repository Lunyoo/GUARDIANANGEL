#!/bin/bash

# 🛡️ SCRIPT PARA DESATIVAR MODO DE MANUTENÇÃO SEGURO
# Uso: ./reactivate-bot.sh

echo "🔍 Verificando status atual..."

if [ -f "MAINTENANCE_MODE" ]; then
    echo "🚨 Modo de manutenção ATIVO detectado"
    echo "📋 Conteúdo atual:"
    cat MAINTENANCE_MODE
    echo ""
    
    echo "⚠️  CONFIRMAÇÃO NECESSÁRIA:"
    echo "   As correções de preço foram aplicadas?"
    echo "   O sistema está pronto para voltar ao ar?"
    echo ""
    read -p "Desativar modo de manutenção? (sim/NAO): " confirmation
    
    if [ "$confirmation" = "sim" ]; then
        # Criar backup do arquivo
        cp MAINTENANCE_MODE MAINTENANCE_MODE.backup.$(date +%Y%m%d_%H%M%S)
        
        # Desativar modo de manutenção
        echo "MAINTENANCE_ACTIVE=false" > MAINTENANCE_MODE
        echo "REASON=Sistema reativado" >> MAINTENANCE_MODE
        echo "TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)" >> MAINTENANCE_MODE
        
        echo "✅ Modo de manutenção DESATIVADO!"
        echo "🚀 Bot voltará a enviar mensagens normalmente"
        echo "📊 Monitoramento será retomado"
    else
        echo "❌ Operação cancelada - modo de manutenção mantido"
    fi
else
    echo "✅ Modo de manutenção NÃO está ativo"
    echo "🚀 Bot está operando normalmente"
fi

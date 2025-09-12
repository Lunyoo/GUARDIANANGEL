# 🚀 MELHORIAS CRÍTICAS NO FLUXO DE CONVERSA - GUARDIANANGEL

## 🎯 **MELHORIAS NO PROMPT-CABEÇA (Mais Urgentes)**

### 1. **DETECÇÃO DE URGÊNCIA E ABANDONO INTELIGENTE**
```typescript
// No prompt-cabeça:
`
🚨 DETECTAR SINAIS DE URGÊNCIA:
- "preciso urgente" → priorizar entrega rápida  
- "para amanhã" → focar em COD se disponível
- "evento/festa" → enfatizar prazo de entrega

⚠️ SINAIS PARA ABANDONAR CONVERSA:
- Cliente disse "não quero", "não tenho interesse", "não preciso"
- Cliente não responde por mais de 3 mensagens seguidas
- Cliente fala claramente "pare de me mandar mensagem"
- Cliente demonstra irritação clara

RESPOSTAS POR URGÊNCIA:
- Alta: "Entendo a urgência! Vou te ajudar rapidinho..."
- Média: "Vou te ajudar com sua calcinha modeladora..."
- Baixa: "Posso te ajudar com nossa calcinha ShapeFit..."
`
```

### 2. **RECONHECIMENTO DE DESISTÊNCIA**
```typescript
// Adicionar sistema de abandono inteligente:
`
🛑 QUANDO PARAR DE INSISTIR:
- "não quero" = PARAR IMEDIATAMENTE
- "não tenho dinheiro" = oferecer condição especial UMA VEZ, depois parar
- "vou pensar" = dar espaço, follow-up em 2 horas MAX
- "não é pra mim" = perguntar se é presente, se não, PARAR
- Sem resposta há 20+ minutos = follow-up único, depois abandonar

FRASES PARA ENCERRAR EDUCADAMENTE:
- "Tudo bem! Qualquer coisa, estou aqui! 😊"  
- "Sem problemas! Se mudar de ideia, me chama! 💖"
- "Entendo! Estarei aqui se precisar! ✨"
`
```

### 3. **OBJEÇÕES E RESPEITO AOS PREÇOS ML**
```typescript
// Adicionar tratamento automático:
`
🛡️ TRATAMENTO DE OBJEÇÕES COMUNS:
- "muito caro" → "Entendo! É um investimento na sua autoestima. Quer que eu explique os benefícios?"
- "não tenho certeza" → "Normal! Que dúvida específica posso esclarecer?"
- "vou pensar" → "Claro! Que tal eu te mando mais informações?"
- "não é pra mim" → "Ah, é presente? Ou você quer mais detalhes primeiro?"

⚠️ REGRA CRÍTICA DOS PREÇOS:
- JAMAIS inventar preços
- SEMPRE usar o preço injetado pelo ML: ${precoML}
- NUNCA oferecer desconto sem autorização do sistema
- Se cliente questiona preço, explicar VALOR/BENEFÍCIOS, não baixar preço

NUNCA INSISTIR AGRESSIVAMENTE - RESPEITAR O "NÃO"
`
```

## 🤖 **MELHORIAS FORA DO PROMPT-CABEÇA**

### 4. **SISTEMA DE FOLLOW-UP RESPEITOSO COM ABANDONO**
```typescript
// Implementar sistema de acompanhamento com limite
async function scheduleIntelligentFollowUp(phone: string, behavior: string, context: any) {
  const followUpStrategies = {
    'photo_request': {
      delay: 30 * 60 * 1000, // 30 min
      message: "Oi! Conseguiu ver as fotos? Alguma dúvida? 📸",
      maxAttempts: 1
    },
    'price_objection': {
      delay: 2 * 60 * 60 * 1000, // 2 horas
      message: "Oi! Se mudou de ideia sobre a calcinha, estou aqui! �",
      maxAttempts: 1
    },
    'abandoned_after_interest': {
      delay: 60 * 60 * 1000, // 1 hora
      message: "Oi! Ainda posso te ajudar com a calcinha? 🛍️",
      maxAttempts: 1
    },
    'size_doubt': {
      delay: 45 * 60 * 1000, // 45 min  
      message: "Oi! Sobre o tamanho, posso te dar uma dica! 📏",
      maxAttempts: 1
    }
  }
  
  const strategy = followUpStrategies[behavior]
  if (strategy) {
    // Verificar se já tentou o máximo de vezes
    const attempts = await getFollowUpAttempts(phone, behavior)
    if (attempts >= strategy.maxAttempts) {
      console.log(`🛑 Máximo de follow-ups atingido para ${phone}: ${behavior}`)
      return
    }
    
    setTimeout(async () => {
      const isStillActive = await checkIfConversationActive(phone)
      const customerWantsContact = await checkIfCustomerAcceptsContact(phone)
      
      if (!isStillActive && customerWantsContact) {
        await sendWhatsAppMessage(phone, strategy.message)
        await incrementFollowUpAttempts(phone, behavior)
        console.log(`🔄 Follow-up enviado para ${phone}: ${behavior}`)
      } else if (!customerWantsContact) {
        console.log(`🛑 Cliente ${phone} não quer mais contato`)
      }
    }, strategy.delay)
  }
}
```

### 5. **SISTEMA DE COOLDOWN INTELIGENTE**
```typescript
// Evitar spam e melhorar experiência
class ConversationCooldown {
  private static cooldowns = new Map<string, number>()
  
  static shouldSendMessage(phone: string): boolean {
    const lastMessage = this.cooldowns.get(phone) || 0
    const now = Date.now()
    const cooldownTime = 2 * 60 * 1000 // 2 minutos
    
    if (now - lastMessage < cooldownTime) {
      console.log(`⏳ Cooldown ativo para ${phone} - aguardando`)
      return false
    }
    
    this.cooldowns.set(phone, now)
    return true
  }
  
  static getTimeRemaining(phone: string): number {
    const lastMessage = this.cooldowns.get(phone) || 0
    const now = Date.now()
    const cooldownTime = 2 * 60 * 1000
    return Math.max(0, cooldownTime - (now - lastMessage))
  }
}
```

### 5. **DETECÇÃO DE ABANDONO E RECUPERAÇÃO RESPEITOSA**
```typescript
// Sistema para detectar quando cliente abandona
async function detectAndRecoverAbandonment(phone: string, conversationHistory: any[]) {
  const lastMessage = conversationHistory[conversationHistory.length - 1]
  const timeSinceLastMessage = Date.now() - new Date(lastMessage.timestamp).getTime()
  
  // Verificar sinais de desistência
  const hasRejection = conversationHistory.some(msg => 
    msg.content.toLowerCase().includes('não quero') ||
    msg.content.toLowerCase().includes('não tenho interesse') ||
    msg.content.toLowerCase().includes('pare') ||
    msg.content.toLowerCase().includes('chato')
  )
  
  if (hasRejection) {
    console.log(`🛑 Cliente ${phone} demonstrou desinteresse - não fazer follow-up`)
    await markCustomerAsUninterested(phone)
    return
  }
  
  // Se passou mais de 3 horas sem resposta - APENAS 1 tentativa
  if (timeSinceLastMessage > 3 * 60 * 60 * 1000) {
    const alreadyTriedRecovery = await checkRecoveryAttempt(phone)
    
    if (!alreadyTriedRecovery) {
      const conversationStage = detectConversationStage(conversationHistory)
      
      let recoveryMessage = ''
      
      switch (conversationStage) {
        case 'interested_but_no_data':
          recoveryMessage = "Oi! Se ainda tiver interesse na calcinha, me chama! 😊"
          break
        case 'provided_data_no_confirmation':
          recoveryMessage = "Oi! Seus dados estão aqui. Se quiser finalizar, me avisa! 📝"
          break
        default:
          recoveryMessage = "Oi! Se precisar de alguma coisa, me chama! 😊"
      }
      
      await sendWhatsAppMessage(phone, recoveryMessage)
      await markRecoveryAttempted(phone)
      console.log(`🔄 Recovery message enviada para ${phone} - não tentará novamente`)
    }
  }
}
```

### 7. **MÉTRICAS E ANALYTICS EM TEMPO REAL**
```typescript
// Sistema para monitorar performance da conversa
class ConversationAnalytics {
  static trackConversationFlow(phone: string, stage: string, action: string) {
    const analytics = {
      phone,
      stage,
      action,
      timestamp: new Date().toISOString(),
      sessionId: `session_${phone}_${Date.now()}`
    }
    
    // Salvar no banco para dashboard
    saveAnalytics(analytics)
    
    // Métricas em tempo real
    this.updateMetrics(stage, action)
  }
  
  static updateMetrics(stage: string, action: string) {
    const metrics = getMetrics()
    
    // Incrementar contadores
    metrics[`${stage}_${action}`] = (metrics[`${stage}_${action}`] || 0) + 1
    
    // Calcular taxas de conversão
    if (stage === 'data_collection' && action === 'completed') {
      metrics.data_collection_rate = metrics.data_collection_completed / metrics.data_collection_started
    }
    
    if (stage === 'sale' && action === 'confirmed') {
      metrics.conversion_rate = metrics.sale_confirmed / metrics.conversation_started
    }
    
    updateMetrics(metrics)
  }
}
```

### 8. **PERSONALIZAÇÃO DINÂMICA DO DISCURSO**
```typescript
// Adaptar discurso baseado no perfil do cliente
function getPersonalizedTone(phone: string, conversationHistory: any[]): string {
  const clientProfile = analyzeClientProfile(conversationHistory)
  
  if (clientProfile.writingStyle === 'formal') {
    return 'formal_respeitoso'
  } else if (clientProfile.writingStyle === 'casual') {
    return 'descontraido_amigavel'
  } else if (clientProfile.responseSpeed === 'fast') {
    return 'direto_objetivo'
  } else if (clientProfile.responseSpeed === 'slow') {
    return 'paciencia_detalhado'
  }
  
  return 'equilibrado_natural'
}

// Adicionar ao prompt-cabeça:
const dynamicTone = getPersonalizedTone(phone, conversationHistory)
`TOM PERSONALIZADO: ${dynamicTone} - Adapte suas respostas a este perfil`
```

### 6. **VALIDAÇÃO EM TEMPO REAL COM PREÇOS ML**
```typescript
// Validar resposta antes de enviar
async function validateResponseBeforeSending(response: string, context: any): Promise<string> {
  // Verificar se menciona link sem ter dados completos
  if (response.includes('link') && !context.hasCompleteData) {
    return response.replace(/link de pagamento/g, 'formulário de pedido')
  }
  
  // CRITICAL: Verificar se inventou preços
  const pricePattern = /R\$\s*\d+[,.]?\d*/g
  const mentionedPrices = response.match(pricePattern) || []
  const authorizedPrice = context.mlPrice // Preço vindo do ML
  
  for (const price of mentionedPrices) {
    if (!price.includes(authorizedPrice)) {
      console.error(`🚨 BOT TENTOU INVENTAR PREÇO: ${price} (autorizado: ${authorizedPrice})`)
      // Remover preços não autorizados
      response = response.replace(pricePattern, authorizedPrice)
    }
  }
  
  // Verificar se está sendo muito insistente
  if (response.includes('urgente') && context.insistenceCount > 2) {
    return "Tudo bem! Se mudar de ideia, me chama! 😊"
  }
  
  // Verificar se está repetindo informações
  if (context.lastResponses.includes(response.substring(0, 50))) {
    return "Posso esclarecer alguma dúvida específica? 😊"
  }
  
  return response
}
```

### 10. **CONTEXTO DE CONCORRÊNCIA E MERCADO**
```typescript
// Adicionar ao prompt-cabeça conhecimento sobre concorrência
const marketContext = `
💰 CONTEXTO DE MERCADO:
- Principais concorrentes: [listar principais marcas]
- Nosso diferencial: Qualidade premium + entrega rápida
- Preço médio do mercado: R$ 70-120
- Nossa vantagem: COD em ${codCities.length} cidades

🎯 USO ESTRATÉGICO:
- Se cliente menciona preço de concorrente: "Entendo! Nosso preço reflete a qualidade premium e a garantia."
- Se cliente compara: "Ótima pergunta! O que mais te preocupa na hora de escolher?"
- Se cliente tem dúvida: "Posso te explicar por que investimos tanto na qualidade..."
`
```

## 🎯 **IMPLEMENTAÇÃO PRIORITÁRIA:**

### **ALTA PRIORIDADE (Implementar primeiro):**
1. ✅ Sistema de abandono inteligente (reconhecer quando parar)
2. ✅ Validação de preços ML (nunca inventar preços)  
3. ✅ Objeções respeitosas no prompt
4. ✅ Follow-up com limite máximo

### **MÉDIA PRIORIDADE:**
5. ✅ Detecção de sinais de desistência
6. ✅ Recovery com máximo 1 tentativa
7. ✅ Cooldown inteligente
8. ✅ Analytics básicas

## 🎪 **EXEMPLO DE PROMPT-CABEÇA MELHORADO:**

```
Você é Amanda, especialista em calcinha modeladora ShapeFit Premium.

 PREÇO FIXO (NUNCA MUDAR): ${precoML} 
🏙️ CLIENTE EM: ${city} - ${deliveryInfo}
� ESTRATÉGIA ATIVA: ${activeStrategy}

� QUANDO PARAR DE INSISTIR:
- Cliente disse "não quero", "não tenho interesse", "não preciso" = PARAR IMEDIATAMENTE
- Cliente não responde por 3+ mensagens = PARAR
- Cliente demonstra irritação = PARAR EDUCADAMENTE
- "Vou pensar" = dar espaço, follow-up ÚNICO em 2h

🛡️ TRATAMENTO DE OBJEÇÕES:
- "muito caro" → "Entendo! É um investimento na sua autoestima. Quer que eu explique os benefícios?"
- "não tenho certeza" → "Normal! Que dúvida específica posso esclarecer?" 
- "vou pensar" → "Claro! Estarei aqui se precisar! 😊"

⚠️ REGRAS CRÍTICAS:
- JAMAIS inventar preços - usar APENAS: ${precoML}
- NUNCA mencionar "link" antes de dados completos
- RESPEITAR o "não" do cliente
- APENAS 1 produto: calcinha modeladora ShapeFit Premium

🎯 PRÓXIMO PASSO: ${nextStep}

Seja natural, empática e respeitosa! 💖
```

---

**Total de melhorias focadas: 6 críticas**
**Foco: Respeitoso + Preços corretos + Abandono inteligente**

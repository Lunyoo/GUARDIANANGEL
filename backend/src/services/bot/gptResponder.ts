export async function generateBotReply(_conversationId: string, prompt: string, options?: any) {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)
  if (!hasOpenAI) {
    // Fallback heurístico quando não há chave
    const lower = (prompt || '').toLowerCase()
    if (/pre[çc]o|valor|quanto/.test(lower)) return 'Temos promoção hoje: 1 unidade por R$ 119,90 ou 2 por R$ 169,90. Qual prefere?'
    if (/oi|ol[aá]|bom dia|boa tarde|boa noite/.test(lower)) return 'Oi! Me diz sua cidade e tamanho (P,M,G,GG) para eu te indicar certinho.'
    return 'Me conta sua cidade e tamanho para eu te passar os valores mais indicados.'
  }

  const { OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY })
  const modelBase = process.env.OPENAI_MODEL_BOT || 'gpt-3.5-turbo'
  const model4 = process.env.OPENAI_MODEL_FALLBACK || 'gpt-4o-mini'

  // 🎯 PREÇO ESPECÍFICO ESCOLHIDO PELO SISTEMA DE ML
  let pricingInfo = ''
  if (options?.selectedPrice && options?.selectedQuantity) {
    const price = Number(options.selectedPrice).toFixed(2).replace('.', ',')
    const qty = options.selectedQuantity
    pricingInfo = `
PREÇO ESPECÍFICO ESCOLHIDO PELO SISTEMA:
• ${qty} unidade${qty > 1 ? 's' : ''}: R$ ${price}

IMPORTANTE: Use EXATAMENTE este preço! Foi escolhido pelo nosso sistema de otimização.
Estratégia do bandit: ${options.banditStrategy || 'padrão'}`
  } else {
    // Fallback para quando não há preço específico
    pricingInfo = `
PREÇOS OFICIAIS DA CALCINHA LIPO MODELADORA:
• 1 unidade: R$ 89,90 a R$ 97,00  
• 2 unidades: R$ 119,90 a R$ 139,90 (combo mais vendido)
• 3 unidades: R$ 159,90 a R$ 179,90 (melhor custo-benefício)

IMPORTANTE: Use APENAS estes preços! Nunca invente valores.`
  }

  const sys = `Você é a Larissa, vendedora especialista em Calcinha Lipo Modeladora.
CONTEXTO IMPORTANTE: Use as informações que já conhece sobre o cliente.
${pricingInfo}

REGRAS FUNDAMENTAIS:
1. Se cliente já demonstrou interesse de compra, não volte ao início - continue o processo
2. Se já sei o nome do cliente, USE o nome nas respostas
3. Se cliente já disse a cidade, não pergunte novamente
4. Se cliente pediu para fechar/confirmar, colete dados (nome, tamanho, cor, endereço)
5. Seja progressiva: cada resposta deve avançar a conversa

DADOS CONHECIDOS: ${JSON.stringify(options?.customerContext || {})}
ESTÁGIO ATUAL: ${options?.conversationStage || 'unknown'}

Responda de forma natural, curta e sempre progredindo na venda.`

  try {
    // 🎯 NOVA LÓGICA: Usar complexidade determinada pelo inboundProcessor
    let pickedModel = modelBase // GPT-3.5 padrão
    
    if (options?.complexity === 'complex') {
      pickedModel = model4 // GPT-4 para casos complexos
      console.log('🧠 Usando GPT-4 para caso complexo')
    } else {
      console.log('⚡ Usando GPT-3.5 para conversa simples')
    }
    
    // Fallback: heurística original se não recebeu parâmetro
    const txtIn = String(prompt || '')
    if (!options?.complexity) {
      const complex = txtIn.length > 400 || /reclama|troca|garantia|prazo|devolu|jur[ií]dic|reembolso|nota fiscal|boleto|cart[aã]o|pix|link de pagamento|produto diferente/i.test(txtIn)
      pickedModel = complex ? model4 : modelBase
      console.log(`🔄 Fallback: ${complex ? 'GPT-4 (complexo)' : 'GPT-3.5 (simples)'}`)
    }
    
    const resp = await openai.chat.completions.create({
      model: pickedModel,
      temperature: 0.7,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: txtIn }
      ]
    })
    const txt = resp.choices?.[0]?.message?.content?.trim()
    if (txt && txt.length) return txt
  } catch (e) {
    console.error('❌ Erro GPT:', e)
    // fallback silencioso
  }

  // Fallback de segurança
  return 'Tenho opções ótimas pra você! Me diz sua cidade e tamanho (P,M,G,GG) pra eu te indicar certinho.'
}

import type { ChatCompletionMessageParam } from 'openai/resources/index'

// Lightweight wrapper around OpenAI to power an internal Admin Assistant.
// It parses natural language commands and returns structured intents.

export type AdminIntent =
  | { type: 'create_order'; phone?: string; product?: string; qty?: number; city?: string; name?: string }
  | { type: 'confirm_delivery'; phone?: string; revenue?: number }
  | { type: 'record_conversion'; phone?: string; revenue?: number }
  | { type: 'send_message'; phone: string; content: string }
  | { type: 'report'; scope: 'today' | 'yesterday' | 'week' | 'month' }
  | { type: 'unknown'; note?: string }

export interface AdminAssistantResult {
  intent: AdminIntent
  reply: string
}

function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)
}

export async function runAdminAssistant(input: string): Promise<AdminAssistantResult> {
  // Cheap fast-path without network if no key configured
  if (!hasOpenAI()) {
    const l = input.toLowerCase()
    if (/entregue/.test(l)) {
      const m = l.match(/(\d+[\.,]?\d*)/)
      return { intent: { type: 'confirm_delivery', revenue: m ? parseFloat(m[1].replace(',', '.')) : undefined }, reply: 'Entrega confirmada (modo básico). ✅' }
    }
    if (/convers[aã]o/.test(l)) {
      const m = l.match(/(\d+[\.,]?\d*)/)
      return { intent: { type: 'record_conversion', revenue: m ? parseFloat(m[1].replace(',', '.')) : undefined }, reply: 'Conversão registrada (modo básico). 💰' }
    }
    if (/pedido/.test(l)) {
      return { intent: { type: 'create_order' }, reply: 'Pedido anotado (modo básico). 🛒' }
    }
    return { intent: { type: 'unknown', note: 'no_openai' }, reply: 'Comandos: pedido [valor], entregue [valor], conversão [valor].' }
  }

  const { OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY })
  const sys = `Você é um assistente administrativo sênior (super funcionário) da empresa que vende Calcinha Lipo Modeladora. 

PRODUTOS QUE VENDEMOS:
- Calcinha Lipo Modeladora (nossa única linha de produto)
- Preços fixos (UM POR QUANTIDADE):
  * 1 unidade: R$ 89,90
  * 2 unidades: R$ 119,90
  * 3 unidades: R$ 159,90
  * 4 unidades: R$ 239,90
  * 6 unidades: R$ 359,90
- Entregamos com pagamento na entrega (COD) em 73 cidades do Brasil
- Produto premium que modela cintura, não marca a roupa e oferece máximo conforto

Extraia uma intenção estruturada a partir do comando do admin.
Responda SEMPRE em JSON com estas chaves: intent (object), reply (string resumida ao admin).
Tipos de intent: create_order, confirm_delivery, record_conversion, send_message, report, unknown.
Campos opcionais: phone (string E164 sem +), product (string), qty (int), city (string), name (string), revenue (number), content (string), scope (today|yesterday|week|month).

Exemplos:
"entregue 149" -> {"intent":{"type":"confirm_delivery","revenue":149},"reply":"Entrega confirmada de R$ 149."}
"conversão 199" -> {"intent":{"type":"record_conversion","revenue":199},"reply":"Conversão registrada."}
"manda oi para 559999999999" -> {"intent":{"type":"send_message","phone":"559999999999","content":"Oi"},"reply":"Mensagem enviada."}
"qual produto vendemos?" -> {"intent":{"type":"unknown"},"reply":"Vendemos Calcinha Lipo Modeladora em 12 variações de preços (R$ 89,90 a R$ 359,90) com entrega COD em 73 cidades."}
"quais os preços?" -> {"intent":{"type":"unknown"},"reply":"Preços: 1un (R$ 89,90), 2un (R$ 119,90), 3un (R$ 159,90), 4un (R$ 239,90), 6un (R$ 359,90)."}

Se faltar dados, preencha somente o que for óbvio e mantenha os outros campos ausentes.`

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: sys },
    { role: 'user', content: input }
  ]
  const model = process.env.OPENAI_MODEL_ADMIN || process.env.OPENAI_MODEL || 'gpt-4o'
  const resp = await openai.chat.completions.create({ model, messages, temperature: 0 })
  const txt = resp.choices?.[0]?.message?.content?.trim() || ''
  try {
    const json = JSON.parse(txt)
    const intent: AdminIntent = json.intent || { type: 'unknown' }
    const reply: string = json.reply || 'Ok.'
    return { intent, reply }
  } catch {
    return { intent: { type: 'unknown' }, reply: 'Não entendi. Tente: "pedido [valor]", "entregue [valor]", "conversão [valor]".' }
  }
}

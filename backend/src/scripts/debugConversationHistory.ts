import { getDatabase } from '../config/database'

async function main() {
  process.env.AUTO_DB = '1'
  const db = getDatabase()
  
  const conversationId = 'ba53cf36-b782-408f-828f-d745f8ea5716'
  
  console.log('\n=== HISTÓRICO NO BANCO ===')
  const messages: any[] = db.prepare(`
    SELECT direction, content, created_at 
    FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all(conversationId)
  
  messages.forEach((msg: any, i: number) => {
    console.log(`${i+1}. [${msg.direction}] ${msg.content}`)
  })
  
  console.log('\n=== COMO SERIA FORMATADO PARA GPT ===')
  const formattedHistory = messages
    .reverse() // Mais antigo primeiro
    .map((msg: any) => {
      const direction = msg.direction === 'inbound' ? 'CLIENTE' : 'LARISSA'
      return `${direction}: ${msg.content}`
    })
    .join('\n')
  
  console.log(formattedHistory)
  
  console.log('\n=== RESUMO ===')
  console.log(`Total de mensagens: ${messages.length}`)
  const lastClient: any | undefined = messages.find((m: any) => m.direction === 'inbound')
  const lastBot: any | undefined = messages.find((m: any) => m.direction === 'outbound')
  console.log(`Última do cliente: ${lastClient?.content ?? ''}`)
  console.log(`Última do bot: ${lastBot?.content ?? ''}`)
}

main().catch(console.error)

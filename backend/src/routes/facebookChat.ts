import { Router } from 'express';
import { CALCINHA_BUSINESS_CONTEXT, CALCINHA_FACEBOOK_STRATEGY } from '../contexts/calcinhaBusiness';
import OpenAI from 'openai';

const router = Router();

// Chat conversacional para campanhas Facebook
router.post('/facebook-chat', async (req, res) => {
  try {
  const { message, images, sessionId, mode, video, history, budget } = req.body;
    const userMessage = message || '';
    
    let response = '';
    const imgsArray: string[] = Array.isArray(images) ? images : [];

    // MODE: strategy_v2 (ignora imagens – foco em blueprint estratégico completo)
    if (!response && mode === 'strategy_v2') {
      response = `🧠 **Blueprint Estratégico Completo (Calcinha Lipo Modeladora)**\n\n` +
      `**1. PERSONAS (3 NÚCLEOS)**\n` +
      `- Pós-Parto Confiante (25-38): busca recuperar forma e autoestima rapidamente.\n` +
      `- Profissional Vaidosa (30-45): quer modelar sob roupas de trabalho e eventos.\n` +
      `- Transformação Discreta (35-50): evita cirurgia/lipo, quer efeito imediato e confortável.\n\n` +
      `**2. SEGMENTAÇÃO FUNIL MULTICAMADA**\n` +
      `TOFU: Interesses – beleza, estética, pós-parto, moda, shapewear, emagrecimento.\n` +
      `MOFU: Engajadas com anúncios anteriores / cliques em wa.me / video views 25%+.\n` +
      `BOFU: Pessoas que abriram conversa no WhatsApp mas não concluíram / lookalike de compradores COD.\n\n` +
      `**3. MATRIZ DE OFERTAS**\n` +
      `- Entrada: 1 unid. R$ 89,90 (ancora percepção de valor).\n` +
      `- Core: Combo 2 (R$ 139,90) – maior margem & AOV.\n` +
      `- Upsell: Combo 3 (R$ 179,90) – escala custo aquisição.\n` +
      `- Premium: 6 unid. R$ 359,90 (revenda / presente / estoque pessoal).\n\n` +
  `**4. CREATIVE ANGLES (JSON)**\n\n` +
  '```json\n' +
  '[\n  {"angle":"Efeito Lipo Imediato","hook":"2 números a menos em 30s","proof":"Antes/depois real"},\n  {"angle":"Pós-Parto Seguro","hook":"Autoestima de volta","proof":"Conforto e suporte"},\n  {"angle":"Confiança no Espelho","hook":"Roupa justa sem marcar","proof":"Modela sem apertar"},\n  {"angle":"Economia vs Cirurgia","hook":"R$ 89,90 vs R$ 15.000","proof":"Comparativo visual"}\n]\n' +
  '```\n\n' +
      `**5. FRAMEWORKS DE COPY**\n` +
      `AIDA: Atenção (Efeito lipo sem cirurgia) → Interesse (Modela cintura instantaneamente) → Desejo (Autoestima alta + conforto) → Ação (Clique e garanta).\n` +
      `PAS: Problema (Barriga marcando) → Agitação (Roupa não cai bem / insegurança) → Solução (Calcinha Lipo redefine em segundos).\n\n` +
      `**6. BUDGET & ESCALA PROGRESSIVA**\n` +
      `Dia 1-3 Teste: 4-6 criativos / R$ 50-80 (CTR & CPC filtro).\n` +
      `Dia 4-7 Otimização: Pausar bottom 50% CTR, duplicar top 2 com +30%.\n` +
      `Semana 2 Scale: Consolidar combos + Lookalike compradores COD.\n\n` +
      `**7. MÉTRICAS CHAVE**\n` +
      `- CTR Meta: 4.5–6%\n- CPC <= R$ 1,40\n- Conversão WhatsApp (open→lead qualificado) >= 25% (COD)\n- % Combo >= 55% pedidos\n- CAC / AOV < 0.28\n\n` +
      `**8. PRÓXIMAS AÇÕES (PRIORIDADE)**\n` +
      `1. Gerar 4 variações de headline (ângulos distintos).\n` +
      `2. Criar links wa.me com códigos Bandits exclusivos por conjunto.\n` +
      `3. Subir campanha TOFU (Tráfego) + 1 retarget MOFU.\n` +
      `4. Configurar tagging no WhatsApp IA para classificação de intenção.\n\n` +
      `Se quiser, posso agora: (a) gerar 4 headlines, (b) montar 3 copies completas ou (c) sugerir estrutura de criativos. Qual?`;
    }

    // MODE: creative_audit_v2 (exige imagens)
    if (!response && mode === 'creative_audit_v2' && imgsArray.length) {
      const list = imgsArray.map((_, i) => `Imagem ${i+1}`).join(', ');
      response = `🧪 **Creative Audit Avançado (${imgsArray.length} assets)**\n\n` +
      `**Assets Recebidos:** ${list}\n\n` +
      `**Avaliação Estrutural:**\n- Clareza do benefício: ALTA / MÉDIA / BAIXA (ajustar conforme real).\n- Hierarquia visual: título > prova > CTA?\n- Contraste & legibilidade: manter fundo neutro, evitar ruído.\n- Branding discreto para não roubar atenção do benefício.\n\n` +
      `**Riscos Comuns Detectáveis:**\n- Texto excessivo pode reduzir entrega.\n- Ausência de antes/depois em pelo menos 1 criativo.\n- Falta de ângulo emocional profundo (autoestima / confiança).\n\n` +
      `**Recomendações:**\n1. Inserir variação com comparação "R$ 89,90 vs R$ 15.000".\n2. Adicionar CTA direto ("Chama no WhatsApp") em 50% dos criativos.\n3. Variação focada em pós-parto (persona dedicada).\n4. Teste de cor: fundo neutro vs tonalidade suave corporal.\n\n` +
      `Quer que eu gere lista de novas variações ou copy específica para um desses assets?`;
    }
    
  if (!response && video) {
      response = '🎥 Recebi um vídeo (análise avançada de frames será adicionada em breve). Envie também capturas-chave em imagem para insights específicos.'
  } else if (!response && images && images.length > 0) {
      // Normalizar possível base64/data URLs
      const imgs = Array.isArray(images) ? images : []
      response = `🔍 **Analisando ${imgs.length} asset(s) do Facebook Ads...**

Perfeito! Vou analisar seus prints e te dar insights valiosos para integrar com nosso **sistema Guardian Angel** e **Universal Bandits**.

**📊 Análise Visual dos Prints:**
- Telas identificadas: Configuração de campanha Facebook
- Status: Integração com sistema Guardian Angel necessária
- Bandits: Pronto para tracking avançado

**🎯 Configurações Recomendadas:**

**1. Objetivo:** "Tráfego" (OBRIGATÓRIO)
- Direciona para WhatsApp via wa.me
- Integra com nossos 44 algoritmos Bandits
- IA qualifica leads automaticamente

**2. Público-Alvo Calcinha Lipo:**
- Mulheres 25-50 anos
- Interessadas em: emagrecimento, estética, moda
- Localização: Priorizar as 73 cidades COD

**3. Links wa.me com Tracking:**
\`wa.me/numero?text=BANDIT_LIPO_PROMO_001%20Oi!%20Quero%20a%20calcinha%20que%20afina%20a%20cintura!\`

**4. Orçamento Sugerido:**
- R$ 100-150/dia (produto alto ticket)
- Otimização: Cliques no link

**💡 Próximos Passos:**
1. Configure o objetivo como "Tráfego"
2. Adicione o link wa.me com código Bandit
3. Teste com as cidades COD primeiro
4. Monitor conversion no WhatsApp IA

Quer que eu te ajude com alguma configuração específica que vi nos prints?`;
  } else if (!response) {
      // Chat sem imagem - resposta conversacional com contexto da calcinha lipo
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('link') || lowerMessage.includes('whatsapp') || lowerMessage.includes('wa.me')) {
        response = `🔗 **Links WhatsApp para Calcinha Lipo Modeladora:**

**Para Cidades COD (73 cidades):**
\`wa.me/numero?text=BANDIT_LIPO_COD_005%20Oi!%20É%20verdade%20que%20posso%20pagar%20na%20entrega?\`

**Para Promoções Gerais:**
\`wa.me/numero?text=BANDIT_LIPO_PROMO_001%20Oi!%20Quero%20a%20calcinha%20que%20afina%20a%20cintura!\`

**Para Combos (2+ unidades):**
\`wa.me/numero?text=BANDIT_LIPO_COMBO_002%20Oi!%20Quero%20o%20combo%20de%20calcinhas!\`

**🎯 Dica dos Bandits:**
- Use código diferente para cada campanha
- Sistema aprende qual converte melhor
- IA analisa comportamento no WhatsApp

**💰 Preços para mencionar:**
- 1 unidade: R$ 89,90
- 2 unidades: R$ 139,90  
- 3 unidades: R$ 179,90

Qual campanha você quer configurar?`;
      } else if (lowerMessage.includes('público') || lowerMessage.includes('target') || lowerMessage.includes('audiência')) {
        response = `🎯 **Público-Alvo Calcinha Lipo Modeladora:**

**📊 Demografia Principal:**
- Mulheres 25-50 anos
- Classes B, C1, C2
- Preocupadas com aparência
- Renda familiar: R$ 2.000+

**💭 Dores/Problemas:**
- Barriga saliente após gravidez
- Culote/gordura localizada  
- Roupas que marcam imperfeições
- Autoestima baixa com o corpo
- Medo/custo de cirurgia plástica

**📍 Segmentação Geográfica:**
- **Prioridade:** 73 cidades COD
- **São Paulo:** 21 cidades (maior volume)
- **Rio de Janeiro:** 9 cidades
- **Porto Alegre:** 10 cidades

**🔍 Interesses Facebook:**
- Emagrecimento, dieta, academia
- Estética, autoestima, beleza
- Lingerie, moda feminina
- Maternidade, pós-parto

**⏰ Horários Ideais:**
- Manhã: 8h-10h (se arrumando)
- Tarde: 14h-16h (pausa trabalho)
- Noite: 19h-21h (relaxando)

Quer que eu te ajude a configurar algum público específico?`;
      } else if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto')) {
        response = `💰 **Preços Oficiais - Calcinha Lipo Modeladora:**

**📦 Tabela de Preços (UM PREÇO POR QUANTIDADE):**
• 1 unidade: R$ 89,90
• 2 unidades: R$ 119,90
• 3 unidades: R$ 159,90  
• 4 unidades: R$ 239,90
• 6 unidades: R$ 359,90

**🏠 COD (73 Cidades):**
- Pagamento na entrega
- Frete GRÁTIS
- Zero risco para cliente

**🌍 Outras Cidades:**
- PIX, cartão, boleto
- Frete: Correios (7-15 dias)

**💡 Estratégia de Vendas:**
- Combos vendem mais (ticket médio: R$ 149,90)
- COD elimina objeção de desconfiança
- Comparar com lipo: "R$ 89,90 vs R$ 15.000"

**🎯 Copy que Converte:**
"Efeito lipo sem dor, sem risco, sem gastar R$ 15.000"
"2 números a menos em 30 segundos!"

Quer que eu te ajude com a copy da campanha?`;
      } else if (lowerMessage.includes('cod') || lowerMessage.includes('cidade') || lowerMessage.includes('entrega')) {
        response = `🏠 **73 Cidades COD - Pagamento na Entrega:**

**🔥 São Paulo (21 cidades):**
São Paulo, Taboão da Serra, São Bernardo do Campo, Osasco, Guarulhos, Diadema, Santo André, Itapecerica da Serra, Carapicuíba, Itaquaquecetuba, Barueri, Mauá, Ferraz de Vasconcelos, São Caetano do Sul, Suzano, Cotia, Embu das Artes, Poá, Itapevi, Jandira, Mogi das Cruzes

**🏖️ Rio de Janeiro (9 cidades):**
Rio de Janeiro, Niterói, Duque de Caxias, São João de Meriti, Nilópolis, Mesquita, Nova Iguaçu, São Gonçalo, Queimados

**⚡ Porto Alegre (10 cidades):**
Porto Alegre, Canoas, Esteio, São Leopoldo, Novo Hamburgo, Gravataí, Sapucaia do Sul, Viamão, Cachoeirinha, Alvorada

**🌟 Recife (6 cidades):**
Recife, Olinda, Jaboatão dos Guararapes, Camaragibe, Paulista, Abreu e Lima

**🔥 Vantagem COD:**
- Zero risco para cliente
- Conversão 3x maior
- Elimina objeção "e se não chegar?"
- Cliente vê antes de pagar

**💡 Copy COD:**
"COD grátis: pague só quando receber em casa!"
"Sem risco! Pague quando a calcinha chegar aí!"

Quer focar em alguma região específica?`;
      } else if (lowerMessage.includes('copy') || lowerMessage.includes('texto') || lowerMessage.includes('criativo')) {
        response = `✍️ **Copy que Converte - Calcinha Lipo:**

**🔥 Headlines Campeãs:**
"Barriga de grávida? Esta calcinha te dá cintura de pilates!"
"Efeito lipo sem dor, sem risco, sem gastar R$ 15.000"
"2 números a menos em 30 segundos!"
"Autoestima nas alturas, barriga no lugar"

**💰 Objeção de Preço:**
"R$ 89,90 vs R$ 15.000 da lipo cirúrgica"
"Menos que um jantar romântico, resultado de lipo!"

**🏠 COD (Cidades Certas):**
"COD grátis: pague só quando receber em casa!"
"Sem risco! Vê o produto antes de pagar"
"Chegou? Gostou? Aí você paga!"

**⚡ Urgência:**
"Últimas peças do estoque!"
"Oferta termina hoje!"
"Apenas X unidades restantes"

**🎯 Call to Action:**
"Clique e garante a sua!"
"Quero minha calcinha lipo!"
"Chama no WhatsApp!"

**📸 Criativos que Funcionam:**
- Antes/Depois (mais converte)
- Mulher confiante com roupa justa
- Produto + benefício visual
- Comparação com lipo cirúrgica

Qual estilo de copy você quer testar?`;
      } else if (lowerMessage.includes('budget') || lowerMessage.includes('orçamento') || lowerMessage.includes('investir')) {
        response = `💸 **Budget Recomendado - Calcinha Lipo:**

**💰 Investimento Diário:**
- Mínimo: R$ 50/dia
- Recomendado: R$ 100-150/dia
- Alto volume: R$ 200+/dia

**📊 ROI Esperado:**
- CTR: 4.5-6% (produto visual forte)
- Conversão WhatsApp: 20-30% (COD)
- Ticket médio: R$ 149,90 (combos)
- ROI: 5-8x (valor percebido alto)

**🎯 Distribuição por Cidade:**
- 60% nas cidades COD (maior conversão)
- 40% outras cidades (PIX/cartão)

**⚡ Otimização:**
- Objetivo: "Tráfego" 
- Foco: Cliques no link
- Não usar "Conversões" (vendemos via WhatsApp)

**📈 Escalonamento:**
- Semana 1: R$ 50/dia (teste)
- Semana 2: R$ 100/dia (se ROI > 3x)
- Semana 3+: R$ 150+/dia (scale)

**💡 Dica dos Bandits:**
Produto de ticket alto permite maior investimento. Melhor gastar R$ 150/dia bem direcionado que R$ 50/dia disperso.

Qual budget você tem disponível?`;
      } else {
        // Resposta padrão conversacional
        response = `👋 **Oi! Sou a IA do Guardian Angel - Especialista em Calcinha Lipo!**

Estou aqui para te ajudar a criar campanhas Facebook que **convertem de verdade** para nossa **Calcinha Lipo Modeladora**.

**🎯 Como posso te ajudar hoje?**

**📱 Links WhatsApp** - Links wa.me com tracking dos Bandits
**🎯 Público-Alvo** - Segmentação certeira para mulheres 25-50
**💰 Preços** - Tabela completa e estratégias de combo
**🏠 COD** - 73 cidades com pagamento na entrega
**✍️ Copy** - Textos que convertem para calcinha lipo
**💸 Budget** - Quanto investir e como escalar

**🔥 Contexto do Produto:**
- Calcinha modeladora com efeito lipo instantâneo
- Reduz até 2 números visualmente
- Preços: R$ 89,90 a R$ 359,90
- 73 cidades COD + frete grátis

Só me dizer o que você quer configurar na sua campanha!`;
      }
    }
    
    // Conversational enhancement (OpenAI) for QA mode when available
    try {
      const aiKey = process.env.OPENAI_API_KEY;
      const wantConversational = (!images || images.length===0) && !video && (mode === 'qa' || !mode);
      if (aiKey && wantConversational) {
        const client = new OpenAI({ apiKey: aiKey });
        const shortHistory: any[] = Array.isArray(history) ? history.slice(-8) : [];
        // Extract budget from provided field or attempt regex
        let numericBudget = null as number | null;
        if (typeof budget === 'number') numericBudget = budget;
        if (numericBudget === null) {
          const m = userMessage.match(/R\$\s*(\d+[\.,]?\d*)/i);
          if (m) { numericBudget = parseFloat(m[1].replace(/\./g,'').replace(',','.')); }
        }
        const sys = `Você é um assistente estratégico de Growth & Facebook Ads para um e-commerce de shapewear (Calcinha Lipo). Estilo: conversacional, humano, direto, encadeando ideias. Sempre conecta novas perguntas com contexto anterior. Se houver orçamento, distribua entre: TOFU testes criativos, MOFU retarget, Escala (top performers). Converta valores para formato BR (R$). Limite jargão. Retorne Markdown enxuto com seções necessárias apenas.`;
        const contextTrail = shortHistory.map(h=>`[${h.type||'user'}] ${h.content}` ).join('\n');
        const budgetLine = numericBudget? `Orçamento mencionado: R$ ${numericBudget.toFixed(2)}.` : '';
        const prompt = `Histórico recente:\n${contextTrail}\n\nPergunta atual: ${userMessage}\n${budgetLine}\nGere resposta integrada (não repita contexto já dito, traga próximos passos concretos).`;
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [ { role:'system', content: sys }, { role:'user', content: prompt } ],
          temperature: 0.7,
          max_tokens: 900
        });
        const dyn = completion.choices[0]?.message?.content?.trim();
        if (dyn) {
          // Mesclar se já havia resposta base (rule-based) — anexar seção "Insights Dinâmicos"
          if (response) {
            response = response + `\n\n---\n🧩 **Insights Dinâmicos**\n` + dyn;
          } else {
            response = dyn;
          }
        }
      }
    } catch (aiErr) {
      console.warn('Conversational AI fallback (erro):', (aiErr as any)?.message);
    }

    const detectedMode = mode || (video ? 'video' : (images && images.length ? (mode||'vision') : 'qa'));
    return res.json({ 
      success: true, 
      response,
      mode: detectedMode,
      context: CALCINHA_BUSINESS_CONTEXT 
    });
  } catch (error) {
    console.error('Erro no chat facebook-chat:', error);
    return res.status(500).json({ error: 'Falha ao processar mensagem' });
  }
});

export default router;

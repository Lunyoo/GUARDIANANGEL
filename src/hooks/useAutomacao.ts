import { useState, useEffect } from 'react'
import { useKV } from './useKV'
import { spark } from '@/lib/sparkCompat'
import type { 
  OfertaScrapada, 
  ProdutoGerado, 
  CriativoIA as CriativoIAAutomacao, 
  CampanhaAutomatizada,
  FluxoAutomacao,
  AnaliseNicho,
  ConfiguracaoAutomacao
} from '@/types/automacao'

export function useAutomacao() {
  const [configuracao] = useKV<ConfiguracaoAutomacao>('automacao-config', {
    id: 'default',
    usuario: 'anon',
    nichos: ['WHITE'],
    orcamentoDiario: 100,
    limiteMensal: 1000,
    criteriosParada: { roasMinimo: 1.5, cpaMaximo: 50, duracaoMaximaCampanha: 30 },
    aprovacaoManual: { produtos: true, criativos: true, campanhas: true },
    apis: { kiwify: { token: '', vendorId: '' }, ideogram: { token: '' } },
    notificacoes: { email: false, whatsapp: false }
  })
  const [ofertas, setOfertas] = useKV<OfertaScrapada[]>('ofertas-scrapadas', [])
  const [produtos, setProdutos] = useKV<ProdutoGerado[]>('produtos-gerados', [])
  const [criativos, setCriativos] = useKV<CriativoIAAutomacao[]>('criativos-ia', [])
  const [campanhas, setCampanhas] = useKV<CampanhaAutomatizada[]>('campanhas-automatizadas', [])
  const [fluxos, setFluxos] = useKV<FluxoAutomacao[]>('fluxos-automacao', [])
  const [analiseNichos, setAnaliseNichos] = useKV<AnaliseNicho[]>('analise-nichos', [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'IDLE' | 'SCRAPING' | 'ANALYZING' | 'CREATING' | 'OPTIMIZING'>('IDLE')

  // Iniciar scraping de ofertas por nicho
  const iniciarScraping = async (nicho: 'BLACK' | 'GREY' | 'WHITE', palavrasChave: string[]) => {
    if (!configuracao) {
      throw new Error('Configuração de automação não encontrada')
    }

    setIsLoading(true)
    setStatus('SCRAPING')

    try {
      console.log(`🕷️ Iniciando scraping para nicho ${nicho}...`)
      
      // Simular scraping (em produção seria uma API real)
      const prompt = spark.llmPrompt`
        Você é um especialista em análise de anúncios do Facebook para o nicho ${nicho}.
        
        Analise e identifique ofertas de alto potencial baseando-se nas palavras-chave: ${palavrasChave.join(', ')}
        
        Para o nicho ${nicho}, gere 5-10 ofertas realistas que você encontraria na Biblioteca de Anúncios do Facebook:
        
        Para cada oferta, forneça:
        - Nome do produto/serviço
        - Preço (em reais)
        - Copy do anúncio (headline + description)
        - Demografia alvo (idade, gênero, interesses)
        - Estimativa de engajamento e conversão
        - Palavras-chave relevantes
        - Score de potencial (0-100)
        
        Seja específico e realista para o mercado brasileiro de ${nicho === 'BLACK' ? 'marketing agressivo' : nicho === 'GREY' ? 'marketing questionável' : 'marketing tradicional'}.
        
        Retorne em formato JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const novasOfertas = JSON.parse(response) as any[]
      
      const ofertasFormatadas: OfertaScrapada[] = novasOfertas.map((oferta, index) => ({
        id: `${nicho.toLowerCase()}-${Date.now()}-${index}`,
        nicho,
        produto: oferta.nome || `Produto ${index + 1}`,
        preco: oferta.preco || Math.floor(Math.random() * 2000) + 100,
        copy: oferta.copy || `Copy para ${oferta.nome}`,
        engajamento: oferta.engajamento || Math.floor(Math.random() * 5000) + 1000,
        conversaoEstimada: oferta.conversaoEstimada || Math.random() * 5 + 1,
        tendencia: oferta.tendencia || 'MEDIA',
        palavrasChave: oferta.palavrasChave || palavrasChave.slice(0, 3),
        demografiaAlvo: oferta.demografiaAlvo || {
          idade: [25, 45],
          genero: ['M', 'F'],
          interesses: ['marketing', 'empreendedorismo']
        },
        metricas: oferta.metricas || {
          likes: Math.floor(Math.random() * 1000) + 100,
          comentarios: Math.floor(Math.random() * 200) + 20,
          compartilhamentos: Math.floor(Math.random() * 100) + 10,
          impressoesEstimadas: Math.floor(Math.random() * 100000) + 10000
        },
        dataColeta: new Date(),
        fonte: 'Facebook Ads Library',
        scorePotencial: oferta.scorePotencial || Math.floor(Math.random() * 40) + 60
      }))
      
      setOfertas(prev => [...prev, ...ofertasFormatadas])
      console.log(`✅ ${ofertasFormatadas.length} ofertas coletadas para ${nicho}`)
      
      return ofertasFormatadas
      
    } catch (error) {
      console.error('❌ Erro no scraping:', error)
      throw error
    } finally {
      setIsLoading(false)
      setStatus('IDLE')
    }
  }

  // Analisar nicho com ML
  const analisarNicho = async (nicho: 'BLACK' | 'GREY' | 'WHITE') => {
    setStatus('ANALYZING')
    
    try {
      console.log(`🧠 Analisando nicho ${nicho} com ML...`)
      
      const ofertasNicho = ofertas.filter(o => o.nicho === nicho)
      
      if (ofertasNicho.length === 0) {
        throw new Error(`Nenhuma oferta encontrada para o nicho ${nicho}. Execute o scraping primeiro.`)
      }
      
      const prompt = spark.llmPrompt`
        Você é um analista de machine learning especializado em marketing digital para o nicho ${nicho}.
        
        Analise as seguintes ${ofertasNicho.length} ofertas coletadas:
        ${JSON.stringify(ofertasNicho, null, 2)}
        
        Com base nestes dados, forneça uma análise completa do nicho incluindo:
        
        1. Tendências identificadas (palavras-chave em alta, preços, melhores horários)
        2. Oportunidades (lacunas no mercado, nichos sub-explorados)
        3. Riscos (compliance, concorrência, sazonalidade)
        4. Score de potencial geral do nicho (0-100)
        5. Recomendações estratégicas específicas
        
        Para o contexto brasileiro de ${nicho === 'BLACK' ? 'marketing agressivo/polêmico' : nicho === 'GREY' ? 'marketing questionável' : 'marketing tradicional/white hat'}.
        
        Retorne em formato JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const analise = JSON.parse(response)
      
      const analiseFormatada: AnaliseNicho = {
        nicho,
        descricao: analise.descricao || `Análise do nicho ${nicho}`,
        ofertas: ofertasNicho,
        tendencias: analise.tendencias || {
          palavrasChaveEmAlta: ['marketing', 'digital'],
          precoMedio: ofertasNicho.reduce((acc, o) => acc + o.preco, 0) / ofertasNicho.length,
          melhorHorarioPublicacao: ['19:00', '20:00', '21:00'],
          melhorDiasSemana: ['segunda', 'terça', 'quarta']
        },
        oportunidades: analise.oportunidades || {
          lacunas: ['Produtos para iniciantes'],
          nichosSaturados: ['Curso de day trading'],
          novosNichos: ['IA para marketing']
        },
        riscos: analise.riscos || {
          compliance: nicho === 'BLACK' ? ['Promessas irreais'] : ['Regulamentação'],
          concorrencia: ['Alta saturação'],
          sazonalidade: ['Dezembro baixo']
        },
        scorePotencial: analise.scorePotencial || Math.floor(Math.random() * 30) + 70,
        atualizadoEm: new Date()
      }
      
      setAnaliseNichos(prev => {
        const filtered = prev.filter(a => a.nicho !== nicho)
        return [...filtered, analiseFormatada]
      })
      
      console.log(`✅ Análise de nicho ${nicho} concluída`)
      return analiseFormatada
      
    } catch (error) {
      console.error('❌ Erro na análise:', error)
      throw error
    } finally {
      setStatus('IDLE')
    }
  }

  // Gerar produto automaticamente
  const gerarProduto = async (ofertaBase: OfertaScrapada, configuracaoKiwify?: any) => {
    if (!configuracao?.apis?.kiwify) {
      throw new Error('API do Kiwify não configurada')
    }

    setStatus('CREATING')
    
    try {
      console.log(`🏗️ Gerando produto baseado em: ${ofertaBase.produto}`)
      
      const prompt = spark.llmPrompt`
        Você é um criador de produtos digitais especialista em ${ofertaBase.nicho}.
        
        Baseando-se nesta oferta de sucesso:
        - Produto: ${ofertaBase.produto}
        - Preço: R$ ${ofertaBase.preco}
        - Copy: ${ofertaBase.copy}
        - Score: ${ofertaBase.scorePotencial}
        - Palavras-chave: ${ofertaBase.palavrasChave.join(', ')}
        
        Crie um produto SIMILAR (não cópia) que possa competir no mesmo nicho.
        
        Inclua:
        1. Nome do produto (diferente mas similar)
        2. Descrição detalhada
        3. Preço competitivo 
        4. Tipo de produto (EBOOK, CURSO, MENTORIA, SOFTWARE, TEMPLATE)
        5. Estrutura do conteúdo (capítulos/módulos)
        6. Funil gamificado com 3-5 etapas
        7. Sistema de pontuação e recompensas
        
        Para o nicho ${ofertaBase.nicho} no mercado brasileiro.
        
        Retorne em formato JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const produtoData = JSON.parse(response)
      
      const produto: ProdutoGerado = {
        id: `produto-${Date.now()}`,
        nome: produtoData.nome || `Produto Baseado em ${ofertaBase.produto}`,
        descricao: produtoData.descricao || 'Produto gerado automaticamente',
        preco: produtoData.preco || ofertaBase.preco * 0.9, // 10% menor que a concorrência
        tipo: produtoData.tipo || 'EBOOK',
        conteudo: produtoData.conteudo || {
          capitulos: ['Introdução', 'Estratégias', 'Implementação', 'Resultados']
        },
        funil: produtoData.funil || {
          id: `funil-${Date.now()}`,
          nome: `Funil para ${produtoData.nome}`,
          etapas: [
            {
              id: 'landing',
              nome: 'Landing Page',
              tipo: 'LANDING_PAGE',
              conteudo: 'Página de captura otimizada',
              elementos: [],
              conversaoEsperada: 15
            }
          ],
          pontuacao: {
            visitaLandingPage: 10,
            preencheuEmail: 25,
            assistiuVideo: 50,
            comprou: 100
          },
          recompensas: []
        },
        status: 'RASCUNHO'
      }
      
      // Simular criação no Kiwify (em produção seria API real)
      if (configuracaoKiwify?.autoCreate) {
        console.log('📦 Criando produto no Kiwify...')
        produto.kiwifyProductId = `kw_${Date.now()}`
        produto.status = 'CRIADO'
        console.log(`✅ Produto criado no Kiwify: ${produto.kiwifyProductId}`)
      }
      
      setProdutos(prev => [...prev, produto])
      console.log(`✅ Produto gerado: ${produto.nome}`)
      
      return produto
      
    } catch (error) {
      console.error('❌ Erro na geração de produto:', error)
      throw error
    } finally {
      setStatus('IDLE')
    }
  }

  // Gerar creative com Ideogram AI
  const gerarCriativo = async (produto: ProdutoGerado, ofertaBase: OfertaScrapada) => {
    if (!configuracao?.apis?.ideogram) {
      throw new Error('API do Ideogram não configurada')
    }
    
    try {
      console.log(`🎨 Gerando criativo para: ${produto.nome}`)
      
      // Gerar prompt otimizado para o creative
      const promptCreativo = spark.llmPrompt`
        Você é um especialista em criação de criativos para Facebook Ads no nicho ${ofertaBase.nicho}.
        
        Para o produto "${produto.nome}" (${produto.tipo}) que custa R$ ${produto.preco}, crie um prompt de imagem otimizado para o Ideogram AI.
        
        Características do público-alvo:
        - Idade: ${ofertaBase.demografiaAlvo.idade.join('-')} anos
        - Interesses: ${ofertaBase.demografiaAlvo.interesses.join(', ')}
        - Nicho: ${ofertaBase.nicho}
        
        O prompt deve ser:
        1. Específico e detalhado
        2. Orientado para conversão
        3. Apropriado para ${ofertaBase.nicho === 'BLACK' ? 'marketing agressivo' : ofertaBase.nicho === 'GREY' ? 'marketing questionável' : 'marketing tradicional'}
        4. Atrativo visualmente
        5. Com elementos de urgência/escassez se apropriado
        
        Retorne apenas o prompt otimizado para o Ideogram AI.
      `
      
      const promptImagem = await spark.llm(promptCreativo, 'gpt-4o')
      
      const criativo: CriativoIAAutomacao = {
        id: `criativo-${Date.now()}`,
        tipo: 'IMAGEM',
        prompt: promptImagem,
        revisao: {
          aprovado: false,
          pontuacao: 0,
          sugestoes: [],
          problemas: [],
          melhorias: [],
          nichoCompatibilidade: 0,
          compliance: {
            black: ofertaBase.nicho === 'BLACK',
            grey: ofertaBase.nicho === 'GREY',
            white: ofertaBase.nicho === 'WHITE'
          }
        },
        variantes: [],
        performance: {
          ctr: 0,
          engagement: 0,
          conversoes: 0,
          score: 0
        },
        status: 'GERANDO',
        ofertaOrigem: ofertaBase.id
      }
      
      // Simular geração no Ideogram (em produção seria API real)
      console.log('🖼️ Enviando para Ideogram AI...')
      
      // Simulação de URL gerada
      criativo.urlGerada = `https://ideogram.ai/generated/${criativo.id}.jpg`
  criativo.status = 'REVISAO'
      
      // Revisão automática por IA
      await revisarCriativo(criativo)
      
      setCriativos(prev => [...prev, criativo])
      console.log(`✅ Criativo gerado e revisado: ${criativo.id}`)
      
      return criativo
      
    } catch (error) {
      console.error('❌ Erro na geração de criativo:', error)
      throw error
    }
  }

  // Revisar criativo com IA
  const revisarCriativo = async (criativo: CriativoIAAutomacao) => {
    try {
      console.log(`🔍 Revisando criativo: ${criativo.id}`)
      
      const prompt = spark.llmPrompt`
        Você é um especialista em revisão de criativos para Facebook Ads.
        
        Analise este criativo:
        - Tipo: ${criativo.tipo}
        - Prompt: ${criativo.prompt}
        - Nicho: ${ofertas.find(o => o.id === criativo.ofertaOrigem)?.nicho}
        
        Avalie:
        1. Compliance com políticas do Facebook (0-100)
        2. Potencial de conversão (0-100)  
        3. Adequação ao nicho (0-100)
        4. Qualidade visual esperada (0-100)
        5. Problemas identificados
        6. Sugestões de melhoria
        7. Aprovação final (sim/não)
        
        Para marketing ${ofertas.find(o => o.id === criativo.ofertaOrigem)?.nicho} brasileiro.
        
        Retorne em formato JSON válido.
      `
      
      const response = await spark.llm(prompt, 'gpt-4o', true)
      const revisao = JSON.parse(response)
      
      criativo.revisao = {
        aprovado: revisao.aprovado || revisao.compliance >= 80,
        pontuacao: Math.round((revisao.compliance + revisao.conversao + revisao.nicho + revisao.qualidade) / 4),
        sugestoes: revisao.sugestoes || [],
        problemas: revisao.problemas || [],
        melhorias: revisao.melhorias || [],
        nichoCompatibilidade: revisao.nicho || 80,
        compliance: {
          black: revisao.compliance >= 60,
          grey: revisao.compliance >= 70, 
          white: revisao.compliance >= 90
        }
      }
      
  criativo.status = criativo.revisao.aprovado ? 'APROVADO' : 'REJEITADO'
      
      console.log(`✅ Revisão concluída: ${criativo.status} (${criativo.revisao.pontuacao}/100)`)
      
    } catch (error) {
      console.error('❌ Erro na revisão:', error)
  criativo.status = 'REJEITADO'
    }
  }

  // Executar fluxo completo de automação
  const executarFluxoCompleto = async (
    nicho: 'BLACK' | 'GREY' | 'WHITE', 
    palavrasChave: string[],
    configuracaoFluxo?: Partial<FluxoAutomacao['etapas']>
  ) => {
    const fluxo: FluxoAutomacao = {
      id: `fluxo-${Date.now()}`,
      nome: `Fluxo Automatizado - ${nicho}`,
      etapas: {
        scraping: true,
        analiseML: true,
        geracaoProduto: true,
        criacaoFunil: true,
        geracaoCreatives: true,
        revisaoIA: true,
        criacaoCampanha: true,
        lancamento: false, // Sempre manual por segurança
        otimizacao: true,
        ...configuracaoFluxo
      },
      progresso: 0,
      status: 'EXECUTANDO',
      logs: []
    }
    
    setFluxos(prev => [...prev, fluxo])
    
    try {
      // 1. Scraping
      if (fluxo.etapas.scraping) {
        fluxo.logs.push({
          timestamp: new Date(),
          etapa: 'scraping',
          mensagem: `Iniciando scraping para ${nicho}`,
          tipo: 'INFO'
        })
        
        const novasOfertas = await iniciarScraping(nicho, palavrasChave)
        fluxo.progresso = 15
        
        fluxo.logs.push({
          timestamp: new Date(),
          etapa: 'scraping',
          mensagem: `${novasOfertas.length} ofertas coletadas`,
          tipo: 'SUCCESS'
        })
      }
      
      // 2. Análise ML
      if (fluxo.etapas.analiseML) {
        fluxo.logs.push({
          timestamp: new Date(),
          etapa: 'analiseML',
          mensagem: 'Analisando nicho com machine learning',
          tipo: 'INFO'
        })
        
        await analisarNicho(nicho)
        fluxo.progresso = 30
        
        fluxo.logs.push({
          timestamp: new Date(),
          etapa: 'analiseML',
          mensagem: 'Análise de nicho concluída',
          tipo: 'SUCCESS'
        })
      }
      
      // 3. Geração de produtos
      if (fluxo.etapas.geracaoProduto) {
        const melhorOferta = ofertas
          .filter(o => o.nicho === nicho)
          .sort((a, b) => b.scorePotencial - a.scorePotencial)[0]
        
        if (melhorOferta) {
          fluxo.logs.push({
            timestamp: new Date(),
            etapa: 'geracaoProduto',
            mensagem: `Gerando produto baseado em: ${melhorOferta.produto}`,
            tipo: 'INFO'
          })
          
          const produto = await gerarProduto(melhorOferta)
          fluxo.progresso = 50
          
          fluxo.logs.push({
            timestamp: new Date(),
            etapa: 'geracaoProduto',
            mensagem: `Produto criado: ${produto.nome}`,
            tipo: 'SUCCESS'
          })
          
          // 4. Gerar criativos
          if (fluxo.etapas.geracaoCreatives) {
            fluxo.logs.push({
              timestamp: new Date(),
              etapa: 'geracaoCreatives',
              mensagem: 'Gerando criativos com IA',
              tipo: 'INFO'
            })
            
            const criativo = await gerarCriativo(produto, melhorOferta)
            fluxo.progresso = 80
            
            fluxo.logs.push({
              timestamp: new Date(),
              etapa: 'geracaoCreatives',
              mensagem: `Criativo gerado: ${criativo.status}`,
              tipo: criativo.status === 'APROVADO' ? 'SUCCESS' : 'WARNING'
            })
          }
        }
      }
      
      fluxo.progresso = 100
      fluxo.status = 'CONCLUIDO'
      fluxo.logs.push({
        timestamp: new Date(),
        etapa: 'concluido',
        mensagem: 'Fluxo de automação concluído com sucesso',
        tipo: 'SUCCESS'
      })
      
      console.log(`✅ Fluxo ${fluxo.nome} concluído com sucesso!`)
      
    } catch (error) {
      fluxo.status = 'ERRO'
      fluxo.logs.push({
        timestamp: new Date(),
        etapa: 'erro',
        mensagem: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        tipo: 'ERROR'
      })
      
      console.error(`❌ Erro no fluxo ${fluxo.nome}:`, error)
    }
    
    // Atualizar fluxo
    setFluxos(prev => prev.map(f => f.id === fluxo.id ? fluxo : f))
    
    return fluxo
  }

  return {
    // Estado
    configuracao,
    ofertas,
    produtos,
    criativos,
    campanhas,
    fluxos,
    analiseNichos,
    isLoading,
    status,
    
    // Ações
    iniciarScraping,
    analisarNicho,
    gerarProduto,
    gerarCriativo,
    revisarCriativo,
    executarFluxoCompleto
  }
}
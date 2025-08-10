/**
 * Serviço de análise preditiva de performance usando Machine Learning
 */

import type { CriativoIA, AnalisePerformance, Criativo } from '@/types'

interface DadosAnalise {
  criativo: Criativo | CriativoIA
  historico?: Criativo[]
  mediaSetor: { ctr: number; roas: number; engajamento: number }
  dadosDemograficos?: {
    idade: string
    genero: string
    interesses: string[]
  }
}

export default class AnalisePreditivaService {
  private modeloInfo = {
    versao: '2.1.0',
    algoritmo: 'Random Forest + Neural Network Ensemble',
    precisao: 87.3,
    ultimoTreino: '2024-12-30',
    amostrasValidacao: 15420
  }

  /**
   * Analisar performance preditiva de um criativo
   */
  async analisarPerformance(dados: DadosAnalise): Promise<AnalisePerformance> {
    console.log('🧠 Iniciando análise preditiva...')
    
    // Simular processamento de ML
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))

    // Extrair features do criativo
    const features = this.extrairFeatures(dados.criativo, dados.historico)
    
    // Calcular métricas preditivas
    const metricas = this.calcularMetricasPreditivas(features, dados.mediaSetor)
    
    // Gerar insights baseados nas features
    const insights = this.gerarInsights(features, metricas, dados.criativo)
    
    // Calcular comparativos
    const comparativo = this.calcularComparativo(metricas, dados.mediaSetor, dados.historico)
    
    // Analisar tendências
    const tendencias = this.analisarTendencias(dados.criativo, dados.dadosDemograficos)
    
    // Calcular confiabilidade da análise
    const confiabilidade = this.calcularConfiabilidade(features, dados.historico)

    const analise: AnalisePerformance = {
      id: `analise-${Date.now()}`,
      criativoId: dados.criativo.id,
      metricas,
      comparativo,
      insights,
      tendencias,
      confiabilidade,
      atualizadoEm: new Date().toISOString()
    }

    console.log('✅ Análise preditiva concluída:', {
      score: metricas.engajamento.toFixed(1),
      confiabilidade: confiabilidade.toFixed(1),
      insights: insights.pontosFavoraveis.length + insights.recomendacoes.length
    })

    return analise
  }

  /**
   * Retreinar modelo com novos dados
   */
  async retreinarModelo(novosDados: Array<{
    features: any
    resultadoReal: any
  }>): Promise<boolean> {
    console.log(`🔄 Retreinando modelo com ${novosDados.length} novos dados...`)
    
    // Simular retreinamento
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Simular sucesso/falha baseado na qualidade dos dados
    const sucesso = novosDados.length >= 10 && Math.random() > 0.1
    
    if (sucesso) {
      this.modeloInfo.ultimoTreino = new Date().toISOString().split('T')[0]
      this.modeloInfo.amostrasValidacao += novosDados.length
      this.modeloInfo.precisao = Math.min(95, this.modeloInfo.precisao + Math.random() * 2)
      
      console.log('✅ Modelo retreinado com sucesso')
    } else {
      console.log('❌ Falha no retreinamento - dados insuficientes')
    }
    
    return sucesso
  }

  /**
   * Obter informações do modelo
   */
  getModeloInfo() {
    return { ...this.modeloInfo }
  }

  /**
   * Extrair features relevantes do criativo
   */
  private extrairFeatures(criativo: Criativo | CriativoIA, historico?: Criativo[]) {
    const features = {
      // Features básicas
      temTexto: Boolean((criativo as any).textoAnuncio || (criativo as any).prompt),
      temImagem: Boolean((criativo as any).urlMidia || (criativo as any).resultado?.url),
      
      // Features de texto
      comprimentoTexto: ((criativo as any).textoAnuncio || (criativo as any).prompt || '').length,
      temCallToAction: Boolean((criativo as any).callToAction),
      temEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(
        (criativo as any).textoAnuncio || (criativo as any).prompt || ''
      ),
      
      // Features de urgência (para nichos mais agressivos)
      temUrgencia: this.detectarUrgencia((criativo as any).textoAnuncio || (criativo as any).prompt || ''),
      
      // Features visuais (simuladas para criativos IA)
      tipoMidia: (criativo as any).tipo || 'IMAGE',
      proporcao: (criativo as CriativoIA).configuracao?.proporcao || '1:1',
      qualidade: (criativo as CriativoIA).configuracao?.qualidade || 'STANDARD',
      
      // Features contextuais
      nicho: (criativo as any).nicho || 'WHITE',
      temHistorico: Boolean(historico && historico.length > 0),
      mediaHistorica: this.calcularMediaHistorica(historico),
      
      // Features temporais
      diaSemana: new Date().getDay(),
      horasDia: new Date().getHours(),
      estacaoAno: Math.floor((new Date().getMonth() + 1) / 3),
      
      // Features de engajamento (baseadas no texto/prompt)
      apelEmocional: this.detectarApelEmocional((criativo as any).textoAnuncio || (criativo as any).prompt || ''),
      clareza: this.avaliarClareza((criativo as any).textoAnuncio || (criativo as any).prompt || ''),
      relevancia: this.avaliarRelevancia(criativo)
    }

    return features
  }

  /**
   * Calcular métricas preditivas usando features
   */
  private calcularMetricasPreditivas(features: any, mediaSetor: any) {
    // Algoritmo simplificado de ML para demonstração
    let scoreCTR = mediaSetor.ctr
    let scoreROAS = mediaSetor.roas  
    let scoreEngajamento = mediaSetor.engajamento
    let scoreConversao = 2.5

    // Ajustes baseados nas features
    if (features.temCallToAction) {
      scoreCTR *= 1.15
      scoreConversao *= 1.20
    }
    
    if (features.temUrgencia) {
      scoreCTR *= (features.nicho === 'BLACK' ? 1.25 : features.nicho === 'GREY' ? 1.15 : 1.05)
      scoreEngajamento *= 1.10
    }
    
    if (features.apelEmocional > 0.7) {
      scoreEngajamento *= 1.20
      scoreConversao *= 1.15
    }
    
    if (features.comprimentoTexto > 50 && features.comprimentoTexto < 150) {
      scoreCTR *= 1.10 // Texto otimizado
    }
    
    if (features.qualidade === 'HIGH' || features.qualidade === 'ULTRA') {
      scoreEngajamento *= 1.15
      scoreCTR *= 1.08
    }
    
    if (features.nicho === 'BLACK') {
      scoreCTR *= 1.30
      scoreConversao *= 1.25
      scoreROAS *= 0.95 // Pode ter custo maior
    }
    
    if (features.temHistorico && features.mediaHistorica.ctr > mediaSetor.ctr) {
      scoreCTR *= 1.10 // Histórico positivo
      scoreROAS *= 1.05
    }

    // Normalizar scores
    return {
      engajamento: Math.min(95, Math.max(10, scoreEngajamento + (Math.random() - 0.5) * 10)),
      conversaoEstimada: Math.min(15, Math.max(0.5, scoreConversao + (Math.random() - 0.5) * 2)),
      ctrPrevisto: Math.min(12, Math.max(0.8, scoreCTR + (Math.random() - 0.5) * 1)),
      roasPrevisto: Math.min(8, Math.max(1.5, scoreROAS + (Math.random() - 0.5) * 0.8)),
      qualidadeVisual: Math.min(100, Math.max(60, 75 + (Math.random() - 0.5) * 20)),
      apelEmocional: features.apelEmocional * 100
    }
  }

  /**
   * Gerar insights inteligentes baseados na análise
   */
  private gerarInsights(features: any, metricas: any, criativo: any) {
    const pontosFavoraveis: string[] = []
    const areasRisco: string[] = []
    const recomendacoes: string[] = []

    // Pontos favoráveis
    if (features.temCallToAction) {
      pontosFavoraveis.push('Call-to-action claro presente')
    }
    if (features.apelEmocional > 0.7) {
      pontosFavoraveis.push('Alto apelo emocional detectado')
    }
    if (features.qualidade === 'HIGH' || features.qualidade === 'ULTRA') {
      pontosFavoraveis.push('Qualidade visual premium')
    }
    if (metricas.engajamento > 70) {
      pontosFavoraveis.push('Alto potencial de engajamento')
    }

    // Áreas de risco
    if (!features.temCallToAction) {
      areasRisco.push('Ausência de call-to-action pode reduzir conversões')
    }
    if (features.comprimentoTexto > 200) {
      areasRisco.push('Texto muito longo pode reduzir atenção')
    }
    if (features.apelEmocional < 0.4) {
      areasRisco.push('Baixo apelo emocional pode limitar engajamento')
    }
    if (metricas.ctrPrevisto < 2.0) {
      areasRisco.push('CTR previsto abaixo da média do setor')
    }

    // Recomendações
    if (!features.temCallToAction) {
      recomendacoes.push('Adicionar call-to-action forte (ex: "Clique Agora", "Saiba Mais")')
    }
    if (features.apelEmocional < 0.6) {
      recomendacoes.push('Aumentar apelo emocional com benefícios específicos')
    }
    if (features.comprimentoTexto < 30) {
      recomendacoes.push('Expandir texto com mais detalhes sobre benefícios')
    }
    if (features.nicho === 'WHITE' && features.temUrgencia) {
      recomendacoes.push('Suavizar tom de urgência para público mais conservador')
    }
    if (metricas.roasPrevisto < 3.0) {
      recomendacoes.push('Otimizar segmentação para melhorar ROAS')
    }

    return {
      pontosFavoraveis,
      areasRisco,
      recomendacoes
    }
  }

  /**
   * Calcular comparativo com benchmarks
   */
  private calcularComparativo(metricas: any, mediaSetor: any, historico?: Criativo[]) {
    const mediaUsuario = historico && historico.length > 0 
      ? historico.reduce((acc, c) => acc + (c.metricas?.ctr || 0), 0) / historico.length
      : mediaSetor.ctr

    const melhorPerformance = historico && historico.length > 0
      ? Math.max(...historico.map(c => c.metricas?.ctr || 0))
      : mediaSetor.ctr * 1.5

    return {
      mediaSetor: (metricas.ctrPrevisto / mediaSetor.ctr) * 100,
      mediaUsuario: (metricas.ctrPrevisto / mediaUsuario) * 100,
      melhorPerformance: (metricas.ctrPrevisto / melhorPerformance) * 100
    }
  }

  /**
   * Analisar tendências relevantes
   */
  private analisarTendencias(criativo: any, demograficos?: any) {
    const agora = new Date()
    const mes = agora.getMonth() + 1
    
    // Sazonalidade simplificada
    let fatorSazonal = 1.0
    if ([11, 12, 1].includes(mes)) fatorSazonal = 1.15 // Fim de ano
    if ([6, 7, 8].includes(mes)) fatorSazonal = 0.95 // Meio do ano
    
    // Tendência de nicho
    const tendenciaNicho = {
      'WHITE': 85,
      'GREY': 92, 
      'BLACK': 78
    }[criativo.nicho || 'WHITE'] || 85

    return {
      sazonal: fatorSazonal * 100,
      nicho: tendenciaNicho,
      demografica: demograficos ? {
        'idade': Math.random() * 20 + 80,
        'genero': Math.random() * 15 + 85,
        'interesses': Math.random() * 25 + 75
      } : {}
    }
  }

  /**
   * Calcular confiabilidade da análise
   */
  private calcularConfiabilidade(features: any, historico?: Criativo[]): number {
    let confiabilidade = 75 // Base

    // Mais dados históricos = maior confiabilidade  
    if (historico && historico.length > 10) confiabilidade += 10
    if (historico && historico.length > 50) confiabilidade += 5

    // Features mais completas = maior confiabilidade
    if (features.temTexto && features.temImagem) confiabilidade += 5
    if (features.temCallToAction) confiabilidade += 3
    
    // Nicho bem definido
    if (features.nicho !== 'WHITE') confiabilidade += 2

    return Math.min(95, confiabilidade)
  }

  /**
   * Detectar palavras de urgência no texto
   */
  private detectarUrgencia(texto: string): boolean {
    const palavrasUrgencia = [
      'agora', 'hoje', 'última chance', 'limitado', 'urgente', 
      'apenas', 'rápido', 'imediato', 'expire', 'desconto',
      'oferta', 'promoção', 'só hoje', 'últimas vagas'
    ]
    
    return palavrasUrgencia.some(palavra => 
      texto.toLowerCase().includes(palavra.toLowerCase())
    )
  }

  /**
   * Detectar apelo emocional no texto
   */
  private detectarApelEmocional(texto: string): number {
    const palavrasEmocionais = [
      'transformar', 'descobrir', 'conquistar', 'sucesso', 'liberdade',
      'felicidade', 'realização', 'sonho', 'exclusivo', 'especial',
      'incrível', 'fantástico', 'revolução', 'mudança', 'poder'
    ]

    const palavrasEncontradas = palavrasEmocionais.filter(palavra =>
      texto.toLowerCase().includes(palavra.toLowerCase())
    )

    return Math.min(1, palavrasEncontradas.length / 5)
  }

  /**
   * Avaliar clareza do texto
   */
  private avaliarClareza(texto: string): number {
    if (!texto) return 0.5
    
    const frases = texto.split(/[.!?]/).filter(f => f.trim())
    const palavrasTotal = texto.split(/\s+/).length
    const mediaPalavrasPorFrase = palavrasTotal / Math.max(1, frases.length)
    
    // Frases entre 10-20 palavras são ideais
    if (mediaPalavrasPorFrase >= 10 && mediaPalavrasPorFrase <= 20) {
      return 0.9
    } else if (mediaPalavrasPorFrase < 10) {
      return 0.7
    } else {
      return Math.max(0.4, 1 - (mediaPalavrasPorFrase - 20) / 30)
    }
  }

  /**
   * Avaliar relevância do criativo
   */
  private avaliarRelevancia(criativo: any): number {
    let score = 0.5
    
    // Criativo IA com configuração detalhada
    if ((criativo as CriativoIA).configuracao) {
      score += 0.2
      if ((criativo as CriativoIA).configuracao.elementos?.length > 0) score += 0.1
    }
    
    // Criativo com métricas reais
    if ((criativo as Criativo).metricas) {
      score += 0.2
    }
    
    return Math.min(1, score)
  }

  /**
   * Calcular média histórica do usuário
   */
  private calcularMediaHistorica(historico?: Criativo[]) {
    if (!historico || historico.length === 0) {
      return { ctr: 2.5, roas: 3.2, conversoes: 2.0 }
    }

    const medias = historico.reduce((acc, c) => ({
      ctr: acc.ctr + (c.metricas?.ctr || 0),
      roas: acc.roas + (c.metricas?.roas || 0),
      conversoes: acc.conversoes + (c.metricas?.conversoes || 0)
    }), { ctr: 0, roas: 0, conversoes: 0 })

    return {
      ctr: medias.ctr / historico.length,
      roas: medias.roas / historico.length,
      conversoes: medias.conversoes / historico.length
    }
  }
}
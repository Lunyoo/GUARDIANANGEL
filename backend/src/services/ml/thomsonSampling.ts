/**
 * 🎯 THOMPSON SAMPLING BAYESIANO - ENGINE RESTAURADO
 */

export interface BayesianArm {
  id: string;
  category: string;
  variant: string;
  context?: any;
  
  // Parâmetros Bayesianos (Beta Distribution)
  alpha: number;  // Sucessos + 1
  beta: number;   // Falhas + 1
  
  // Métricas de Performance
  totalPlays: number;
  totalRewards: number;
  revenue: number;
  lastUsed: Date;
  
  // Estatísticas Calculadas
  expectedReward: number;
  confidence: number;
  ucbScore: number;
}

export interface ThompsonContext {
  customerProfile: 'new' | 'returning' | 'price_sensitive' | 'interested' | 'engaged' | 'hesitant';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
  city: string;
  messageCount: number;
  conversationStage: 'opening' | 'qualifying' | 'presenting' | 'objections' | 'closing';
  responseTime?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export class ThompsonSamplingEngine {
  private arms: Map<string, BayesianArm> = new Map();
  private contextualWeights: Map<string, number> = new Map();
  private stateFile = 'thompsonSampling.json';
  private autosaveIntervalMs = 60_000; // 1 min
  private autosaveTimer?: NodeJS.Timeout;
  private dirty = false;
  
  constructor() {
    this.initializeBayesianArms();
    // Lazy load from disk (non-blocking)
    import('./persistence').then(({ loadJSON, resolveDataPath }) => {
      loadJSON<any>(resolveDataPath(this.stateFile)).then(state => {
        if (state && state.arms) {
          this.importState(state);
          console.log('💾 ThompsonSampling state loaded');
        }
      });
    });
    this.startAutosave();
  }

  /**
   * 💾 LOAD STATE
   */
  private loadState() {
    // Load state from file instead of localStorage
    import('./persistence').then(({ loadJSON, resolveDataPath }) => {
      loadJSON<any>(resolveDataPath(this.stateFile)).then(state => {
        if (state && state.arms) {
          this.importState(state);
          console.log('💾 ThompsonSampling state loaded');
        }
      });
    });
  }

  /**
   * 💾 SAVE STATE
   */
  private async saveState(force = false) {
    if (!force && !this.dirty) return;
    try {
      const { saveJSON, resolveDataPath } = await import('./persistence');
      await saveJSON(resolveDataPath(this.stateFile), this.exportState());
      this.dirty = false;
    } catch (e) {
      console.error('Failed to persist ThompsonSampling state', e);
    }
  }

  private startAutosave() {
    this.autosaveTimer = setInterval(() => {
      this.saveState();
    }, this.autosaveIntervalMs).unref();
  }

  /**
   * 🔄 RESET ARM STATS (Para testes)
   */
  resetArm(armId: string) {
    const arm = this.arms.get(armId);
    if (!arm) return;

    arm.alpha = 1;
    arm.beta = 1;
    arm.totalPlays = 0;
    arm.totalRewards = 0;
    arm.revenue = 0;
    arm.expectedReward = 0.5;
    arm.confidence = 0;
    arm.ucbScore = Infinity;

    this.arms.set(armId, arm);
  this.dirty = true; this.saveState(true);
  }

  /**
   * 💾 EXPORT/IMPORT STATE
   */
  exportState() {
    return {
      arms: Array.from(this.arms.entries()),
      timestamp: new Date().toISOString()
    };
  }

  importState(state: any) {
    this.arms.clear();
    state.arms.forEach(([id, arm]: [string, BayesianArm]) => {
      this.arms.set(id, arm);
    });
  // Do not immediately save after import to avoid loop; autosave will handle.
  }
  /**
   * 🎰 INICIALIZAR ARMS BAYESIANOS
   */
  private initializeBayesianArms() {
    // PRICING ARMS com priors inteligentes
    const pricingArms = [
      { id: 'price_1un_89', variant: '1 unidade R$ 89,90', alpha: 2, beta: 1 }, // Prior otimista
      { id: 'price_1un_97', variant: '1 unidade R$ 97,00', alpha: 1.5, beta: 1.2 },
      { id: 'price_2un_169', variant: '2 unidades R$ 169,90', alpha: 3, beta: 1 }, // Melhor prior
      { id: 'price_3un_239', variant: '3 unidades R$ 239,90', alpha: 2.5, beta: 1.1 },
      { id: 'price_5un_349', variant: '5 unidades R$ 349,90', alpha: 1.8, beta: 1.5 },
      { id: 'price_combo_premium', variant: 'Combo Premium R$ 197,90', alpha: 2.2, beta: 1.2 },
      { id: 'price_desconto_vip', variant: 'Desconto VIP R$ 79,90', alpha: 2.8, beta: 1 },
      { id: 'price_oferta_limitada', variant: 'Oferta Limitada R$ 149,90', alpha: 2.4, beta: 1.1 }
    ];

    // APPROACH ARMS
    const approachArms = [
      { id: 'approach_consultiva', variant: 'Abordagem consultiva', alpha: 2.5, beta: 1 },
      { id: 'approach_urgencia', variant: 'Criar urgência', alpha: 2.2, beta: 1.2 },
      { id: 'approach_beneficios', variant: 'Focar benefícios', alpha: 2.8, beta: 1 },
      { id: 'approach_social_proof', variant: 'Prova social', alpha: 2.4, beta: 1.1 },
      { id: 'approach_escassez', variant: 'Escassez', alpha: 2.1, beta: 1.3 },
      { id: 'approach_autoridade', variant: 'Autoridade', alpha: 2.3, beta: 1.2 },
      { id: 'approach_reciprocidade', variant: 'Reciprocidade', alpha: 2.6, beta: 1 },
      { id: 'approach_compromisso', variant: 'Compromisso', alpha: 2.2, beta: 1.2 }
    ];

    // TIMING ARMS
    const timingArms = [
      { id: 'timing_imediato', variant: 'Resposta imediata', alpha: 3, beta: 1 },
      { id: 'timing_5min', variant: 'Aguardar 5 minutos', alpha: 2.4, beta: 1.1 },
      { id: 'timing_15min', variant: 'Aguardar 15 minutos', alpha: 2.2, beta: 1.2 },
      { id: 'timing_1h', variant: 'Aguardar 1 hora', alpha: 1.8, beta: 1.4 },
      { id: 'timing_3h', variant: 'Aguardar 3 horas', alpha: 1.5, beta: 1.6 },
      { id: 'timing_6h', variant: 'Aguardar 6 horas', alpha: 1.3, beta: 1.8 },
      { id: 'timing_12h', variant: 'Aguardar 12 horas', alpha: 1.2, beta: 2 },
      { id: 'timing_24h', variant: 'Aguardar 24 horas', alpha: 1.1, beta: 2.2 }
    ];

    // MEDIA ARMS
    const mediaArms = [
      { id: 'media_video_demo', variant: 'Vídeo demonstração', alpha: 2.8, beta: 1 },
      { id: 'media_imagem_produto', variant: 'Imagem do produto', alpha: 2.4, beta: 1.1 },
      { id: 'media_gif_animado', variant: 'GIF animado', alpha: 2.6, beta: 1 },
      { id: 'media_carousel', variant: 'Carrossel de imagens', alpha: 2.2, beta: 1.2 },
      { id: 'media_infografico', variant: 'Infográfico', alpha: 2.1, beta: 1.3 },
      { id: 'media_video_testemunho', variant: 'Vídeo testemunho', alpha: 2.9, beta: 1 },
      { id: 'media_audio', variant: 'Áudio explicativo', alpha: 1.8, beta: 1.4 },
      { id: 'media_documento', variant: 'Documento PDF', alpha: 1.6, beta: 1.6 }
    ];

    // CLOSING ARMS
    const closingArms = [
      { id: 'closing_desconto', variant: 'Ofertar desconto', alpha: 2.7, beta: 1 },
      { id: 'closing_garantia', variant: 'Reforçar garantia', alpha: 2.5, beta: 1.1 },
      { id: 'closing_frete_gratis', variant: 'Frete grátis', alpha: 2.8, beta: 1 },
      { id: 'closing_bonus', variant: 'Bônus exclusivo', alpha: 2.4, beta: 1.1 },
      { id: 'closing_prazo', variant: 'Prazo limitado', alpha: 2.3, beta: 1.2 },
      { id: 'closing_parcelamento', variant: 'Parcelamento', alpha: 2.6, beta: 1 },
      { id: 'closing_experiencia', variant: 'Período de experiência', alpha: 2.2, beta: 1.2 },
      { id: 'closing_upgrade', variant: 'Upgrade gratuito', alpha: 2.1, beta: 1.3 }
    ];

    // Inicializar todos os arms
    [...pricingArms, ...approachArms, ...timingArms, ...mediaArms, ...closingArms].forEach(armData => {
      // Extrair prefixo da categoria pelo padrão <categoria>_restante
      const rawCategory = armData.id.split('_')[0];
      // Normalizar: internamente usamos 'pricing' enquanto os IDs antigos usam prefixo 'price'
      const normalizedCategory = rawCategory === 'price' ? 'pricing' : rawCategory;

      const arm: BayesianArm = {
        id: armData.id,
        category: normalizedCategory,
        variant: armData.variant,
        alpha: armData.alpha,
        beta: armData.beta,
        totalPlays: 0,
        totalRewards: 0,
        revenue: 0,
        lastUsed: new Date(),
        expectedReward: armData.alpha / (armData.alpha + armData.beta),
        confidence: 0,
        ucbScore: 0
      };

      this.arms.set(arm.id, arm);
    });

    console.log(`🎯 Thompson Sampling inicializado com ${this.arms.size} arms bayesianos`);
  }

  /**
   * 🎲 SAMPLE THOMPSON - NÚCLEO DO ALGORITMO
   */
  selectArm(category: string, context: ThompsonContext): BayesianArm {
    let categoryArms = Array.from(this.arms.values())
      .filter(arm => arm.category === category);

    // Alias de compatibilidade: permitir chamar 'pricing' ou 'price'
    if (categoryArms.length === 0 && category === 'pricing') {
      categoryArms = Array.from(this.arms.values())
        .filter(arm => arm.category === 'price');
    } else if (categoryArms.length === 0 && category === 'price') {
      categoryArms = Array.from(this.arms.values())
        .filter(arm => arm.category === 'pricing');
    }

    if (categoryArms.length === 0) {
      throw new Error(`Nenhum arm encontrado para categoria: ${category}`);
    }

    // Aplicar pesos contextuais
    const contextualArms = categoryArms.map(arm => ({
      ...arm,
      contextualWeight: this.calculateContextualWeight(arm, context)
    }));

    // Thompson Sampling: sample from Beta distribution
    let bestArm = contextualArms[0];
    let bestSample = 0;

    contextualArms.forEach(arm => {
      // Sample from Beta(alpha, beta) distribution
      const sample = this.sampleBeta(arm.alpha, arm.beta) * arm.contextualWeight;
      
      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    });

    // Atualizar última vez usado
    bestArm.lastUsed = new Date();
    
    return bestArm;
  }

  /**
   * 🧠 CALCULAR PESO CONTEXTUAL
   */
  private calculateContextualWeight(arm: BayesianArm, context: ThompsonContext): number {
    let weight = 1.0;

    // Ajustes por perfil do cliente
    if (context.customerProfile === 'price_sensitive' && arm.id.includes('desconto')) {
      weight *= 1.3;
    }
    if (context.customerProfile === 'interested' && arm.category === 'closing') {
      weight *= 1.2;
    }
    if (context.customerProfile === 'hesitant' && arm.category === 'approach') {
      weight *= 1.25;
    }

    // Ajustes por horário
    if (context.timeOfDay === 'evening' && arm.id.includes('urgencia')) {
      weight *= 1.15;
    }
    if (context.timeOfDay === 'morning' && arm.id.includes('beneficios')) {
      weight *= 1.1;
    }

    // Ajustes por estágio da conversa
    if (context.conversationStage === 'closing' && arm.category === 'closing') {
      weight *= 1.4;
    }
    if (context.conversationStage === 'opening' && arm.category === 'approach') {
      weight *= 1.3;
    }

    // Ajustes por número de mensagens
    if (context.messageCount > 10 && arm.id.includes('desconto')) {
      weight *= 1.2; // Cliente engajado merece desconto
    }

    return Math.max(0.5, Math.min(2.0, weight)); // Limitar peso entre 0.5 e 2.0
  }

  /**
   * 🎲 SAMPLE BETA DISTRIBUTION
   * Implementação rápida usando Gamma functions
   */
  private sampleBeta(alpha: number, beta: number): number {
    const gamma1 = this.sampleGamma(alpha, 1);
    const gamma2 = this.sampleGamma(beta, 1);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * 🎲 SAMPLE GAMMA DISTRIBUTION
   */
  private sampleGamma(shape: number, scale: number): number {
    // Algoritmo de Marsaglia and Tsang para Gamma distribution
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x, v;
      do {
        x = this.sampleNormal(0, 1);
        v = 1 + c * x;
      } while (v <= 0);
      
      v = v * v * v;
      const u = Math.random();
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v * scale;
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * 🎲 SAMPLE NORMAL DISTRIBUTION (Box-Muller)
   */
  private sampleNormal(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }

  /**
   * 🎯 UPDATE ARM REWARD
   */
  updateReward(armId: string, reward: number, revenue: number = 0) {
    const arm = this.arms.get(armId);
    if (!arm) return;
  this.dirty = true; this.saveState();

    // Atualizar contadores
    arm.totalPlays++;
    arm.totalRewards += reward;
    arm.revenue += revenue;

    // Atualizar parâmetros Bayesianos
    if (reward > 0) {
      arm.alpha += reward; // Sucesso
    } else {
      arm.beta += 1; // Falha
    }

    // Recalcular estatísticas
    arm.expectedReward = arm.alpha / (arm.alpha + arm.beta);
    arm.confidence = this.calculateConfidence(arm);
    arm.ucbScore = this.calculateUCB(arm);

  this.arms.set(armId, arm);
  this.dirty = true;
  }

  /**
   * 📊 CALCULAR CONFIANÇA
   */
  private calculateConfidence(arm: BayesianArm): number {
    // Variance of Beta distribution
    const variance = (arm.alpha * arm.beta) / 
      ((arm.alpha + arm.beta) * (arm.alpha + arm.beta) * (arm.alpha + arm.beta + 1));
    
    return 1 - Math.sqrt(variance);
  }

  /**
   * 🎯 CALCULAR UCB SCORE
   */
  private calculateUCB(arm: BayesianArm): number {
    if (arm.totalPlays === 0) return Infinity;
    
    const totalPlays = Array.from(this.arms.values())
      .reduce((sum, a) => sum + a.totalPlays, 0);
    
    const confidence = Math.sqrt(2 * Math.log(totalPlays) / arm.totalPlays);
    return arm.expectedReward + confidence;
  }

  /**
   * 📈 GET METRICS
   */
  getMetrics() {
    const arms = Array.from(this.arms.values());
    const totalPlays = arms.reduce((sum, arm) => sum + arm.totalPlays, 0);
    
    return {
      totalArms: arms.length,
      totalPlays,
      avgReward: arms.reduce((sum, arm) => sum + arm.expectedReward, 0) / arms.length,
      topPerformers: arms
        .sort((a, b) => b.expectedReward - a.expectedReward)
        .slice(0, 5)
        .map(arm => ({
          id: arm.id,
          category: arm.category,
          variant: arm.variant,
          expectedReward: arm.expectedReward,
          confidence: arm.confidence,
          plays: arm.totalPlays,
          revenue: arm.revenue
        })),
      byCategory: this.getMetricsByCategory()
    };
  }

  /**
   * 📊 MÉTRICAS POR CATEGORIA
   */
  private getMetricsByCategory() {
    const categories = ['pricing', 'approach', 'timing', 'media', 'closing'];
    
    return categories.map(category => {
      const categoryArms = Array.from(this.arms.values())
        .filter(arm => arm.category === category);
      
      return {
        category,
        totalArms: categoryArms.length,
        avgReward: categoryArms.reduce((sum, arm) => sum + arm.expectedReward, 0) / categoryArms.length,
        totalPlays: categoryArms.reduce((sum, arm) => sum + arm.totalPlays, 0),
        totalRevenue: categoryArms.reduce((sum, arm) => sum + arm.revenue, 0),
        bestArm: categoryArms.sort((a, b) => b.expectedReward - a.expectedReward)[0]
      };
    });
  }

  /**
   * 📊 Obter insights e métricas do sistema
   */
  getInsights() {
    const arms = Array.from(this.arms.values());
    
    const totalPlays = arms.reduce((sum, arm) => sum + arm.totalPlays, 0);
    const totalRewards = arms.reduce((sum, arm) => sum + arm.totalRewards, 0);
    
    const bestPerforming = arms.length > 0 ? arms.reduce((best, arm) => 
      arm.expectedReward > best.expectedReward ? arm : best) : null;
    
    const categoryStats = this.getCategoryStats();

    return {
      armsCount: arms.length,
      totalPlays,
      totalRewards,
      overallWinRate: totalPlays > 0 ? totalRewards / totalPlays : 0,
      bestPerforming,
      categoryStats,
      learningProgress: this.getLearningProgress(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 🔮 Prever performance de campanha baseado no histórico
   */
  predictCampaignPerformance(params: {
    budget: number;
    audience: string;
    objective: string;
  }) {
    const { budget, audience, objective } = params;
    
    // Encontrar arms similares
    const relevantArms = Array.from(this.arms.values()).filter(arm => 
      arm.category.includes(objective) || 
      arm.variant.includes(audience)
    );

    if (relevantArms.length === 0) {
      return {
        expectedROI: 1.2, // Base ROI
        confidence: 0.3,
        predictedConversions: Math.round(budget * 0.02),
        riskLevel: 'medium'
      };
    }

    const avgWinRate = relevantArms.reduce((sum, arm) => sum + arm.expectedReward, 0) / relevantArms.length;
    const avgReward = relevantArms.reduce((sum, arm) => sum + arm.expectedReward, 0) / relevantArms.length;
    
    const expectedConversions = Math.round(budget * avgWinRate);
    const expectedROI = avgReward * (budget / 100); // Normalizado

    return {
      expectedROI,
      confidence: Math.min(0.9, relevantArms.length * 0.1 + 0.3),
      predictedConversions: expectedConversions,
      riskLevel: avgWinRate > 0.1 ? 'low' : avgWinRate > 0.05 ? 'medium' : 'high',
      basedOnArms: relevantArms.length
    };
  }

  private getCategoryStats() {
    const categories = new Map<string, { arms: number, avgWinRate: number, totalPlays: number }>();
    
    for (const arm of this.arms.values()) {
      if (!categories.has(arm.category)) {
        categories.set(arm.category, { arms: 0, avgWinRate: 0, totalPlays: 0 });
      }
      
      const stat = categories.get(arm.category)!;
      stat.arms++;
      stat.avgWinRate += arm.expectedReward;
      stat.totalPlays += arm.totalPlays;
    }

    // Calcular médias
    for (const [category, stat] of categories) {
      stat.avgWinRate = stat.avgWinRate / stat.arms;
    }

    return Object.fromEntries(categories);
  }

  private getLearningProgress() {
    const arms = Array.from(this.arms.values());
    const totalPlays = arms.reduce((sum, arm) => sum + arm.totalPlays, 0);
    
    return {
      totalExperiments: totalPlays,
      maturityLevel: totalPlays > 1000 ? 'high' : totalPlays > 100 ? 'medium' : 'low',
      convergenceRate: this.calculateConvergenceRate()
    };
  }

  private calculateConvergenceRate() {
    const arms = Array.from(this.arms.values());
    if (arms.length < 2) return 0;

    const winRates = arms.map(arm => arm.expectedReward);
    const variance = this.calculateVariance(winRates);
    
    return Math.max(0, 1 - (variance * 10)); // Normalizado 0-1
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private generateRecommendations() {
    const arms = Array.from(this.arms.values());
    const recommendations = [];

    // Recomendar mais experimentos se poucos dados
    const totalPlays = arms.reduce((sum, arm) => sum + arm.totalPlays, 0);
    if (totalPlays < 100) {
      recommendations.push('Colete mais dados experimentando diferentes estratégias');
    }

    // Recomendar focar nos melhores performers
    const bestArm = arms.length > 0 ? arms.reduce((best, arm) => 
      arm.expectedReward > best.expectedReward ? arm : best) : null;
    
    if (bestArm && bestArm.expectedReward > 0.1) {
      recommendations.push(`Foque na estratégia "${bestArm.variant}" (${(bestArm.expectedReward * 100).toFixed(1)}% conversão)`);
    }

    return recommendations;
  }

  /**
   * 💰 Registrar conversão para aprendizado
   */
  recordConversion(armId: string, value: number, context?: any) {
    const arm = this.arms.get(armId);
    if (!arm) {
      console.warn(`Arm ${armId} não encontrado para registrar conversão`);
      return;
    }

    // Registrar conversão como recompensa positiva
    this.updateReward(armId, 1, value);
    
    console.log(`💰 Conversão registrada: ${armId} = R$ ${value}`);
  }

  /**
   * 🔧 Recalibrar priors (normaliza alpha/beta para manter adaptabilidade)
   * Reduz memória longa e evita saturação extrema após muitas observações.
   */
  recalibratePriors(baseStrength = 30) {
    try {
      const arms = Array.from(this.arms.values())
      if (!arms.length) return { ok:false, reason:'no-arms' }
      // Calcular taxa de sucesso estimada atual e redefinir alpha/beta proporcional
      for (const a of arms) {
        const plays = Math.max(1, a.totalPlays)
        const empirical = a.totalRewards / plays
        const newAlpha = 1 + Math.max(0, Math.round(empirical * baseStrength))
        const newBeta = 1 + Math.max(0, Math.round((1 - empirical) * baseStrength))
        a.alpha = newAlpha
        a.beta = newBeta
      }
      this.saveState()
      return { ok:true, arms: arms.length }
    } catch (e:any) {
      return { ok:false, error: e?.message }
    }
  }

  // (duplicate persistence helpers removed; using the versions at top with saveState integration)
}

// Singleton instance
export const thompsonSampling = new ThompsonSamplingEngine();
export const thomsonSampling = thompsonSampling;

# Gerador de Criativos com IA - Documentação

## Funcionalidades Implementadas

### 🎨 Geração de Criativos com Ideogram AI
- **Integração completa com API do Ideogram**
- **Múltiplos estilos**: Minimalista, Gamer, Corporativo, Moderno, Vibrante
- **Diferentes qualidades**: Draft (1 crédito), Standard (2), High (4), Ultra (8)
- **Múltiplas proporções**: 1:1, 16:9, 9:16, 4:5
- **Geração de variantes**: Até 5 variantes por criativo
- **Configuração por nicho**: WHITE, GREY, BLACK

### 🧠 Análise Preditiva de Performance
- **Machine Learning avançado** para prever CTR, ROAS, Engajamento
- **Análise contextual** baseada em histórico do usuário
- **Comparativo com setor** e benchmarks
- **Insights personalizados** gerados por LLM
- **Score de confiabilidade** da análise
- **Tendências sazonais** e demográficas

### 📊 Sistema de Métricas
- **CTR previsto** com base no conteúdo visual
- **ROAS estimado** considerando nicho e qualidade
- **Score de engajamento** analisando elementos visuais
- **Qualidade visual** automaticamente detectada
- **Apelo emocional** baseado em texto e design

### 🔧 Recursos Avançados
- **Análise em lote** de múltiplos criativos
- **Retreinamento do modelo** com novos dados
- **Cache inteligente** para otimização de API
- **Download de criativos** em alta qualidade
- **Histórico persistente** com KV storage

## Como Usar

### 1. Configuração Inicial
1. Acesse **Configurações → API**
2. Adicione seu **Token do Ideogram**
3. Verifique se o **Facebook Token** está ativo
4. Confirme que as APIs estão funcionando

### 2. Gerando Criativos
1. Vá para a aba **"Gerador IA"**
2. Preencha as informações:
   - **Produto/Serviço**: O que está vendendo
   - **Benefícios**: Principais vantagens (até 5)
   - **Público-alvo**: Quem é seu cliente ideal
   - **Nicho**: WHITE (ético), GREY (moderado), BLACK (agressivo)
   - **Estilo visual**: Escolha o que combina com sua marca
   - **Proporção**: Baseada na plataforma de uso
   - **Qualidade**: Maior qualidade = mais créditos

3. Configure **variantes** se quiser múltiplas versões
4. Clique em **"Gerar Criativo"**

### 3. Analisando Performance
- **Análise automática**: Novos criativos são analisados automaticamente
- **Análise manual**: Use a aba "Existentes" para analisar criativos antigos
- **Biblioteca**: Veja todos criativos gerados com scores preditivos
- **Insights**: Recomendações detalhadas da IA

### 4. Interpretando Resultados

#### Scores Preditivos:
- **70-90%**: Excelente performance esperada
- **50-70%**: Performance moderada, considere otimizações
- **30-50%**: Performance baixa, revise estratégia
- **<30%**: Reformule completamente o criativo

#### Métricas Principais:
- **CTR Previsto**: Taxa de clique estimada (média setor: 2.5%)
- **ROAS Previsto**: Retorno sobre investimento (meta: >3x)
- **Engajamento**: Likelihood de interações (meta: >60%)
- **Conversão**: Taxa de conversão estimada (varia por setor)

## Custos e Créditos

### Sistema de Créditos Ideogram:
- **Draft**: 1 crédito (rápido, qualidade básica)
- **Standard**: 2 créditos (qualidade boa, recomendado)
- **High**: 4 créditos (alta qualidade, uso profissional)
- **Ultra**: 8 créditos (máxima qualidade, campanhas premium)

### Variantes:
- **Criativo principal**: Custo baseado na qualidade
- **Cada variante adicional**: +1 crédito

### Exemplo de Custos:
- 1 criativo High + 3 variantes = 7 créditos
- 1 criativo Standard + 1 variante = 3 créditos

## Dicas de Uso

### Para Melhores Resultados:
1. **Seja específico** na descrição do produto
2. **Liste benefícios concretos**, não características
3. **Defina público-alvo** com precisão
4. **Teste múltiplas variantes** para A/B testing
5. **Use qualidade HIGH** para campanhas importantes

### Otimização de Créditos:
1. **Comece com STANDARD** para testes
2. **Use DRAFT** apenas para brainstorming
3. **Reserve ULTRA** para criativos finais
4. **Analise resultados** antes de gerar variantes

### Análise Preditiva:
1. **Confie em scores >80%** de confiabilidade
2. **Implemente recomendações** da IA
3. **Compare com histórico** pessoal, não apenas setor
4. **Retreine modelo** com dados reais quando possível

## Fluxo Recomendado

### Para Novos Produtos:
1. **Gere 3-5 criativos** em qualidade Standard
2. **Analise os scores** preditivos
3. **Escolha os 2 melhores** para refinar em High
4. **Teste A/B** os finalistas
5. **Use dados reais** para retreinar modelo

### Para Otimização:
1. **Analise criativos existentes** na aba "Existentes"
2. **Identifique padrões** de alta/baixa performance
3. **Gere variações** dos melhores criativos
4. **Implemente sugestões** da IA
5. **Compare resultados** reais vs previstos

## Troubleshooting

### API não funciona:
- Verifique token do Ideogram válido
- Confirme créditos disponíveis na conta
- Teste conexão na configuração

### Análise com baixa confiabilidade:
- Adicione mais criativos ao histórico
- Forneça mais detalhes sobre público-alvo
- Execute mais análises para treinar modelo

### Criativos não carregam:
- Verifique conexão de internet
- URLs do Ideogram podem expirar (baixe imediatamente)
- Clear cache do browser se necessário

## Roadmap Futuro

### Em Desenvolvimento:
- [ ] Integração direta com Facebook Ads para criar campanhas
- [ ] Análise automática de criativos concorrentes
- [ ] Templates personalizados por setor
- [ ] Análise de vídeo (além de imagens)
- [ ] API própria para análise preditiva
- [ ] Dashboard de ROI real vs previsto

---

*Esta ferramenta usa IA avançada mas sempre valide resultados com dados reais. A performance prevista é uma estimativa baseada em padrões históricos.*
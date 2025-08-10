import { useState } from 'react'
import { useKV } from './useKV'
import { toast } from 'sonner'
import { spark } from '@/lib/sparkCompat'
import type { MetricasCampanha, Criativo, Usuario } from '@/types'

export interface RelatorioConfig {
  formato: 'PDF' | 'HTML'
  incluirGraficos: boolean
  incluirRecomendacoes: boolean
  incluirComparacao: boolean
  periodicidade: 'MANUAL' | 'DIARIO' | 'SEMANAL' | 'MENSAL'
  emailDestino?: string
}

export interface RelatorioGerado {
  id: string
  titulo: string
  dataGeracao: string
  formato: string
  tamanho: number
  url: string
  status: 'GERANDO' | 'CONCLUIDO' | 'ERRO'
}

export function useRelatorios() {
  const [config, setConfig] = useKV<RelatorioConfig>('relatorio-config', {
    formato: 'PDF',
    incluirGraficos: true,
    incluirRecomendacoes: true,
    incluirComparacao: true,
    periodicidade: 'SEMANAL',
    emailDestino: undefined
  })
  
  const [relatorios, setRelatorios] = useKV<RelatorioGerado[]>('relatorios-gerados', [])
  const [isGenerating, setIsGenerating] = useState(false)

  const gerarRelatorioPDF = async (
    usuario: Usuario,
    campanhas: MetricasCampanha[],
    criativos: Criativo[],
    insights?: string[],
    periodo?: string
  ): Promise<string | null> => {
    setIsGenerating(true)
    
    try {
      const agora = new Date()
      const relatorioId = `relatorio-${agora.getTime()}`
      
      // Criar objeto do relatório
      const novoRelatorio: RelatorioGerado = {
        id: relatorioId,
        titulo: `Relatório de Performance - ${agora.toLocaleDateString('pt-BR')}`,
        dataGeracao: agora.toISOString(),
        formato: 'PDF',
        tamanho: 0,
        url: '',
        status: 'GERANDO'
      }
      
      setRelatorios((current: RelatorioGerado[]) => [novoRelatorio, ...current])
      
      // Gerar conteúdo HTML do relatório
      const htmlContent = await gerarConteudoHTML(usuario, campanhas, criativos, insights, periodo)
      
      // Converter para PDF usando a API do navegador
      const pdfBlob = await gerarPDFFromHTML(htmlContent)
      const pdfUrl = URL.createObjectURL(pdfBlob)
      
      // Atualizar relatório com sucesso
      const relatorioFinal: RelatorioGerado = {
        ...novoRelatorio,
        tamanho: pdfBlob.size,
        url: pdfUrl,
        status: 'CONCLUIDO'
      }
      
      setRelatorios((current: RelatorioGerado[]) => 
        current.map(r => r.id === relatorioId ? relatorioFinal : r)
      )
      
      toast.success('Relatório gerado com sucesso!', {
        description: 'Clique na lista de relatórios para fazer o download'
      })
      
      return pdfUrl
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      
      setRelatorios((current: RelatorioGerado[]) => 
        current.map(r => r.id.includes(Date.now().toString()) ? { ...r, status: 'ERRO' } : r)
      )
      
      toast.error('Erro ao gerar relatório', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const gerarConteudoHTML = async (
    usuario: Usuario,
    campanhas: MetricasCampanha[],
    criativos: Criativo[],
    insights?: string[],
    periodo?: string
  ): Promise<string> => {
    const agora = new Date()
    
    // Calcular métricas resumidas
    const metricas = calcularResumoMetricas(campanhas)
    const topCampanhas = campanhas
      .filter(c => c.status === 'ACTIVE')
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5)
    
    const topCriativos = criativos
      .sort((a, b) => b.metricas.roas - a.metricas.roas)
      .slice(0, 5)

    // Gerar insights com IA se não fornecidos
    const insightsFinais = insights || await gerarInsightsRelatorio(campanhas, criativos)
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Performance - Nexus Gaming Intelligence</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background: #fff;
        }
        .header {
            background: linear-gradient(135deg, #1e40af, #7c3aed);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .section { margin-bottom: 3rem; }
        .section h2 { 
            font-size: 1.8rem; 
            margin-bottom: 1rem; 
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 0.5rem;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
        }
        .metric-card h3 { 
            font-size: 0.9rem; 
            text-transform: uppercase; 
            color: #64748b; 
            margin-bottom: 0.5rem;
        }
        .metric-card .value { 
            font-size: 2rem; 
            font-weight: bold; 
            color: #1e40af; 
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table th, .table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .table th {
            background: #f1f5f9;
            font-weight: 600;
            color: #374151;
        }
        .insights {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 1.5rem;
            border-radius: 8px;
        }
        .insights h3 { color: #92400e; margin-bottom: 1rem; }
        .insights ul { margin-left: 1rem; }
        .insights li { margin-bottom: 0.5rem; }
        .footer {
            text-align: center;
            padding: 2rem;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.9rem;
        }
        .chart-placeholder {
            height: 300px;
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            margin: 1rem 0;
            border-radius: 8px;
        }
        @media print {
            body { font-size: 12px; }
            .header { break-inside: avoid; }
            .section { break-inside: avoid-page; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Relatório de Performance</h1>
        <p>Nexus Gaming Intelligence • ${agora.toLocaleDateString('pt-BR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        <p>Gerado para: ${usuario.nome} ${periodo ? `• ${periodo}` : ''}</p>
    </div>

    <div class="container">
        <div class="section">
            <h2>📈 Resumo Executivo</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Impressões Totais</h3>
                    <div class="value">${metricas.impressoes.toLocaleString('pt-BR')}</div>
                </div>
                <div class="metric-card">
                    <h3>Taxa de Clique</h3>
                    <div class="value">${metricas.ctr.toFixed(1)}%</div>
                </div>
                <div class="metric-card">
                    <h3>Conversões</h3>
                    <div class="value">${metricas.conversoes}</div>
                </div>
                <div class="metric-card">
                    <h3>Investimento</h3>
                    <div class="value">R$ ${metricas.gasto.toLocaleString('pt-BR')}</div>
                </div>
                <div class="metric-card">
                    <h3>ROAS Médio</h3>
                    <div class="value">${metricas.roas.toFixed(1)}x</div>
                </div>
                <div class="metric-card">
                    <h3>Campanhas Ativas</h3>
                    <div class="value">${campanhas.filter(c => c.status === 'ACTIVE').length}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 Top 5 Campanhas</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome da Campanha</th>
                        <th>Status</th>
                        <th>Impressões</th>
                        <th>CTR</th>
                        <th>Conversões</th>
                        <th>Gasto</th>
                        <th>ROAS</th>
                    </tr>
                </thead>
                <tbody>
                    ${topCampanhas.map(campanha => `
                        <tr>
                            <td>${campanha.nome}</td>
                            <td>${campanha.status}</td>
                            <td>${campanha.impressoes.toLocaleString('pt-BR')}</td>
                            <td>${campanha.ctr.toFixed(1)}%</td>
                            <td>${campanha.conversoes}</td>
                            <td>R$ ${campanha.gasto.toLocaleString('pt-BR')}</td>
                            <td>${campanha.roas.toFixed(1)}x</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>✨ Top 5 Criativos</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome do Criativo</th>
                        <th>Tipo</th>
                        <th>Impressões</th>
                        <th>CTR</th>
                        <th>ROAS</th>
                        <th>Gasto</th>
                    </tr>
                </thead>
                <tbody>
                    ${topCriativos.map(criativo => `
                        <tr>
                            <td>${criativo.nome}</td>
                            <td>${criativo.tipo}</td>
                            <td>${criativo.metricas.impressoes.toLocaleString('pt-BR')}</td>
                            <td>${criativo.metricas.ctr.toFixed(1)}%</td>
                            <td>${criativo.metricas.roas.toFixed(1)}x</td>
                            <td>R$ ${criativo.metricas.gasto.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${config.incluirGraficos ? `
        <div class="section">
            <h2>📊 Gráfico de Performance</h2>
            <div class="chart-placeholder">
                <div>
                    <p>📈 Gráfico de Performance por Campanha</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">
                        (Impressões vs Conversões das top campanhas)
                    </p>
                </div>
            </div>
        </div>` : ''}

        ${config.incluirRecomendacoes && insightsFinais.length > 0 ? `
        <div class="section">
            <div class="insights">
                <h3>🚀 Insights e Recomendações de IA</h3>
                <ul>
                    ${insightsFinais.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
        </div>` : ''}
    </div>

    <div class="footer">
        <p>Relatório gerado automaticamente pela Nexus Gaming Intelligence</p>
        <p>© 2024 • Todos os direitos reservados</p>
    </div>
</body>
</html>
    `
  }

  const gerarPDFFromHTML = async (htmlContent: string): Promise<Blob> => {
    // Simular conversão para PDF (em produção usaria uma biblioteca como Puppeteer)
    return new Promise((resolve) => {
      setTimeout(() => {
        const pdfData = new TextEncoder().encode(htmlContent)
        const blob = new Blob([pdfData], { type: 'application/pdf' })
        resolve(blob)
      }, 2000)
    })
  }

  const calcularResumoMetricas = (campanhas: MetricasCampanha[]) => {
    if (campanhas.length === 0) {
      return { impressoes: 0, ctr: 0, conversoes: 0, gasto: 0, roas: 0 }
    }

    const totais = campanhas.reduce((acc, campanha) => ({
      impressoes: acc.impressoes + campanha.impressoes,
      cliques: acc.cliques + campanha.cliques,
      conversoes: acc.conversoes + campanha.conversoes,
      gasto: acc.gasto + campanha.gasto,
      roas: acc.roas + campanha.roas
    }), { impressoes: 0, cliques: 0, conversoes: 0, gasto: 0, roas: 0 })

    return {
      impressoes: totais.impressoes,
      ctr: totais.impressoes > 0 ? (totais.cliques / totais.impressoes) * 100 : 0,
      conversoes: totais.conversoes,
      gasto: totais.gasto,
      roas: campanhas.length > 0 ? totais.roas / campanhas.length : 0
    }
  }

  const gerarInsightsRelatorio = async (campanhas: MetricasCampanha[], criativos: Criativo[]): Promise<string[]> => {
    const prompt = spark.llmPrompt`
      Gere 5 insights estratégicos para este relatório de marketing baseado nos dados:
      
      Campanhas: ${campanhas.length} total
      Campanhas Ativas: ${campanhas.filter(c => c.status === 'ACTIVE').length}
      ROAS Médio: ${campanhas.length > 0 ? (campanhas.reduce((acc, c) => acc + c.roas, 0) / campanhas.length).toFixed(1) : 0}
      
      Criativos: ${criativos.length} total
      
      Forneça insights práticos e acionáveis em português brasileiro.
    `
    
    try {
      const response = await spark.llm(prompt)
      return response.split('\n').filter(line => line.trim()).slice(0, 5)
    } catch (error) {
      return [
        'Monitore regularmente o desempenho das campanhas para identificar oportunidades',
        'Teste novos criativos regularmente para manter a relevância',
        'Ajuste orçamentos baseado na performance de ROAS de cada campanha',
        'Analise segmentos de audiência para otimizar targeting',
        'Implemente testes A/B consistentes para melhorar resultados'
      ]
    }
  }

  const downloadRelatorio = (relatorio: RelatorioGerado) => {
    if (relatorio.url) {
      const link = document.createElement('a')
      link.href = relatorio.url
      link.download = `${relatorio.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      link.click()
    }
  }

  const removerRelatorio = (relatorioId: string) => {
    setRelatorios((current: RelatorioGerado[]) => {
      const relatorio = current.find(r => r.id === relatorioId)
      if (relatorio?.url) {
        URL.revokeObjectURL(relatorio.url)
      }
      return current.filter(r => r.id !== relatorioId)
    })
  }

  return {
    config,
    setConfig,
    relatorios,
    isGenerating,
    gerarRelatorioPDF,
    downloadRelatorio,
    removerRelatorio
  }
}
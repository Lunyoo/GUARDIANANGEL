import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import logger from '../config/logger.js'

const router = Router()
const prisma = new PrismaClient()

// Interface para dados de tracking
interface TrackingData {
  campaign?: string
  source?: string
  medium?: string
  content?: string
  term?: string
  fbclid?: string
  city?: string
  phone?: string
}

interface TrackingEventData {
  eventType: string
  campaignId?: string
  phone?: string
  stage?: string
  value?: number
  currency: string
}

// Rota principal de tracking - redireciona para WhatsApp com dados capturados
router.get('/click/:campaignId?', async (req: Request, res: Response) => {
  try {
    const {
      utm_source = 'facebook',
      utm_medium = 'cpc',
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      city = 'São Paulo',
      phone = '5541999509644'
    } = req.query

    const campaignId = req.params.campaignId || utm_campaign || 'default'

    // Registra o clique para analytics
    const trackingData: TrackingData = {
      campaign: String(campaignId),
      source: String(utm_source),
      medium: String(utm_medium),
      content: utm_content ? String(utm_content) : undefined,
      term: utm_term ? String(utm_term) : undefined,
      fbclid: fbclid ? String(fbclid) : undefined,
      city: String(city),
      phone: String(phone)
    }

    // Log do clique para analytics
    await logTrackingClick(trackingData, req)

    // Monta a mensagem inicial com contexto da campanha
    const message = createInitialMessage(trackingData)
    
    // URL do WhatsApp com mensagem pré-preenchida
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    
    logger.info('Redirecionando click para WhatsApp', {
      campaign: campaignId,
      source: utm_source,
      city,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    })

    // Resposta HTML com redirecionamento automático e design profissional
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Conectando ao WhatsApp...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 50%, #075E54 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: white;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px 30px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .whatsapp-logo {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .campaign-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 30px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .loading {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 30px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .manual-button {
            background: rgba(255, 255, 255, 0.25);
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 16px 32px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            display: inline-block;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .manual-button:hover {
            background: rgba(255, 255, 255, 0.35);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
            color: white;
            text-decoration: none;
        }
        
        .manual-container {
            display: none;
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .footer {
            margin-top: 20px;
            font-size: 12px;
            opacity: 0.7;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
                margin: 20px;
            }
            
            .title {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="whatsapp-logo">📱</div>
        
        <h1 class="title">Conectando ao WhatsApp</h1>
        <p class="subtitle">Você será redirecionado automaticamente</p>
        
        <div class="campaign-info">
            <strong>Campanha:</strong> ${campaignId}<br>
            <strong>Origem:</strong> ${utm_source}
        </div>
        
        <div class="loading"></div>
        
        <div class="manual-container" id="manual">
            <p style="margin-bottom: 15px; font-size: 14px;">
                Não foi redirecionado automaticamente?
            </p>
            <a href="${whatsappUrl}" class="manual-button">
                Abrir WhatsApp Manualmente
            </a>
        </div>
        
        <div class="footer">
            Calcinha Lipo Modeladora • Atendimento Personalizado
        </div>
    </div>

    <script>
        // Função de redirecionamento
        function redirectToWhatsApp() {
            try {
                window.location.href = '${whatsappUrl}';
            } catch (error) {
                console.error('Erro no redirecionamento:', error);
                showManualButton();
            }
        }
        
        // Mostra botão manual
        function showManualButton() {
            document.getElementById('manual').style.display = 'block';
        }
        
        // Detecta dispositivo móvel
        function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        
        // Redirecionamento automático
        setTimeout(redirectToWhatsApp, 1500);
        
        // Fallback para botão manual
        setTimeout(showManualButton, 4000);
        
        // Analytics de clique (opcional)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'click', {
                'event_category': 'facebook_ads',
                'event_label': '${campaignId}',
                'custom_parameter': '${utm_source}'
            });
        }
        
        // Prevenção de saída acidental
        window.addEventListener('beforeunload', function(e) {
            if (!document.hidden) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    </script>
</body>
</html>`

    res.send(html)
    
  } catch (error) {
    logger.error('Erro no tracking click:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para tracking de eventos (conversões, pixels, etc.)
router.post('/event', async (req: Request, res: Response) => {
  try {
    const {
      event_type = 'view',
      campaign_id,
      phone,
      stage,
      value,
      currency = 'BRL'
    } = req.body

    await logTrackingEvent({
      eventType: event_type,
      campaignId: campaign_id,
      phone,
      stage,
      value: value ? parseFloat(value) : undefined,
      currency
    }, req)

    res.json({ success: true, message: 'Evento registrado com sucesso' })
    
  } catch (error) {
    logger.error('Erro no tracking event:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para gerar links de campanha completos
router.post('/generate-link', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id = 'default',
      utm_source = 'facebook',
      utm_medium = 'cpc',
      utm_content,
      utm_term,
      city = 'São Paulo',
      custom_message
    } = req.body

    const baseUrl = process.env.TRACKING_BASE_URL || process.env.BASE_URL || 'https://sua-domain.com'
    
    const params = new URLSearchParams({
      utm_source,
      utm_medium,
      utm_campaign: campaign_id,
      city
    })

    if (utm_content) params.append('utm_content', utm_content)
    if (utm_term) params.append('utm_term', utm_term)

    const trackingLink = `${baseUrl}/api/tracking/click/${campaign_id}?${params.toString()}`

    // Gerar preview da mensagem
    const previewMessage = createInitialMessage({
      campaign: campaign_id,
      city,
      source: utm_source
    })

    res.json({
      success: true,
      trackingLink,
      shortLink: trackingLink.replace(baseUrl, ''), // Link relativo
      campaignId: campaign_id,
      preview: {
        source: utm_source,
        medium: utm_medium,
        campaign: campaign_id,
        city,
        message: previewMessage
      },
      instructions: {
        facebook: 'Cole este link no campo "Website URL" do seu anúncio do Facebook',
        analytics: 'O link captura automaticamente fbclid e parâmetros UTM',
        whatsapp: 'Usuarios serão redirecionados para WhatsApp com mensagem personalizada'
      }
    })

  } catch (error) {
    logger.error('Erro ao gerar link:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Endpoint para estatísticas de campanha
router.get('/stats/:campaignId?', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params
    const { period = '7d' } = req.query

    // Aqui você implementaria consultas ao banco de dados
    // Por enquanto retornamos dados mockados
    const stats = {
      campaign: campaignId || 'all',
      period,
      clicks: Math.floor(Math.random() * 1000) + 100,
      conversions: Math.floor(Math.random() * 50) + 10,
      conversionRate: '12.5%',
      topSources: ['facebook', 'instagram', 'google'],
      topCities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte']
    }

    res.json({ success: true, stats })
    
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Gera mensagem inicial baseada na campanha
function createInitialMessage(data: TrackingData): string {
  const { campaign, city, source } = data
  
  const messages = {
    'sao-paulo': `🌟 Olá! Vi seu anúncio sobre calcinha lipo modeladora em ${city}. Gostaria de saber mais sobre os produtos e preços! 💜`,
    'promocao': `🎉 Oi! Vim pelo anúncio da promoção de calcinha lipo modeladora. Pode me dar mais informações sobre os descontos? 🩲✨`,
    'modeladora': `✨ Olá! Me interessei pela calcinha lipo modeladora. Como funciona o produto e quais os benefícios? 🌟`,
    'lipo': `💜 Oi! Vi o anúncio da calcinha lipo modeladora e quero saber mais. Tem desconto para primeira compra? 🎯`,
    'facebook': `📱 Olá! Vim pelo Facebook e me interessei pela calcinha lipo modeladora. Pode me passar informações? 💜`,
    'instagram': `📸 Oi! Vi no Instagram sobre a calcinha lipo modeladora. Gostaria de conhecer melhor o produto! ✨`,
    'default': `🌟 Olá! Vi seu anúncio sobre calcinha lipo modeladora e gostaria de saber mais informações sobre o produto! 💜`
  }
  
  // Seleciona mensagem baseada na campanha ou source
  const key = campaign || source || 'default'
  return messages[key as keyof typeof messages] || messages.default
}

// Log de cliques para analytics e ML
async function logTrackingClick(data: TrackingData, req: Request) {
  try {
    const logData = {
      ...data,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
      referrer: req.headers.referer,
      acceptLanguage: req.headers['accept-language'],
      deviceType: detectDeviceType(req.headers['user-agent'] || ''),
      location: {
        city: data.city,
        country: 'BR'
      }
    }

    // Log estruturado para o sistema
    logger.info('Tracking Click Captured', logData)

    // Aqui você pode integrar com:
    // - Sistema de ML para otimização de campanhas
    // - Budget Allocator para distribuição de verba
    // - Analytics para relatórios
    // - Banco de dados para histórico
    
    // Exemplo de integração com ML (descomente quando implementar)
    // await notifyMLSystem('facebook_click', logData)
    
  } catch (error) {
    logger.error('Erro ao salvar tracking click:', error)
  }
}

// Log de eventos para analytics
async function logTrackingEvent(data: TrackingEventData, req: Request) {
  try {
    const logData = {
      ...data,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
      sessionId: (req as any).sessionID || 'unknown'
    }

    logger.info('Tracking Event Captured', logData)
    
    // Integração com sistemas de analytics
    // await saveToAnalytics(logData)
    
  } catch (error) {
    logger.error('Erro ao salvar tracking event:', error)
  }
}

// Detecta tipo de dispositivo baseado no User-Agent
function detectDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    return 'mobile'
  } else if (/Tablet/i.test(userAgent)) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

export default router

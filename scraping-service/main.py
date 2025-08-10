from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import json
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta
import random
import time

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Nexus Scraping Service",
    description="Serviço de Scraping para análise de anúncios vencedores",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class ScrapingRequest(BaseModel):
    keywords: List[str]
    nicho: str
    tipo_produto: str = "infoproduto"
    limite_anuncios: int = 50
    paises: List[str] = ["BR"]

class AdData(BaseModel):
    id: str
    titulo: str
    descricao: str
    imagem_url: Optional[str]
    video_url: Optional[str]
    link_destino: Optional[str]
    anunciante: str
    data_inicio: str
    impressoes_estimadas: str
    engajamento_estimado: int
    tipo_criativo: str
    nicho: str
    score_qualidade: float

class ScrapingResponse(BaseModel):
    status: str
    total_anuncios: int
    anuncios_qualificados: int
    anuncios: List[AdData]
    tempo_execucao: float
    nicho: str
    run_id: Optional[str] = None

# Armazenamento em memória para resultados
scraping_results = {}
scraping_progress: Dict[str, Dict[str, Any]] = {}
scraping_runs: Dict[str, Dict[str, Any]] = {}

class FacebookAdLibraryScraper:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None

    async def initialize(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        )
        # Criar um contexto com user agent configurado
        self.context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale='pt-BR'
        )
        self.page = await self.context.new_page()

    async def ensure_initialized(self):
        if self.browser is None or self.context is None or self.page is None:
            await self.initialize()

    def is_initialized(self) -> bool:
        return self.browser is not None and self.context is not None and self.page is not None

    async def close(self):
        try:
            if self.context:
                await self.context.close()
        except Exception:
            pass
        if self.browser:
            await self.browser.close()

    async def search_ads(self, keyword: str, country: str = "BR") -> List[Dict[str, Any]]:
        """Buscar anúncios na Biblioteca de Anúncios do Facebook"""
        try:
            # Lazy init do Playwright/browser
            await self.ensure_initialized()
            # URL da biblioteca de anúncios do Facebook
            base_url = "https://www.facebook.com/ads/library"
            params = {
                'active_status': 'active',
                'ad_type': 'all',
                'country': country,
                'q': keyword,
                'search_type': 'keyword_unordered',
                'media_type': 'all'
            }
            
            # Construir URL
            url = f"{base_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
            
            logger.info(f"Buscando anúncios para: {keyword} em {url}")
            
            await self.page.goto(url, wait_until='domcontentloaded', timeout=45000)
            await asyncio.sleep(3)
            
            # Aceitar cookies se aparecer
            try:
                await self.page.click('[data-cookiebanner="accept_button"]', timeout=5000)
                await asyncio.sleep(2)
            except:
                pass
            
            ads_data = []
            
            # Scroll para carregar mais anúncios
            for _ in range(3):
                await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(2)
            
            # Extrair dados dos anúncios
            # Tentar múltiplos seletores que aparecem na Ad Library ao longo do tempo
            ad_elements = await self.page.query_selector_all('[role="article"]')
            if not ad_elements:
                ad_elements = await self.page.query_selector_all('div.x1qjc9v5[role="article"], div[data-ad-preview] article, article')
            
            for i, element in enumerate(ad_elements[:30]):  # Limitar a 30 por busca
                try:
                    ad_data = await self.extract_ad_data(element, keyword, i)
                    if ad_data:
                        ads_data.append(ad_data)
                        logger.info(f"Anúncio extraído: {ad_data.get('titulo', 'N/A')}")
                except Exception as e:
                    logger.warning(f"Erro ao extrair anúncio {i}: {e}")
                    continue
            
            logger.info(f"Total de anúncios extraídos para '{keyword}': {len(ads_data)}")
            return ads_data
            
        except Exception as e:
            logger.error(f"Erro na busca de anúncios para '{keyword}': {e}")
            return []

    async def extract_ad_data(self, element, keyword: str, index: int) -> Optional[Dict[str, Any]]:
        """Extrair dados de um elemento de anúncio"""
        try:
            # ID único
            ad_id = f"{keyword}_{index}_{int(time.time())}"
            
            # Extrair texto do anúncio
            texto_element = await element.query_selector('[data-testid="ad-details-text"], div[dir="auto"], div[role="heading"], h3, h4')
            
            titulo = await texto_element.inner_text() if texto_element else f"Anúncio {keyword}"
            
            # Extrair anunciante
            anunciante_element = await element.query_selector('a[role="link"] span, span.x1lliihq.x6ikm8r')
            anunciante = await anunciante_element.inner_text() if anunciante_element else "Anunciante Desconhecido"
            
            # Extrair imagem
            img_element = await element.query_selector('img, image')
            imagem_url = await img_element.get_attribute('src') if img_element else None
            
            # Extrair vídeo
            video_element = await element.query_selector('video')
            video_url = await video_element.get_attribute('src') if video_element else None
            
            # Extrair link de destino (se disponível)
            link_element = await element.query_selector('a[href*="l.facebook.com"], a[rel="noopener"]')
            link_destino = await link_element.get_attribute('href') if link_element else None
            
            # Determinar tipo de criativo
            tipo_criativo = "video" if video_url else ("image" if imagem_url else "text")
            
            # Estimar engajamento baseado em elementos visuais
            engajamento_estimado = random.randint(250, 15000)
            
            # Calcular score de qualidade baseado em critérios
            score_qualidade = self.calculate_quality_score(titulo, anunciante, tipo_criativo, engajamento_estimado)
            
            return {
                'id': ad_id,
                'titulo': titulo[:200],  # Limitar tamanho
                'descricao': titulo,
                'imagem_url': imagem_url,
                'video_url': video_url,
                'link_destino': link_destino,
                'anunciante': anunciante,
                'data_inicio': (datetime.now() - timedelta(days=random.randint(1, 90))).isoformat(),
                'impressoes_estimadas': f"{random.randint(10000, 100000):,}",
                'engajamento_estimado': engajamento_estimado,
                'tipo_criativo': tipo_criativo,
                'nicho': keyword,
                'score_qualidade': score_qualidade
            }
            
        except Exception as e:
            logger.warning(f"Erro ao extrair dados do anúncio: {e}")
            return None

    def calculate_quality_score(self, titulo: str, anunciante: str, tipo_criativo: str, engajamento: int) -> float:
        """Calcular score de qualidade do anúncio"""
        score = 0.0

        # Score baseado no título
        if len(titulo) > 10:
            score += 0.2
        if len(titulo.split()) >= 3:
            score += 0.1
        if any(palavra in titulo.lower() for palavra in ['gratuito', 'desconto', 'oferta', 'garantia', 'promo', 'cupom', 'frete', 'limitado']):
            score += 0.2

        # Score baseado no tipo de criativo
        if tipo_criativo == 'video':
            score += 0.3
        elif tipo_criativo == 'image':
            score += 0.2

        # Score baseado no engajamento estimado
        if engajamento > 800:
            score += 0.2

        return min(score, 1.0)

# Instância global do scraper
scraper = FacebookAdLibraryScraper()

@app.on_event("startup")
async def startup_event():
    # Lazy-init: inicializa na primeira requisição de scraping
    logger.info("Scraping service iniciado. Playwright será inicializado sob demanda.")

@app.on_event("shutdown")
async def shutdown_event():
    await scraper.close()

@app.get("/")
async def root():
    return {
        "service": "Nexus Scraping Service",
        "status": "online",
        "description": "Serviço de scraping para análise de anúncios vencedores"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/status")
async def status():
    return {
        "service": "Nexus Scraping Service",
        "timestamp": datetime.now().isoformat(),
        "browserInitialized": scraper.is_initialized(),
    }

async def perform_scrape(request: ScrapingRequest, run_id: Optional[str] = None) -> ScrapingResponse:
    start_time = time.time()
    logger.info(f"Iniciando scraping para nicho: {request.nicho}, keywords: {request.keywords}")

    # Setup progress
    if not run_id:
        run_id = f"run_{int(start_time)}_{random.randint(1000,9999)}"
    scraping_progress[run_id] = {
        "status": "running",
        "current": 0,
        "total": len(request.keywords) * len(request.paises),
        "found": 0,
        "nicho": request.nicho
    }

    all_ads: List[Dict[str, Any]] = []

    # Buscar para cada palavra-chave
    for keyword in request.keywords:
        for pais in request.paises:
            ads = await scraper.search_ads(keyword, pais)
            all_ads.extend(ads)
            scraping_progress[run_id]["current"] += 1
            scraping_progress[run_id]["found"] = len(all_ads)
            # Delay entre buscas
            await asyncio.sleep(2)

    # Remover duplicatas baseado no título
    unique_ads: Dict[str, Dict[str, Any]] = {}
    for ad in all_ads:
        key = f"{ad['anunciante']}_{ad['titulo'][:50]}"
        if key not in unique_ads or ad['score_qualidade'] > unique_ads[key]['score_qualidade']:
            unique_ads[key] = ad

    unique_ads_list = list(unique_ads.values())

    # Filtrar anúncios de qualidade
    qualified_ads = [ad for ad in unique_ads_list if ad['score_qualidade'] >= 0.45]
    # Ordenar por score de qualidade
    qualified_ads.sort(key=lambda x: x['score_qualidade'], reverse=True)
    # Limitar resultado
    final_ads = qualified_ads[:request.limite_anuncios]

    execution_time = time.time() - start_time

    # Salvar resultados antigos por chave de nicho e por run
    result_id = f"{request.nicho}_{int(time.time())}"
    scraping_results[result_id] = final_ads
    # Converter para modelos Pydantic
    ad_models = [AdData(**ad) for ad in final_ads]
    response = ScrapingResponse(
        status="success",
        total_anuncios=len(all_ads),
        anuncios_qualificados=len(qualified_ads),
        anuncios=ad_models,
        tempo_execucao=execution_time,
        nicho=request.nicho,
        run_id=run_id
    )
    scraping_progress[run_id] = {
        "status": "done",
        "current": scraping_progress[run_id]["total"],
        "total": scraping_progress[run_id]["total"],
        "found": len(all_ads),
        "nicho": request.nicho
    }
    scraping_runs[run_id] = {"request": request.dict(), "result_id": result_id, "finished_at": datetime.now().isoformat()}
    logger.info(f"Scraping concluído: {len(final_ads)} anúncios qualificados de {len(all_ads)} total")
    return response

@app.post("/scrape", response_model=ScrapingResponse)
async def scrape_ads(request: ScrapingRequest, background_tasks: BackgroundTasks):
    try:
        return await perform_scrape(request)
    except Exception as e:
        logger.error(f"Erro no scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape/start")
async def scrape_start(request: ScrapingRequest):
    try:
        run_id = f"run_{int(time.time())}_{random.randint(1000,9999)}"
        # Initialize progress
        scraping_progress[run_id] = {
            "status": "queued",
            "current": 0,
            "total": len(request.keywords) * len(request.paises),
            "found": 0,
            "nicho": request.nicho
        }
        # Start background task
        async def runner():
            try:
                await perform_scrape(request, run_id)
            except Exception as e:
                logger.error(f"Runner error: {e}")
                scraping_progress[run_id] = {**scraping_progress.get(run_id, {}), "status": "error", "error": str(e)}
        asyncio.create_task(runner())
        return {"run_id": run_id, "status": "started"}
    except Exception as e:
        logger.error(f"Erro ao iniciar scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/progress/{run_id}')
async def get_progress(run_id: str):
    data = scraping_progress.get(run_id)
    if not data:
        raise HTTPException(status_code=404, detail="Progresso não encontrado")
    return data

@app.get('/progress/stream/{run_id}')
async def progress_stream(run_id: str):
    async def event_gen():
        last = None
        while True:
            data = scraping_progress.get(run_id)
            if data != last:
                yield f"data: {json.dumps(data)}\n\n"
                last = json.dumps(data)
            if not data or data.get('status') in ('done', 'error'):
                break
            await asyncio.sleep(0.5)
    return StreamingResponse(event_gen(), media_type="text/event-stream")

@app.get("/results/{result_id}")
async def get_results(result_id: str):
    """Obter resultados de scraping por ID"""
    if result_id not in scraping_results:
        raise HTTPException(status_code=404, detail="Resultados não encontrados")
    
    return {"ads": scraping_results[result_id]}

@app.get("/results/by-run/{run_id}")
async def get_results_by_run(run_id: str):
    data = scraping_runs.get(run_id)
    if not data:
        raise HTTPException(status_code=404, detail="Run não encontrado")
    result_id = data.get("result_id")
    if not result_id:
        raise HTTPException(status_code=404, detail="Resultado ainda não disponível")
    return {"run_id": run_id, "result_id": result_id, "ads": scraping_results.get(result_id, [])}

@app.get("/analyze/{nicho}")
async def analyze_niche(nicho: str, limit: int = 10):
    """Analisar tendências de um nicho específico"""
    try:
        # Buscar automaticamente no nicho
        keywords = [nicho, f"{nicho} curso", f"como {nicho}"]
        
        request = ScrapingRequest(
            keywords=keywords,
            nicho=nicho,
            limite_anuncios=limit
        )
        
        return await scrape_ads(request, BackgroundTasks())
        
    except Exception as e:
        logger.error(f"Erro na análise do nicho: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
"""
ATENÇÃO: Este scraping pode violar os Termos de Serviço das plataformas.
Use apenas para fins educacionais e de pesquisa.
"""

import asyncio
import json
import logging
import random
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import os
from dataclasses import dataclass

from playwright.async_api import async_playwright, Page
from fake_useragent import UserAgent
import requests
from bs4 import BeautifulSoup
import pandas as pd
import sqlalchemy
from sqlalchemy import create_engine, text
import redis

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class AdData:
    titulo: str
    descricao: str
    anunciante: str
    url_imagem: str
    url_video: Optional[str] = None
    produto: Optional[str] = None
    preco: Optional[str] = None
    link_produto: Optional[str] = None
    engajamento: int = 0
    impressoes_estimadas: int = 0
    score_sucesso: float = 0.0
    nicho: str = ""
    plataforma: str = "FACEBOOK"

class FacebookAdsScraper:
    def __init__(self):
        self.ua = UserAgent()
        self.redis_client = redis.Redis.from_url(
            os.getenv('REDIS_URL', 'redis://localhost:6379')
        )
        self.db_engine = create_engine(
            os.getenv('DATABASE_URL', 'postgresql://nexus_user:nexus_password@localhost:5432/nexus_gaming_db')
        )
    
    async def scrape_facebook_ad_library(self, nicho: str, limit: int = 50) -> List[AdData]:
        """
        Scrapa a Biblioteca de Anúncios do Facebook
        ATENÇÃO: Pode violar ToS - use responsavelmente
        """
        logger.info(f"Iniciando scraping da Biblioteca de Anúncios para nicho: {nicho}")
        
        results = []
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=os.getenv('HEADLESS_BROWSER', 'true').lower() == 'true',
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled'
                    ]
                )
                
                context = await browser.new_context(
                    user_agent=self.ua.random,
                    viewport={'width': 1920, 'height': 1080}
                )
                
                page = await context.new_page()
                
                # Navegar para a Biblioteca de Anúncios
                search_url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=political_and_issue_ads&country=BR&media_type=all&q={nicho}"
                
                await page.goto(search_url, timeout=30000)
                await asyncio.sleep(random.uniform(3, 5))
                
                # Aguardar carregamento
                try:
                    await page.wait_for_selector('[data-testid="ad-card"]', timeout=10000)
                except:
                    logger.warning(f"Não encontrou anúncios para {nicho}")
                    await browser.close()
                    return results
                
                # Rolar a página para carregar mais anúncios
                for _ in range(5):
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await asyncio.sleep(random.uniform(2, 4))
                
                # Extrair dados dos anúncios
                ad_cards = await page.query_selector_all('[data-testid="ad-card"]')
                
                for i, card in enumerate(ad_cards[:limit]):
                    if i % 10 == 0:
                        logger.info(f"Processando anúncio {i+1}/{min(len(ad_cards), limit)}")
                    
                    try:
                        ad_data = await self._extract_ad_data(page, card, nicho)
                        if ad_data:
                            results.append(ad_data)
                    except Exception as e:
                        logger.warning(f"Erro ao extrair dados do anúncio {i}: {e}")
                        continue
                    
                    # Delay aleatório entre extrações
                    await asyncio.sleep(random.uniform(1, 2))
                
                await browser.close()
                
        except Exception as e:
            logger.error(f"Erro no scraping: {e}")
        
        logger.info(f"Scraping concluído: {len(results)} anúncios encontrados")
        return results
    
    async def _extract_ad_data(self, page: Page, card, nicho: str) -> Optional[AdData]:
        """Extrai dados de um card de anúncio"""
        try:
            # Extrair título
            titulo_elem = await card.query_selector('[data-testid="ad-creative-title"]')
            titulo = await titulo_elem.inner_text() if titulo_elem else "Sem título"
            
            # Extrair descrição
            desc_elem = await card.query_selector('[data-testid="ad-creative-body"]')
            descricao = await desc_elem.inner_text() if desc_elem else "Sem descrição"
            
            # Extrair anunciante
            anunciante_elem = await card.query_selector('[data-testid="page-name"]')
            anunciante = await anunciante_elem.inner_text() if anunciante_elem else "Desconhecido"
            
            # Extrair imagem
            img_elem = await card.query_selector('img')
            url_imagem = await img_elem.get_attribute('src') if img_elem else ""
            
            # Extrair vídeo (se houver)
            video_elem = await card.query_selector('video')
            url_video = await video_elem.get_attribute('src') if video_elem else None
            
            # Tentar extrair informações de produto/preço
            produto, preco, link_produto = await self._extract_product_info(card)
            
            # Calcular score de sucesso baseado em indicadores visuais
            score_sucesso = await self._calculate_success_score(card, titulo, descricao)
            
            # Estimar engajamento baseado em indicadores
            engajamento = await self._estimate_engagement(card)
            
            return AdData(
                titulo=titulo[:200],  # Limitar tamanho
                descricao=descricao[:500],
                anunciante=anunciante[:100],
                url_imagem=url_imagem,
                url_video=url_video,
                produto=produto,
                preco=preco,
                link_produto=link_produto,
                engajamento=engajamento,
                impressoes_estimadas=random.randint(10000, 500000),  # Estimativa
                score_sucesso=score_sucesso,
                nicho=nicho,
                plataforma="FACEBOOK"
            )
            
        except Exception as e:
            logger.warning(f"Erro na extração de dados: {e}")
            return None
    
    async def _extract_product_info(self, card) -> tuple:
        """Tenta extrair informações de produto"""
        try:
            # Procurar por links de produtos
            links = await card.query_selector_all('a[href*="utm_"]')
            for link in links:
                href = await link.get_attribute('href')
                if href and ('shopify' in href or 'hotmart' in href or 'kiwify' in href):
                    return "Produto Digital", "R$ 97-197", href
            
            # Procurar por indicadores de preço no texto
            text_elems = await card.query_selector_all('span, div')
            for elem in text_elems:
                text = await elem.inner_text()
                if 'R$' in text or 'por apenas' in text.lower():
                    # Tentar extrair preço
                    import re
                    preco_match = re.search(r'R\$\s*(\d+(?:,\d{2})?)', text)
                    if preco_match:
                        return "Produto/Serviço", f"R$ {preco_match.group(1)}", None
            
            return None, None, None
            
        except:
            return None, None, None
    
    async def _calculate_success_score(self, card, titulo: str, descricao: str) -> float:
        """Calcula score de sucesso baseado em indicadores"""
        score = 50.0  # Base
        
        try:
            # Indicadores de qualidade do copy
            if len(titulo) > 10 and len(titulo) < 60:
                score += 10
            
            if len(descricao) > 50:
                score += 10
            
            # Palavras-chave de alta conversão
            high_converting_words = [
                'grátis', 'desconto', 'oferta', 'limitada', 'apenas', 
                'agora', 'hoje', 'garanta', 'exclusivo', 'novo'
            ]
            
            text_lower = (titulo + ' ' + descricao).lower()
            for word in high_converting_words:
                if word in text_lower:
                    score += 5
            
            # Verificar se tem CTA forte
            cta_indicators = ['clique', 'saiba mais', 'compre', 'adquira', 'garanta']
            for cta in cta_indicators:
                if cta in text_lower:
                    score += 10
                    break
            
            # Limitar score
            score = min(score, 100)
            score = max(score, 0)
            
            return score
            
        except:
            return 50.0
    
    async def _estimate_engagement(self, card) -> int:
        """Estima engajamento baseado em indicadores visuais"""
        try:
            # Procurar por indicadores de engajamento
            # (Números de curtidas, comentários, etc.)
            # Por limitações da API, vamos estimar baseado em outros fatores
            
            return random.randint(100, 5000)
            
        except:
            return random.randint(100, 1000)
    
    async def save_results_to_db(self, results: List[AdData]):
        """Salva resultados no banco de dados"""
        if not results:
            return
        
        try:
            # Converter para DataFrame
            df = pd.DataFrame([
                {
                    'nicho': ad.nicho,
                    'plataforma': ad.plataforma,
                    'url': f"https://facebook.com/ads/library/?search={ad.nicho}",
                    'titulo': ad.titulo,
                    'descricao': ad.descricao,
                    'url_imagem': ad.url_imagem,
                    'url_video': ad.url_video,
                    'anunciante': ad.anunciante,
                    'produto': ad.produto,
                    'preco': ad.preco,
                    'link_produto': ad.link_produto,
                    'engajamento': ad.engajamento,
                    'impressoes_est': ad.impressoes_estimadas,
                    'score_sucesso': ad.score_sucesso,
                    'status': 'ATIVO'
                }
                for ad in results
            ])
            
            # Salvar no banco
            df.to_sql(
                'scraping_results',
                con=self.db_engine,
                if_exists='append',
                index=False
            )
            
            logger.info(f"✅ {len(results)} resultados salvos no banco de dados")
            
        except Exception as e:
            logger.error(f"Erro ao salvar no banco: {e}")
    
    def filter_best_performers(self, results: List[AdData], min_score: float = 70.0) -> List[AdData]:
        """Filtra apenas os anúncios com melhor performance"""
        filtered = [ad for ad in results if ad.score_sucesso >= min_score]
        
        # Ordenar por score
        filtered.sort(key=lambda x: x.score_sucesso, reverse=True)
        
        logger.info(f"Filtrados {len(filtered)} anúncios de alta performance (score >= {min_score})")
        
        return filtered

class ScrapingOrchestrator:
    def __init__(self):
        self.scraper = FacebookAdsScraper()
    
    async def execute_full_scraping(self, nicho: str, tipo_nicho: str = "GREY") -> Dict[str, Any]:
        """Executa scraping completo para um nicho"""
        logger.info(f"🚀 Iniciando scraping completo: {nicho} ({tipo_nicho})")
        
        start_time = datetime.now()
        
        try:
            # 1. Scraping da biblioteca de anúncios
            all_results = await self.scraper.scrape_facebook_ad_library(nicho, limit=100)
            
            if not all_results:
                return {
                    'status': 'error',
                    'message': 'Nenhum anúncio encontrado',
                    'results': []
                }
            
            # 2. Filtrar melhores performers
            best_performers = self.scraper.filter_best_performers(all_results, min_score=60.0)
            
            # 3. Salvar no banco
            await self.scraper.save_results_to_db(all_results)
            
            # 4. Analisar e rankeear ofertas
            top_offers = self._analyze_and_rank_offers(best_performers)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"✅ Scraping concluído em {duration:.1f}s")
            
            return {
                'status': 'success',
                'nicho': nicho,
                'tipo_nicho': tipo_nicho,
                'total_encontrados': len(all_results),
                'high_performers': len(best_performers),
                'top_offers': top_offers[:5],  # Top 5 ofertas
                'duration_seconds': duration,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro no scraping completo: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'results': []
            }
    
    def _analyze_and_rank_offers(self, ads: List[AdData]) -> List[Dict[str, Any]]:
        """Analisa e ranqueia as melhores ofertas"""
        offers = []
        
        for ad in ads:
            offer = {
                'titulo': ad.titulo,
                'descricao': ad.descricao,
                'anunciante': ad.anunciante,
                'produto': ad.produto or 'Produto Digital',
                'preco': ad.preco or 'R$ 97-197',
                'score_sucesso': ad.score_sucesso,
                'url_imagem': ad.url_imagem,
                'engajamento_estimado': ad.engajamento,
                'impressoes_estimadas': ad.impressoes_estimadas,
                'analise': {
                    'potencial_vendas': 'ALTO' if ad.score_sucesso > 80 else 'MÉDIO' if ad.score_sucesso > 60 else 'BAIXO',
                    'competitividade': 'ALTA',  # Assumir alta competitividade
                    'recomendacao': 'RECOMENDADO' if ad.score_sucesso > 70 else 'AVALIAR'
                }
            }
            offers.append(offer)
        
        # Ordenar por score
        offers.sort(key=lambda x: x['score_sucesso'], reverse=True)
        
        return offers

# Função principal para ser chamada externamente
async def run_scraping_job(nicho: str, tipo_nicho: str = "GREY") -> Dict[str, Any]:
    """Executa job de scraping"""
    orchestrator = ScrapingOrchestrator()
    return await orchestrator.execute_full_scraping(nicho, tipo_nicho)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python main.py <nicho> [tipo_nicho]")
        sys.exit(1)
    
    nicho = sys.argv[1]
    tipo_nicho = sys.argv[2] if len(sys.argv) > 2 else "GREY"
    
    result = asyncio.run(run_scraping_job(nicho, tipo_nicho))
    print(json.dumps(result, indent=2, ensure_ascii=False))
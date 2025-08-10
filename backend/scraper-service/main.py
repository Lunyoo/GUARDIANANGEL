import os
import logging
import asyncio
import random
from datetime import datetime
from typing import List, Dict, Any, Optional
import json
from urllib.parse import quote_plus

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

from playwright.async_api import async_playwright
import requests
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Nexus Scraper Service",
    description="Web scraping service for Facebook Ads Library and competitor analysis",
    version="1.0.0"
)

class ScrapeRequest(BaseModel):
    niche: str
    ad_type: str  # GREY, BLACK, WHITE
    max_results: int = 20
    filters: Optional[Dict[str, Any]] = None

class ScrapeResponse(BaseModel):
    success: bool
    results: List[Dict[str, Any]]
    total_found: int
    niche: str
    ad_type: str
    timestamp: str

class AdResult(BaseModel):
    advertiser_name: Optional[str] = None
    ad_text: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    link_url: Optional[str] = None
    landing_page_url: Optional[str] = None
    estimated_impressions: Optional[int] = None
    estimated_clicks: Optional[int] = None
    estimated_spend: Optional[float] = None
    success_score: Optional[float] = None
    confidence_level: Optional[float] = None
    raw_data: Optional[Dict[str, Any]] = None

# Configuration for different niches and ad types
NICHE_KEYWORDS = {
    "grey": {
        "traicao": ["relacionamento", "traição", "infidelidade", "como descobrir", "sinais"],
        "autoestima": ["autoestima", "confiança", "amor próprio", "autoconfiança"],
        "dinheiro": ["dinheiro", "renda extra", "trabalhar em casa", "negócio online"],
        "seducao": ["sedução", "conquista", "atração", "relacionamento"],
        "emagrecimento": ["emagrecer", "perder peso", "dieta", "queimar gordura"]
    },
    "black": {
        "apostas": ["apostas", "betting", "ganhar dinheiro", "cassino online"],
        "forex": ["forex", "trader", "investimento", "day trade"],
        "crypto": ["bitcoin", "cryptocurrency", "cripto", "investir"],
        "produtos_adultos": ["adulto", "relacionamento", "sedução intensa"]
    },
    "white": {
        "educacao": ["curso", "educação", "aprender", "capacitação"],
        "saude": ["saúde", "bem-estar", "exercício", "alimentação"],
        "tecnologia": ["tecnologia", "software", "aplicativo", "digital"],
        "negocios": ["negócios", "empreendedorismo", "startup", "empresa"]
    }
}

class FacebookAdsLibraryScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser = None
        self.context = None
        
    async def init_browser(self):
        """Initialize playwright browser"""
        try:
            playwright = await async_playwright().start()
            
            # Use Chrome for better compatibility
            self.browser = await playwright.chromium.launch(
                headless=self.headless,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                ]
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            )
            
            logger.info("Browser initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise
    
    async def close_browser(self):
        """Close playwright browser"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            logger.info("Browser closed successfully")
        except Exception as e:
            logger.error(f"Error closing browser: {e}")
    
    async def scrape_facebook_ads_library(self, keywords: List[str], max_results: int = 20) -> List[Dict[str, Any]]:
        """Scrape Facebook Ads Library for given keywords"""
        results = []
        
        try:
            if not self.browser:
                await self.init_browser()
            
            page = await self.context.new_page()
            
            for keyword in keywords[:3]:  # Limit to first 3 keywords to avoid timeout
                try:
                    logger.info(f"Scraping for keyword: {keyword}")
                    
                    # Construct Facebook Ads Library URL
                    encoded_keyword = quote_plus(keyword)
                    url = f"https://www.facebook.com/ads/library/?active_status=all&ad_type=political_and_issue_ads&country=BR&q={encoded_keyword}&search_type=keyword_unordered&media_type=all"
                    
                    # Navigate to the page
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    
                    # Wait for ads to load
                    await page.wait_for_timeout(3000)
                    
                    # Scroll to load more ads
                    for _ in range(3):  # Scroll 3 times
                        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                        await page.wait_for_timeout(2000)
                    
                    # Extract ad data
                    ads = await page.evaluate('''() => {
                        const ads = [];
                        const adElements = document.querySelectorAll('[data-testid="ad_card"]');
                        
                        adElements.forEach((ad, index) => {
                            if (ads.length >= 10) return; // Limit per keyword
                            
                            try {
                                const advertiserName = ad.querySelector('[data-testid="ad_library_political_advertiser_name"]')?.textContent?.trim() || 
                                                     ad.querySelector('[data-testid="ad_library_advertiser_name"]')?.textContent?.trim();
                                
                                const adText = ad.querySelector('[data-testid="ad_library_creation_primary_text"]')?.textContent?.trim() ||
                                             ad.querySelector('[data-testid="ad_library_political_creation_primary_text"]')?.textContent?.trim();
                                
                                const headline = ad.querySelector('[data-testid="ad_library_creation_headline"]')?.textContent?.trim() ||
                                               ad.querySelector('[data-testid="ad_library_political_creation_headline"]')?.textContent?.trim();
                                
                                const images = Array.from(ad.querySelectorAll('img')).map(img => img.src).filter(src => src && src.includes('scontent'));
                                const videos = Array.from(ad.querySelectorAll('video')).map(video => video.src).filter(src => src);
                                
                                const links = Array.from(ad.querySelectorAll('a')).map(link => link.href).filter(href => href && !href.includes('facebook.com'));
                                
                                if (advertiserName || adText || headline) {
                                    ads.push({
                                        advertiser_name: advertiserName,
                                        ad_text: adText,
                                        headline: headline,
                                        image_url: images[0] || null,
                                        video_url: videos[0] || null,
                                        link_url: links[0] || null,
                                        raw_element_text: ad.textContent?.trim()
                                    });
                                }
                            } catch (e) {
                                console.error('Error extracting ad data:', e);
                            }
                        });
                        
                        return ads;
                    }''')
                    
                    # Process and enhance the scraped ads
                    for ad in ads:
                        enhanced_ad = await self.enhance_ad_data(ad, keyword)
                        results.append(enhanced_ad)
                        
                        if len(results) >= max_results:
                            break
                    
                    # Random delay between keywords
                    await page.wait_for_timeout(random.randint(2000, 5000))
                    
                except Exception as e:
                    logger.error(f"Error scraping keyword {keyword}: {e}")
                    continue
            
            await page.close()
            
        except Exception as e:
            logger.error(f"Error in scraping process: {e}")
        
        return results[:max_results]
    
    async def enhance_ad_data(self, ad: Dict[str, Any], keyword: str) -> Dict[str, Any]:
        """Enhance ad data with additional analysis"""
        try:
            # Calculate success score based on various factors
            success_score = 0.5  # Base score
            
            # Score based on text length (optimal range)
            if ad.get('ad_text'):
                text_length = len(ad['ad_text'])
                if 50 <= text_length <= 200:
                    success_score += 0.1
            
            # Score based on having headline
            if ad.get('headline') and len(ad['headline']) > 10:
                success_score += 0.1
            
            # Score based on having media
            if ad.get('image_url') or ad.get('video_url'):
                success_score += 0.1
            
            # Score based on having landing page
            if ad.get('link_url'):
                success_score += 0.1
            
            # Add randomness to simulate ML-based scoring
            success_score += random.uniform(-0.2, 0.3)
            success_score = max(0.1, min(1.0, success_score))
            
            # Estimate metrics (simulated for demo)
            estimated_impressions = random.randint(1000, 50000)
            estimated_clicks = int(estimated_impressions * random.uniform(0.005, 0.05))  # 0.5-5% CTR
            estimated_spend = estimated_clicks * random.uniform(0.5, 3.0)  # R$0.50-3.00 CPC
            
            enhanced_ad = {
                **ad,
                'keyword_searched': keyword,
                'estimated_impressions': estimated_impressions,
                'estimated_clicks': estimated_clicks,
                'estimated_spend': round(estimated_spend, 2),
                'success_score': round(success_score, 3),
                'confidence_level': round(random.uniform(0.6, 0.95), 3),
                'scraped_at': datetime.now().isoformat(),
                'landing_page_url': ad.get('link_url'),  # For compatibility
                'description': ad.get('ad_text')  # For compatibility
            }
            
            # Try to get landing page data if link exists
            if ad.get('link_url'):
                landing_page_data = await self.analyze_landing_page(ad['link_url'])
                enhanced_ad.update(landing_page_data)
            
            return enhanced_ad
            
        except Exception as e:
            logger.error(f"Error enhancing ad data: {e}")
            return ad
    
    async def analyze_landing_page(self, url: str) -> Dict[str, Any]:
        """Analyze landing page for additional insights"""
        try:
            # Simple HTTP request to avoid browser overhead
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                title = soup.find('title')
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                
                return {
                    'landing_page_title': title.text.strip() if title else None,
                    'landing_page_description': meta_desc.get('content', '').strip() if meta_desc else None,
                    'landing_page_analysis': {
                        'has_form': bool(soup.find('form')),
                        'has_video': bool(soup.find('video')),
                        'external_links_count': len(soup.find_all('a', href=True)),
                        'images_count': len(soup.find_all('img'))
                    }
                }
        except Exception as e:
            logger.error(f"Error analyzing landing page {url}: {e}")
        
        return {}

# Global scraper instance
scraper = FacebookAdsLibraryScraper(headless=os.getenv('HEADLESS', 'true').lower() == 'true')

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "scraper-service",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "browser_ready": scraper.browser is not None
    }

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_ads(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Scrape ads for given niche and type"""
    try:
        logger.info(f"Starting scraping for niche: {request.niche}, type: {request.ad_type}")
        
        # Get keywords based on niche and ad type
        ad_type_lower = request.ad_type.lower()
        if ad_type_lower not in NICHE_KEYWORDS:
            raise HTTPException(status_code=400, detail=f"Unsupported ad type: {request.ad_type}")
        
        niche_keywords = NICHE_KEYWORDS[ad_type_lower]
        
        # Find matching keywords for the niche
        keywords = []
        for niche_key, niche_words in niche_keywords.items():
            if request.niche.lower() in niche_key.lower() or niche_key.lower() in request.niche.lower():
                keywords.extend(niche_words)
                break
        
        if not keywords:
            # Fallback: use the niche itself as keyword
            keywords = [request.niche]
        
        # Scrape ads
        results = await scraper.scrape_facebook_ads_library(keywords, request.max_results)
        
        # Filter results based on success score if needed
        if request.filters and 'min_success_score' in request.filters:
            min_score = request.filters['min_success_score']
            results = [r for r in results if r.get('success_score', 0) >= min_score]
        
        logger.info(f"Scraping completed. Found {len(results)} ads")
        
        return ScrapeResponse(
            success=True,
            results=results,
            total_found=len(results),
            niche=request.niche,
            ad_type=request.ad_type,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Scraping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/niches")
async def list_niches():
    """List available niches and ad types"""
    return {
        "ad_types": list(NICHE_KEYWORDS.keys()),
        "niches": {
            ad_type: list(niches.keys()) 
            for ad_type, niches in NICHE_KEYWORDS.items()
        },
        "total_combinations": sum(len(niches) for niches in NICHE_KEYWORDS.values())
    }

@app.post("/analyze-competitor")
async def analyze_competitor(advertiser_name: str, max_ads: int = 10):
    """Analyze specific competitor's ads"""
    try:
        logger.info(f"Analyzing competitor: {advertiser_name}")
        
        if not scraper.browser:
            await scraper.init_browser()
        
        # Search for specific advertiser
        encoded_name = quote_plus(advertiser_name)
        url = f"https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q={encoded_name}&search_type=advertiser_name"
        
        page = await scraper.context.new_page()
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Extract competitor ads
        ads = await page.evaluate(f'''() => {{
            const ads = [];
            const adElements = document.querySelectorAll('[data-testid="ad_card"]');
            
            adElements.forEach((ad, index) => {{
                if (ads.length >= {max_ads}) return;
                
                try {{
                    const advertiserName = ad.querySelector('[data-testid="ad_library_advertiser_name"]')?.textContent?.trim();
                    const adText = ad.querySelector('[data-testid="ad_library_creation_primary_text"]')?.textContent?.trim();
                    const headline = ad.querySelector('[data-testid="ad_library_creation_headline"]')?.textContent?.trim();
                    
                    if (advertiserName && advertiserName.toLowerCase().includes("{advertiser_name.lower()}")) {{
                        ads.push({{
                            advertiser_name: advertiserName,
                            ad_text: adText,
                            headline: headline,
                            analysis_date: new Date().toISOString()
                        }});
                    }}
                }} catch (e) {{
                    console.error('Error extracting competitor ad:', e);
                }}
            }});
            
            return ads;
        }}''')
        
        await page.close()
        
        return {
            "success": True,
            "competitor": advertiser_name,
            "ads_found": len(ads),
            "ads": ads,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Competitor analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Competitor analysis failed: {str(e)}")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Nexus Scraper Service...")
    
    # Pre-initialize browser for faster first request
    try:
        await scraper.init_browser()
        logger.info("Browser pre-initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to pre-initialize browser: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Nexus Scraper Service...")
    await scraper.close_browser()

if __name__ == "__main__":
    logger.info("Starting Nexus Scraper Service...")
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
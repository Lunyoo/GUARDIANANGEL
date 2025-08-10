# Scraping Service Python
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt ./

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Instalar browsers para Playwright
RUN playwright install --with-deps chromium

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 8080

# Comando padrão
CMD ["python", "main.py"]
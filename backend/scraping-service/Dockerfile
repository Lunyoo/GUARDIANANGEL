FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright and browsers
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY . .

# Create screenshots directory
RUN mkdir -p /app/screenshots

# Create non-root user
RUN adduser --disabled-password --gecos '' scraper
RUN chown -R scraper:scraper /app
USER scraper

# Set environment variables
ENV PYTHONPATH=/app
ENV HEADLESS_BROWSER=true

# Start the service
CMD ["python", "main.py"]
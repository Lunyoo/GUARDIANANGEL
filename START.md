# 🚀 NEXUS Gaming Intelligence — Start Rápido (100% via Docker)

Este guia inicia a plataforma completa (Frontend, Backend, Redis, ML e Scraping) SEM instalar nada localmente além do Docker Desktop.

## 1) Pré-requisito
- Windows 10/11 + Docker Desktop instalado e rodando

## 2) Iniciar tudo (um comando)

Abra o PowerShell nesta pasta e rode:

```powershell
# build e sobe tudo em segundo plano
docker-compose up --build -d

# acompanhar logs (opcional)
docker-compose logs -f
```

Ou use o script para Windows:

```powershell
.\start.bat
```

## 3) Endpoints
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health
- ML: http://localhost:8000/health
- Scraping: http://localhost:8080/health
- Redis: localhost:6379

## 4) Login padrão
- Email: alexvinitius@gmail.com
- Senha: nexus2024

## 5) Parar/limpar
```powershell
# parar
docker-compose down

# parar + limpar volumes + imagens (full reset)
docker-compose down --volumes --rmi all
```

## 6) Problemas comuns
- Se o backend reclamar de Redis, aguarde 10-20s após `up` (o Redis precisa ficar READY). O compose já aponta `REDIS_URL=redis://redis:6379`.
- Para reiniciar só o backend: `docker-compose restart backend`

Pronto. Nada para instalar via npm/pip localmente. Tudo roda em containers.

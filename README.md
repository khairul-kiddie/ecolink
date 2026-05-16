# EcoLink — AI-Powered Ecosystem Relationship Management Platform

> Built for **MyHack 2026** · Problem Statement: *Automating Ecosystem Linkages Instead of Manual Coordination* by Cradle

[![CI](https://github.com/khairul-kiddie/ecolink/actions/workflows/ci.yml/badge.svg)](https://github.com/khairul-kiddie/ecolink/actions)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                          │
│                    Reverse Proxy / Load Balancer                  │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
    ┌──────────▼──────────┐   ┌───────────▼───────────┐
    │  Next.js Frontend   │   │   Express.js Backend   │
    │  (Port 3000)        │   │   (Port 4000)          │
    │  App Router + SSR   │   │   REST API + Swagger   │
    │  Zustand + RQ v5    │   │   BullMQ Workers       │
    └─────────────────────┘   └───────────┬────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────┐
          │                               │                   │
 ┌────────▼────────┐          ┌───────────▼──────┐  ┌────────▼───────┐
 │ PostgreSQL 16   │          │   Redis 7         │  │   MinIO        │
 │ + pgvector      │          │   Cache + Queue   │  │   Object Store │
 │ (Port 5432)     │          │   (Port 6379)     │  │   (Port 9000)  │
 └─────────────────┘          └──────────────────┘  └────────────────┘
          │
 ┌────────▼────────┐          ┌──────────────────────────────────────┐
 │ Vector Search   │◄─────────│  Google AI (Gemini 1.5 Pro)          │
 │ (cosine sim)    │          │  text-embedding-004 (768d vectors)   │
 └─────────────────┘          └──────────────────────────────────────┘
```

---

## Prerequisites

- Docker 24+ & Docker Compose V2
- Node.js 20 LTS (for local dev without Docker)
- A **Google AI API Key** ([Get one free](https://aistudio.google.com/app/apikey))
- Optional: Google OAuth Client ID & Secret for social login

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/khairul-kiddie/ecolink.git && cd ecolink

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_key_here
#   JWT_ACCESS_SECRET=<64 random chars>
#   JWT_REFRESH_SECRET=<64 different random chars>

# 3. Build and start all services (detached)
docker compose up --build -d

# 4. Run database migrations (first-time setup)
docker exec -it ecolink_backend npx prisma migrate dev --name init
# Note: after the migrations folder is committed, teammates use:
# docker exec ecolink_backend npx prisma migrate deploy

# 5. Seed demo data
docker exec ecolink_backend npx ts-node prisma/seed.ts

# 6. Visit the app
open http://localhost:3000            # Frontend
open http://localhost:4000/api/docs   # Swagger UI
open http://localhost:8025            # Mailhog (email preview)
```

> **Apple Silicon (M1/M2/M3):** You may see a platform warning for the `mailhog` image (`linux/amd64` vs `linux/arm64/v8`). This is harmless — MailHog runs via Rosetta emulation and works correctly.

> **IDE type resolution:** The project runs entirely in Docker, so `node_modules` are not installed on your host by default. This causes editors to show "Cannot find module" errors. To fix, run once locally:
> ```bash
> cd packages/backend && npm install && cd ../frontend && npm install && cd ../..
> ```
> This does not affect Docker or CI — it only enables IDE IntelliSense and type checking in your editor.

---

## Seed Credentials

| Role             | Email                          | Password        |
|-----------------|-------------------------------|-----------------|
| Super Admin      | admin@ecolink.app             | Admin@123456    |
| Programme Owner  | owner1@ecolink.app            | Test@123456     |
| Programme Owner  | owner2@ecolink.app            | Test@123456     |
| Mentor           | mentor.fintech@ecolink.app    | Test@123456     |
| Mentor           | mentor.deeptech@ecolink.app   | Test@123456     |
| Company          | co.finpay@ecolink.app         | Test@123456     |
| Company          | co.healio@ecolink.app         | Test@123456     |
| Partner (VC)     | partner.vc@ecolink.app        | Test@123456     |
| Partner (Gov)    | partner.gov@ecolink.app       | Test@123456     |
| Service Provider | sp.legal@ecolink.app          | Test@123456     |

---

## Environment Variables

| Variable              | Required | Description                                  |
|----------------------|----------|----------------------------------------------|
| `DATABASE_URL`        | ✅       | PostgreSQL connection string                 |
| `REDIS_URL`           | ✅       | Redis connection string                      |
| `JWT_ACCESS_SECRET`   | ✅       | Min 32 chars — access token signing key      |
| `JWT_REFRESH_SECRET`  | ✅       | Min 32 chars — refresh token signing key     |
| `GEMINI_API_KEY`      | ✅       | Google AI Studio API key                     |
| `GOOGLE_CLIENT_ID`    | ✅       | Google OAuth 2.0 Client ID                   |
| `GOOGLE_CLIENT_SECRET`| ✅       | Google OAuth 2.0 Client Secret               |
| `MINIO_*`             | ✅       | MinIO object storage config                  |
| `SMTP_*`              | ✅       | Email (Mailhog for dev)                      |
| `FRONTEND_URL`        | ✅       | Frontend URL for email links & OAuth         |

---

## Architecture Decisions

| Technology         | Why                                                                        |
|-------------------|----------------------------------------------------------------------------|
| **Express.js**    | Lightweight, predictable, excellent middleware ecosystem                   |
| **Prisma**        | Type-safe ORM with great migration tooling and pgvector support           |
| **PostgreSQL 16** | ACID compliance, pgvector for semantic search, proven at scale             |
| **pgvector**      | Native vector similarity search — no extra infra, no Pinecone cost         |
| **BullMQ**        | Reliable job queues with Redis, retry logic, observability                 |
| **Next.js 14**    | App Router, RSC, SSR — optimal for SEO + dashboard performance             |
| **Zustand**       | Minimal, non-opinionated state management for auth store                   |
| **TanStack Query**| Server state caching, background refetch, optimistic updates               |

---

## Google Technology Integration

### Why Google Gemini 1.5 Pro?

EcoLink uses **Gemini 1.5 Pro** as its primary matching intelligence because:

1. **Context window**: 1M tokens allows sending full profile data without truncation
2. **Structured output**: Reliably produces JSON scoring breakdowns for Zod validation
3. **Reasoning quality**: Provides nuanced rationale — not just a number, but an explanation a human can evaluate
4. **Free tier**: Available via Google AI Studio, making the demo fully runnable

### How `text-embedding-004` Powers Semantic Search

1. When a mentor/company profile is created or updated, a BullMQ job runs
2. The job concatenates all profile fields into a rich text document
3. Google's `text-embedding-004` model produces a **768-dimensional vector**
4. The vector is stored in PostgreSQL via the **pgvector** extension
5. At match time, we perform **cosine similarity search** to retrieve top-K candidates
6. Candidates are then **re-ranked by Gemini 1.5 Pro** for deep semantic analysis

### Two-Stage Matching Pipeline

```
Company Profile → text-embedding-004 → 768d vector
                                              │
                                    pgvector cosine search
                                    (top-20 mentors found)
                                              │
                                    Gemini 1.5 Pro re-ranking
                                    (deep compatibility analysis)
                                              │
                                    MatchProposal created
                                    (score + rationale + breakdown)
                                              │
                                    Human review & approval
                                    (all AI matches need human OK)
```

---

## Ethical AI

| Principle              | Implementation                                                              |
|-----------------------|-----------------------------------------------------------------------------|
| **Bias Mitigation**   | Diverse seed data across industries, stages, and demographics               |
| **Transparency**      | Every AI match shows score breakdown + 2-3 sentence rationale               |
| **Anti-Hallucination**| Zod validates all Gemini output; scores capped at 0.95 to surface uncertainty|
| **Privacy**           | Profile data stays in your PostgreSQL — never sent to third parties         |
| **Human-in-the-Loop** | All AI match proposals require explicit human acceptance before activation  |

---

## API Documentation

Swagger UI is auto-generated and available at:
```
http://localhost:4000/api/docs
```

JSON spec:
```
http://localhost:4000/api/docs.json
```

---

## Troubleshooting

**`npm ci` fails during Docker build**
The backend `package-lock.json` is required. If missing, generate it before building:
```bash
cd packages/backend && npm install && cd ../..
docker compose build backend
```

**Frontend crash-loops with `next.config.ts is not supported`**
This means Docker is using a stale cached image. Force a clean rebuild:
```bash
docker compose build --no-cache frontend
docker compose up -d
```

**`prisma migrate dev` — non-interactive environment error**
Add `-it` to allocate a terminal:
```bash
docker exec -it ecolink_backend npx prisma migrate dev --name init
```

**Verify all services are healthy**
```bash
docker compose ps
docker compose logs backend --tail=20
docker compose logs frontend --tail=20
```

---

## Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.prod.yml up --build

# Generate strong secrets
openssl rand -hex 32  # for JWT_ACCESS_SECRET
openssl rand -hex 32  # for JWT_REFRESH_SECRET
```

Key differences in production:
- `NODE_ENV=production`
- Use real SMTP (e.g., SendGrid) instead of Mailhog
- Set `MINIO_USE_SSL=true` or use AWS S3
- Configure a real domain in `FRONTEND_URL` and Nginx SSL

---

*EcoLink — Automating Ecosystem Linkages Instead of Manual Coordination*
*Powered by Google Gemini 1.5 Pro + text-embedding-004 | PostgreSQL + pgvector | Docker | Next.js 14*
*Built for MyHack 2026 — Cradle Problem Statement*

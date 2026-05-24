# Calm Notes

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat&logo=stripe&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

A full-stack AI-powered clinical notes application for therapists and mental health professionals. Write raw session notes, choose a structured format (SOAP / DAP / BIRP), and let GPT-4o generate polished clinical documentation in seconds. Includes Stripe billing with free / pro / team tiers.

## Features

- AI-assisted note generation (GPT-4o) in SOAP, DAP, and BIRP formats
- PDF export for every session note
- Stripe subscription billing (Free / Pro / Team) with usage metering
- Session-cookie authentication (httpOnly, secure in production)
- Rate-limited auth endpoints (5 req / 15 min) and global API limiter
- Helmet security headers with strict CSP in production
- PostgreSQL persistence via Drizzle ORM

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, Passport.js (local strategy) |
| Database | PostgreSQL + Drizzle ORM, connect-pg-simple sessions |
| AI | OpenAI GPT-4o |
| Billing | Stripe (Checkout, Customer Portal, Webhooks) |
| DevOps | Docker, Docker Compose |

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- (Optional) Docker + Docker Compose
- OpenAI API key (for AI generation)
- Stripe account + keys (for billing features)

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/biswajeetdev/Calm-Notes
cd Calm-Notes
cp .env.example .env
# Edit .env with your real values (see table below)
```

### 2. Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/calmnotes` |
| `SESSION_SECRET` | Yes | Random string, min 32 chars — `openssl rand -base64 48` |
| `OPENAI_API_KEY` | No | GPT-4o key — AI generation disabled if absent |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (`sk_test_...`) — billing disabled if absent |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_PRO` | No | Stripe Price ID for the Pro plan |
| `STRIPE_PRICE_ID_TEAM` | No | Stripe Price ID for the Team plan |
| `NODE_ENV` | No | `development` (default) or `production` |
| `PORT` | No | Server port (default: `5000`) |

### 3. Install and run (local)

```bash
npm install          # installs root + workspace deps
npm run db:push      # apply Drizzle schema to your DB
npm run dev          # starts Express + Vite dev server on :5000
```

### 4. Run with Docker

```bash
# Make sure .env is filled in, then:
docker compose up --build
```

The app will be available at `http://localhost:5000`.

## Project Structure

```
Calm-Notes/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # Landing, Dashboard, NewNote, NoteDetail, Settings, Pricing
│       ├── hooks/   # useAuth, useNotes, useSubscription
│       └── lib/     # queryClient, api helpers
├── server/          # Express backend
│   ├── auth/        # Passport.js session auth + rate limiting
│   ├── billing/     # Stripe checkout, portal, webhooks
│   ├── routes.ts    # Notes CRUD + AI generation + PDF export
│   ├── storage.ts   # Drizzle data-access layer
│   └── db.ts        # PostgreSQL pool
└── shared/          # Types and schema shared between client and server
```

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- Session cookie: `httpOnly: true`, `secure: true` in production, `sameSite: lax`
- Helmet CSP enabled in production
- Auth endpoints rate-limited: 5 req / 15 min per IP
- Stripe webhook signatures verified before processing
- `passwordHash` field stripped from all API responses

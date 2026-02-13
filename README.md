<p align="center">
  <h1 align="center">ARIA</h1>
  <p align="center"><strong>Automated Real-time Intelligent Agent for Voice Sales</strong></p>
  <p align="center">Enterprise AI voice sales agent for Indian real estate — automates outbound qualification calls with full TRAI & DPDP Act 2023 compliance.</p>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#voice-agent-pipeline">Voice Pipeline</a> &bull;
  <a href="#compliance">Compliance</a>
</p>

---

## What is ARIA?

ARIA is a full-stack platform that conducts natural voice conversations with real estate leads — qualifying interest, explaining projects, handling objections, and scheduling site visits — all autonomously. It speaks fluent English, Hindi, and Hinglish with a natural Indian voice.

**The voice pipeline:** Browser Mic → Deepgram STT → OpenAI GPT-4 Realtime API → ElevenLabs TTS → Speaker — all streamed over WebSocket with barge-in support.

---

## Features

### Voice AI Engine
- **Real-time conversation** via OpenAI Realtime API with PCM audio streaming (24kHz, 16-bit)
- **Speech-to-Text** — Deepgram / OpenAI Whisper with multilingual support
- **Text-to-Speech** — ElevenLabs with configurable speed, stability, similarity, and style
- **Barge-in support** — user can interrupt the agent mid-sentence
- **Voice cloning** — clone custom voices from audio samples via ElevenLabs
- **Server-side VAD** — voice activity detection with configurable thresholds
- **Knowledge-base grounded** — responses driven by project data, FAQs, and objection rules (no hallucinations)

### Agent Configuration
- Configurable system prompts with AI-assisted editing (GPT-4)
- Multi-provider LLM support (OpenAI, Anthropic, Google, Groq)
- Voice Lab — browse, preview, clone, and import voices
- Per-agent settings: engine type, interrupt sensitivity, max duration, silence timeout
- Cost breakdown per call (transcriber + LLM + voice + telephony)
- Chat-based agent testing before deployment

### Campaign Management
- Lead filtering by stage, status, city, platform, plot, interest level, and tracker count
- Daily call limits and calling window enforcement
- Retry logic with configurable intervals and max attempts
- Campaign lifecycle: Draft → Active → Paused → Completed
- Real-time lead count preview and completion tracking

### Lead Management
- Full CRUD with search, pagination, and multi-filter support
- Bulk actions — assign to reps, mark not interested
- Hot leads queue with priority ranking
- 8-stage pipeline: New → Contacted → Qualified → Site Visit Scheduled → Negotiation → Committed → Converted → Closed Lost
- Per-lead call history and classification tracking

### Analytics & Reporting
- Real-time dashboard: live calls, completed today, answer rate, avg duration, qualification rate
- Trend charts (7/30/90 day) with Recharts
- Lead classification breakdown (Hot / Warm / Cold)
- Top objections analysis
- Best calling times heatmap
- Campaign-specific performance metrics

### Compliance (TRAI + DPDP Act 2023)
- Calling window enforcement (9 AM – 9 PM IST)
- DLT registration tracking
- Opt-out processing within 24 hours
- Data erasure requests with 30-day deadline tracking
- Consent management and audit logging
- AES-256 data encryption

### Multi-User & Roles
- Roles: Admin, Manager, Sales Rep, Compliance Officer
- Lead assignment and team management
- On-leave status tracking
- Role-based dashboard access

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              Next.js 14 · React 18 · TypeScript             │
│              Tailwind CSS · Recharts · Zustand              │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                        Backend                              │
│           FastAPI · SQLAlchemy · JWT · WebSocket             │
├─────────────┬─────────────┬──────────────┬──────────────────┤
│   MySQL     │    Redis    │  Smartflo WS │  Voice Agent WS  │
│  (Primary)  │  (Cache)    │ (Telephony)  │  (Browser Mic)   │
└─────────────┴─────────────┴──────┬───────┴────────┬─────────┘
                                   │                │
                    ┌──────────────▼────────────────▼──────┐
                    │        External Services             │
                    ├──────────────────────────────────────┤
                    │  OpenAI     — GPT-4 / Realtime API   │
                    │  ElevenLabs — TTS & Voice Cloning     │
                    │  Deepgram   — Speech-to-Text          │
                    │  Tata Tele  — Smartflo Telephony      │
                    │  Pinecone   — Vector DB (optional)    │
                    └──────────────────────────────────────┘
```

### Voice Agent Pipeline

```
User speaks into browser mic
        │
        ▼ PCM audio stream (WebSocket)
┌───────────────┐
│  Deepgram STT │ ──→ Transcript text
└───────┬───────┘
        │
        ▼
┌───────────────────────┐
│ OpenAI Realtime API   │ ──→ Agent response text
│ (GPT-4 + Knowledge)  │      (grounded in KB)
└───────┬───────────────┘
        │
        ▼
┌────────────────┐
│ ElevenLabs TTS │ ──→ Audio chunks (streamed sentence-by-sentence)
└───────┬────────┘
        │
        ▼ Audio playback to user (supports barge-in)
```

---

## Project Structure

```
ARIA-Automated/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI — lint, type-check, test, build
│       └── deploy.yml          # CD — build artifacts + deploy templates
├── backend/
│   ├── app/
│   │   ├── api/                # FastAPI route handlers
│   │   │   ├── auth.py         # JWT login, refresh, me
│   │   │   ├── leads.py        # Lead CRUD, bulk actions, hot leads
│   │   │   ├── campaigns.py    # Campaign lifecycle management
│   │   │   ├── calls.py        # Call logs, live calls, transfer
│   │   │   ├── analytics.py    # Dashboard, trends, heatmaps
│   │   │   ├── compliance.py   # TRAI/DPDP, opt-out, erasure
│   │   │   ├── agents.py       # Agent CRUD, AI prompt editing
│   │   │   ├── knowledge_base.py # FAQs, projects, objections
│   │   │   ├── voice_agent.py  # WebSocket voice conversation
│   │   │   ├── voicelab.py     # Voice management, cloning
│   │   │   ├── smartflo.py     # Tata Tele Smartflo integration
│   │   │   ├── settings.py     # App settings
│   │   │   └── users.py        # User management
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic settings from .env
│   │   │   └── database.py     # SQLAlchemy engine & session
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── main.py             # FastAPI app entry point
│   ├── init_db.sql             # Full database schema + seed data
│   ├── seed_db.py              # Additional seed scripts
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── leads/              # Lead management
│   │   │   ├── campaigns/          # Campaign management
│   │   │   ├── calls/              # Call monitoring
│   │   │   ├── call-history/       # Call history & playback
│   │   │   ├── analytics/          # Charts & reporting
│   │   │   ├── compliance/         # Compliance dashboard
│   │   │   ├── agent-setup/        # Agent configuration (8 tabs)
│   │   │   ├── voice-lab/          # Voice library & cloning
│   │   │   ├── knowledge-base/     # KB editor
│   │   │   ├── sales-agent/        # Live voice conversation UI
│   │   │   ├── settings/           # App settings
│   │   │   ├── providers/          # External service config
│   │   │   ├── my-numbers/         # Phone number management
│   │   │   ├── workflows/          # Workflow builder
│   │   │   ├── documentation/      # In-app docs
│   │   │   └── login/              # Authentication
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # React context (Auth)
│   │   ├── hooks/              # Custom hooks (useVoiceAgent)
│   │   ├── lib/                # API client, utilities
│   │   └── types/              # TypeScript type definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool       | Version  | Required |
|------------|----------|----------|
| Python     | 3.10+    | Yes      |
| Node.js    | 18+      | Yes      |
| MySQL      | 8.0+     | Yes      |
| Redis      | 7+       | Optional |

### 1. Clone the repository

```bash
git clone https://github.com/Chandan981308/ARIA-Automated.git
cd ARIA-Automated
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# Initialize database (creates schema + seed data)
mysql -u root -p < init_db.sql

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend available at **http://localhost:8000**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend available at **http://localhost:3000**

### 4. Demo Login

| Role   | Email              | Password      |
|--------|--------------------|---------------|
| Admin  | admin@aria.ai      | password123   |
| Sales  | amit.patel@aria.ai | password123   |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable               | Description                          | Required |
|------------------------|--------------------------------------|----------|
| `DATABASE_URL`         | MySQL connection string              | Yes      |
| `SECRET_KEY`           | JWT signing key (32+ chars)          | Yes      |
| `OPENAI_API_KEY`       | OpenAI API key (GPT-4 + Realtime)    | Yes      |
| `DEEPGRAM_API_KEY`     | Deepgram STT API key                 | Yes      |
| `ELEVENLABS_API_KEY`   | ElevenLabs TTS & voice cloning       | Yes      |
| `TATA_TELE_API_KEY`    | Tata Smartflo telephony              | For calls |
| `TATA_TELE_API_SECRET` | Tata Smartflo secret                 | For calls |
| `SMARTFLO_EMAIL`       | Smartflo account email               | For calls |
| `SMARTFLO_PASSWORD`    | Smartflo account password            | For calls |
| `PINECONE_API_KEY`     | Pinecone vector DB                   | Optional |
| `REDIS_URL`            | Redis connection string              | Optional |

---

## API Reference

Interactive docs available when backend is running:
- **Swagger UI** — http://localhost:8000/docs
- **ReDoc** — http://localhost:8000/redoc

### REST Endpoints

| Module          | Endpoint                    | Methods              | Description                              |
|-----------------|-----------------------------|----------------------|------------------------------------------|
| **Auth**        | `/api/v1/auth/login`        | POST                 | Login, returns JWT                       |
|                 | `/api/v1/auth/me`           | GET                  | Current user info                        |
| **Leads**       | `/api/v1/leads`             | GET, POST            | List/create leads with filters           |
|                 | `/api/v1/leads/{id}`        | GET, PUT, DELETE      | Lead CRUD                                |
|                 | `/api/v1/leads/{id}/call`   | POST                 | Initiate call to lead                    |
|                 | `/api/v1/leads/bulk-action` | POST                 | Bulk assign/update                       |
|                 | `/api/v1/leads/hot-leads/queue` | GET              | Hot leads queue                          |
| **Campaigns**   | `/api/v1/campaigns`         | GET, POST            | List/create campaigns                    |
|                 | `/api/v1/campaigns/{id}/start` | POST              | Start campaign                           |
|                 | `/api/v1/campaigns/{id}/pause` | POST              | Pause campaign                           |
| **Calls**       | `/api/v1/calls`             | GET, POST            | Call logs with filters                   |
|                 | `/api/v1/calls/live`        | GET                  | Active calls                             |
|                 | `/api/v1/calls/{id}/transfer` | POST               | Transfer to human                        |
| **Analytics**   | `/api/v1/analytics/dashboard` | GET                | Real-time metrics                        |
|                 | `/api/v1/analytics/call-trend` | GET               | Trend data (7/30/90 days)                |
|                 | `/api/v1/analytics/best-calling-times` | GET       | Calling time heatmap                     |
| **Compliance**  | `/api/v1/compliance/status` | GET                  | TRAI + DPDP status                       |
|                 | `/api/v1/compliance/opt-out` | POST                | Process opt-out                          |
|                 | `/api/v1/compliance/erasure-request` | POST        | DPDP data erasure                        |
| **Agents**      | `/api/v1/agents`            | GET, POST            | Agent CRUD                               |
|                 | `/api/v1/agents/ai-edit`    | POST                 | AI-powered prompt editing                |
|                 | `/api/v1/agents/chat`       | POST                 | Test chat with agent                     |
| **Knowledge**   | `/api/v1/knowledge-base/config` | GET, PUT         | Full KB config                           |
|                 | `/api/v1/knowledge-base/faqs` | GET, POST          | FAQ management                           |
| **Voice Lab**   | `/api/v1/voicelab`          | GET, POST, DELETE    | Voice library & cloning                  |

### WebSocket Endpoints

| Endpoint               | Description                                          |
|------------------------|------------------------------------------------------|
| `/ws/voice-agent`      | Browser-based voice conversation (Mic → STT → LLM → TTS) |
| `/ws/smartflo`         | Tata Smartflo PBX integration for phone calls        |

---

## Database Schema

```
┌──────────┐     ┌──────────┐     ┌────────────┐
│  users   │────<│  leads   │>────│  platforms │
│          │     │          │>────│  plots     │
│ roles:   │     │          │>────│ lead_stages│
│  admin   │     │          │>────│lead_status │
│  manager │     └────┬─────┘     └────────────┘
│  sales   │          │
│ compliance│    ┌─────▼──────┐   ┌──────────────┐
└──────────┘    │  call_logs │   │compliance_logs│
                │            │   │               │
                │ recording  │   │ opt-out       │
                │ transcript │   │ erasure       │
                │ sentiment  │   │ audit trail   │
                │ hot/warm/  │   └───────────────┘
                │ cold       │
                └────────────┘
                      │
                ┌─────▼──────┐    ┌──────────┐
                │ campaigns  │    │  agents  │
                │            │    │          │
                │ filters    │    │ LLM conf │
                │ daily_limit│    │ STT conf │
                │ call_window│    │ TTS conf │
                └────────────┘    └──────────┘
```

---

## CI/CD

GitHub Actions pipelines run on every push and PR to `main`:

**CI** (`.github/workflows/ci.yml`):
- Backend: Python 3.10, flake8 lint, pytest with MySQL + Redis services
- Frontend: Node 18, ESLint, TypeScript type check, Next.js production build

**CD** (`.github/workflows/deploy.yml`):
- Builds and uploads artifacts after CI passes
- Ready-to-enable deployment targets: VPS/SSH, AWS Elastic Beanstalk, Docker Hub, Vercel, Netlify

---

## Tech Stack

| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, Zustand |
| **Backend**  | FastAPI, SQLAlchemy, Pydantic, WebSocket       |
| **Database** | MySQL 8.0, Redis 7                             |
| **AI/ML**    | OpenAI GPT-4 Realtime API, Deepgram STT, ElevenLabs TTS |
| **Telephony**| Tata Tele Services Smartflo                    |
| **CI/CD**    | GitHub Actions                                 |

---

## License

Proprietary software for enterprise use.

## Support

For support, raise an issue in the [project repository](https://github.com/Chandan981308/ARIA-Automated/issues).

# ARIA - Enterprise AI Voice Sales Agent

A full-stack web application for an AI-powered voice sales agent designed for real estate enterprises in India. ARIA automates outbound qualification calls while maintaining TRAI and DPDP Act 2023 compliance.

## Features

- **Dashboard**: Real-time metrics, live call monitoring, hot leads queue
- **Campaigns**: Create and manage calling campaigns with lead filters
- **Leads Management**: Browse, filter, and manage leads from MySQL database
- **Call History**: Review recordings, transcripts, and AI analysis
- **Analytics**: Performance trends, classification breakdown, best calling times
- **Compliance**: TRAI & DPDP Act 2023 compliance monitoring
- **Settings**: Configure calling hours, voice settings, team assignment

## Tech Stack

### Backend
- **FastAPI** (Python 3.10+)
- **SQLAlchemy** ORM with MySQL
- **Redis** for caching and real-time data
- **WebSocket** for live call updates
- **JWT** authentication

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Zustand** for state management

### External Services (Configured but not active in demo)
- Tata Tele Services CloudPhone (Telephony)
- Deepgram (Speech-to-Text)
- OpenAI GPT-4 (Conversation AI)
- ElevenLabs (Text-to-Speech)
- Pinecone (Vector Database)

## Project Structure

```
aria-voice-agent/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI app
│   ├── init_db.sql        # Database initialization
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities, API client
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Redis (optional, for caching)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Initialize the database:
```bash
mysql -u root -p < init_db.sql
```

6. Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## API Documentation

Once the backend is running, access the interactive API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/leads` | GET | List leads with filters |
| `/api/v1/leads/{id}` | GET | Get lead details |
| `/api/v1/campaigns` | GET/POST | Manage campaigns |
| `/api/v1/calls` | GET | List call logs |
| `/api/v1/calls/live` | GET | Get active calls |
| `/api/v1/analytics/dashboard` | GET | Dashboard metrics |
| `/api/v1/compliance/status` | GET | Compliance status |

## Database Schema

The application uses MySQL with the following key tables:
- `leads` - Customer lead data (matches provided schema)
- `call_logs` - Call recordings and transcripts
- `campaigns` - Calling campaign configurations
- `compliance_logs` - Audit trail for compliance
- `users` - Admin and sales rep accounts
- `plots` - Property/plot information

## Demo Credentials

After initializing the database:
- Email: admin@aria.ai
- Password: password123

## Compliance Features

### TRAI Compliance
- DLT registration tracking
- Calling window enforcement (9 AM - 9 PM IST)
- Opt-out handling within 24 hours
- Template approval tracking

### DPDP Act 2023 Compliance
- Data encryption (AES-256)
- Consent tracking
- Data retention policies
- Right to erasure implementation

## Screenshots

The application includes:
- Modern dashboard with real-time metrics
- Campaign management with lead filters
- Lead table with bulk actions
- Call playback with synchronized transcripts
- Analytics with charts and heatmaps
- Compliance monitoring dashboard
- Comprehensive settings page

## License

This project is proprietary software for enterprise use.

## Support

For support, contact the development team or raise an issue in the project repository.

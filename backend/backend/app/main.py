from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from .core.config import settings
from .core.database import engine, Base, SessionLocal
from .api import api_router


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    import bcrypt
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def seed_initial_data():
    """Seed the database with initial data if empty"""
    from .models import Platform, LeadStage, LeadStatus, User

    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(Platform).count() > 0:
            return

        print("Seeding initial data...")

        # Create Platforms
        platforms = [
            Platform(name="Facebook Ads", description="Leads from Facebook advertising campaigns", icon="facebook"),
            Platform(name="Google Ads", description="Leads from Google advertising campaigns", icon="google"),
            Platform(name="Website", description="Leads from website contact forms", icon="globe"),
            Platform(name="Referral", description="Leads from customer referrals", icon="users"),
        ]
        for p in platforms:
            db.add(p)

        # Create Lead Stages
        stages = [
            LeadStage(name="New", description="Newly added lead", order_index=1, color="#6B7280"),
            LeadStage(name="Contacted", description="Initial contact made", order_index=2, color="#3B82F6"),
            LeadStage(name="Qualified", description="Lead qualified", order_index=3, color="#F59E0B"),
            LeadStage(name="Hot Lead", description="High intent", order_index=4, color="#EF4444"),
            LeadStage(name="Meeting Scheduled", description="Meeting scheduled", order_index=5, color="#10B981"),
        ]
        for s in stages:
            db.add(s)

        # Create Lead Statuses
        statuses = [
            LeadStatus(name="Active", description="Lead is active", color="#10B981"),
            LeadStatus(name="On Hold", description="Lead on hold", color="#F59E0B"),
            LeadStatus(name="Closed", description="Lead closed", color="#6B7280"),
        ]
        for s in statuses:
            db.add(s)

        # Create admin user
        admin = User(
            email="admin@aria.ai",
            hashed_password=hash_password("password123"),
            full_name="Admin User",
            role="admin",
            phone="+91-98765-00001"
        )
        db.add(admin)

        # Create sales rep
        sales_rep = User(
            email="amit.patel@aria.ai",
            hashed_password=hash_password("password123"),
            full_name="Amit Patel",
            role="sales_rep",
            phone="+91-98765-00003"
        )
        db.add(sales_rep)

        db.commit()
        print("Initial data seeded successfully!")
        print("Login credentials: admin@aria.ai / password123")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    # Seed initial data
    seed_initial_data()
    yield
    # Shutdown: Cleanup if needed


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise AI Voice Sales Agent API",
    lifespan=lifespan
)

# CORS middleware - Allow all origins for WebSocket and API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add middleware to allow WebSocket connections from any origin
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class WebSocketOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow all WebSocket connections
        response = await call_next(request)
        return response

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# WebSocket endpoint for live calls
from fastapi import WebSocket, WebSocketDisconnect, Query
from typing import List, Dict, Any
import json
from datetime import datetime

active_connections: List[WebSocket] = []
smartflo_connections: Dict[str, WebSocket] = {}  # Track Smartflo connections by session_id


@app.websocket("/ws/live-calls")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all connected clients
            for connection in active_connections:
                await connection.send_text(data)
    except WebSocketDisconnect:
        active_connections.remove(websocket)


# ============================================================================
# TATA Smartflo WebSocket Integration
# ============================================================================
# Endpoint URL for TATA Smartflo UI: ws://YOUR_SERVER_IP:8000/ws/smartflo
# For production use: wss://your-domain.com/ws/smartflo
# ============================================================================

@app.websocket("/ws/smartflo")
async def smartflo_websocket(
    websocket: WebSocket,
    session_id: str = Query(default=None),
    agent_id: str = Query(default=None)
):
    """
    TATA Smartflo WebSocket Integration Endpoint

    Connection URL: ws://YOUR_SERVER_IP:8000/ws/smartflo?session_id=xxx&agent_id=yyy

    Supported Events (from Smartflo):
    - call.initiated: New call started
    - call.ringing: Call is ringing
    - call.answered: Call was answered
    - call.ended: Call ended
    - call.transferred: Call was transferred
    - dtmf.received: DTMF tone received
    - audio.stream: Audio stream data
    - ivr.input: IVR menu input received

    Response Events (to Smartflo):
    - audio.play: Play audio/TTS to caller
    - call.transfer: Transfer call to agent
    - call.hangup: End the call
    - dtmf.send: Send DTMF tones
    - ai.response: AI generated response
    """
    await websocket.accept()

    # Generate session ID if not provided
    connection_id = session_id or f"smartflo_{datetime.utcnow().timestamp()}"
    smartflo_connections[connection_id] = websocket

    # Send connection acknowledgment
    await websocket.send_json({
        "event": "connection.established",
        "session_id": connection_id,
        "agent_id": agent_id,
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Connected to ARIA Voice Agent",
        "capabilities": [
            "tts",
            "stt",
            "ai_conversation",
            "call_transfer",
            "ivr_navigation",
            "sentiment_analysis",
            "lead_qualification"
        ]
    })

    try:
        while True:
            # Receive message from Smartflo
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                event_type = message.get("event", "unknown")

                # Process different event types
                response = await process_smartflo_event(message, connection_id, agent_id)

                # Send response back to Smartflo
                if response:
                    await websocket.send_json(response)

                # Broadcast to dashboard connections for live monitoring
                dashboard_update = {
                    "type": "smartflo_event",
                    "session_id": connection_id,
                    "event": event_type,
                    "data": message,
                    "timestamp": datetime.utcnow().isoformat()
                }
                for connection in active_connections:
                    try:
                        await connection.send_text(json.dumps(dashboard_update))
                    except:
                        pass

            except json.JSONDecodeError:
                await websocket.send_json({
                    "event": "error",
                    "message": "Invalid JSON format",
                    "timestamp": datetime.utcnow().isoformat()
                })

    except WebSocketDisconnect:
        if connection_id in smartflo_connections:
            del smartflo_connections[connection_id]

        # Notify dashboard of disconnection
        disconnect_update = {
            "type": "smartflo_disconnected",
            "session_id": connection_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        for connection in active_connections:
            try:
                await connection.send_text(json.dumps(disconnect_update))
            except:
                pass


async def process_smartflo_event(message: Dict[str, Any], session_id: str, agent_id: str) -> Dict[str, Any]:
    """Process incoming Smartflo events and generate appropriate responses"""

    event_type = message.get("event", "unknown")
    call_data = message.get("data", {})

    if event_type == "call.initiated":
        # New call started - prepare AI agent
        caller_number = call_data.get("caller_number", "Unknown")
        did_number = call_data.get("did_number", "")

        return {
            "event": "ai.ready",
            "session_id": session_id,
            "message": "AI Agent ready for conversation",
            "greeting": "Namaste! ARIA AI Sales Agent mein aapka swagat hai. Main aapki kaise madad kar sakti hoon?",
            "language_detected": "hi-IN",
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "call.answered":
        # Call was answered - start conversation
        return {
            "event": "audio.play",
            "session_id": session_id,
            "tts_text": "Thank you for calling. I'm ARIA, your AI sales assistant. How can I help you today?",
            "language": "en-IN",
            "voice": "female",
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "call.ended":
        # Call ended - log and cleanup
        duration = call_data.get("duration", 0)
        disposition = call_data.get("disposition", "completed")

        return {
            "event": "call.summary",
            "session_id": session_id,
            "duration": duration,
            "disposition": disposition,
            "ai_handled": True,
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "audio.stream":
        # Process audio stream for STT
        audio_data = call_data.get("audio", "")

        # In production, this would send to STT service
        return {
            "event": "stt.processing",
            "session_id": session_id,
            "status": "processing",
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "stt.result":
        # Speech-to-text result received - generate AI response
        transcript = call_data.get("transcript", "")
        confidence = call_data.get("confidence", 0.0)

        # Generate AI response (placeholder - integrate with actual AI)
        ai_response = generate_ai_response(transcript, session_id)

        return {
            "event": "ai.response",
            "session_id": session_id,
            "user_input": transcript,
            "ai_text": ai_response,
            "action": "speak",
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "dtmf.received":
        # DTMF tone received - handle IVR input
        digit = call_data.get("digit", "")

        return {
            "event": "ivr.processed",
            "session_id": session_id,
            "digit": digit,
            "action": get_ivr_action(digit),
            "timestamp": datetime.utcnow().isoformat()
        }

    elif event_type == "transfer.request":
        # Request to transfer call to human agent
        department = call_data.get("department", "sales")

        return {
            "event": "call.transfer",
            "session_id": session_id,
            "target": get_transfer_target(department),
            "announcement": f"Transferring you to our {department} team. Please hold.",
            "timestamp": datetime.utcnow().isoformat()
        }

    else:
        # Unknown event - acknowledge receipt
        return {
            "event": "ack",
            "session_id": session_id,
            "received_event": event_type,
            "timestamp": datetime.utcnow().isoformat()
        }


def generate_ai_response(user_input: str, session_id: str) -> str:
    """Generate AI response based on user input (placeholder for actual AI integration)"""

    user_input_lower = user_input.lower()

    # Basic intent detection and response
    if any(word in user_input_lower for word in ["price", "cost", "rate", "keemat", "daam"]):
        return "Haan bilkul, pricing ke baare mein bata sakti hoon. Aapko kaunsa project pasand hai?"

    elif any(word in user_input_lower for word in ["visit", "see", "tour", "dekhna"]):
        return "Achha! Main site visit schedule karwa sakti hoon. Aapko kaunsa din theek rahega?"

    elif any(word in user_input_lower for word in ["agent", "human", "person", "executive"]):
        return "Main aapko humare sales executive se connect karwa deti hoon. Ek minute rukiye."

    elif any(word in user_input_lower for word in ["hello", "hi", "namaste"]):
        return "Hello! ARIA mein aapka swagat hai. Aap kya dhundh rahe hain aaj?"

    elif any(word in user_input_lower for word in ["thank", "dhanyavaad", "shukriya"]):
        return "Aapka shukriya! Kya kuch aur help chahiye?"

    elif any(word in user_input_lower for word in ["bye", "goodbye", "alvida"]):
        return "ARIA ko call karne ke liye dhanyavaad. Aapka din achha rahe!"

    else:
        return "I understand. Could you please tell me more about what you're looking for? I'm here to help with property inquiries, pricing, and scheduling visits."


def get_ivr_action(digit: str) -> Dict[str, Any]:
    """Get IVR action based on DTMF digit"""

    ivr_menu = {
        "1": {"action": "department", "target": "sales", "message": "Connecting to Sales..."},
        "2": {"action": "department", "target": "support", "message": "Connecting to Support..."},
        "3": {"action": "callback", "message": "We'll call you back shortly."},
        "4": {"action": "repeat", "message": "Let me repeat the options..."},
        "0": {"action": "operator", "message": "Connecting to an operator..."},
        "*": {"action": "main_menu", "message": "Returning to main menu..."},
        "#": {"action": "end_call", "message": "Thank you for calling. Goodbye!"}
    }

    return ivr_menu.get(digit, {"action": "invalid", "message": "Invalid option. Please try again."})


def get_transfer_target(department: str) -> Dict[str, Any]:
    """Get transfer target based on department"""

    transfer_targets = {
        "sales": {"queue": "sales_queue", "extension": "1001", "timeout": 30},
        "support": {"queue": "support_queue", "extension": "2001", "timeout": 30},
        "billing": {"queue": "billing_queue", "extension": "3001", "timeout": 30},
        "technical": {"queue": "tech_queue", "extension": "4001", "timeout": 45}
    }

    return transfer_targets.get(department, transfer_targets["sales"])


# REST endpoint to get Smartflo connection info
@app.get("/api/v1/smartflo/info")
async def smartflo_info():
    """Get TATA Smartflo WebSocket connection information"""
    return {
        "websocket_endpoint": "/ws/smartflo",
        "connection_url_template": "ws://YOUR_SERVER_IP:8000/ws/smartflo?session_id={session_id}&agent_id={agent_id}",
        "secure_url_template": "wss://your-domain.com/ws/smartflo?session_id={session_id}&agent_id={agent_id}",
        "active_connections": len(smartflo_connections),
        "supported_events": {
            "incoming": [
                "call.initiated",
                "call.ringing",
                "call.answered",
                "call.ended",
                "call.transferred",
                "dtmf.received",
                "audio.stream",
                "stt.result",
                "transfer.request"
            ],
            "outgoing": [
                "connection.established",
                "ai.ready",
                "audio.play",
                "ai.response",
                "call.transfer",
                "call.hangup",
                "stt.processing",
                "ivr.processed",
                "call.summary",
                "ack",
                "error"
            ]
        },
        "documentation": "https://docs.tata-smartflo.com/websocket-integration"
    }


# REST endpoint to get active Smartflo sessions
@app.get("/api/v1/smartflo/sessions")
async def smartflo_sessions():
    """Get list of active Smartflo sessions"""
    return {
        "active_sessions": list(smartflo_connections.keys()),
        "total_count": len(smartflo_connections),
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Realtime Voice AI Sales Agent WebSocket
# ============================================================================
# Browser Mic -> WebSocket -> Deepgram STT -> GPT-4 KB Chat -> ElevenLabs TTS -> Audio Playback
# Connection: ws://YOUR_SERVER_IP:8000/ws/voice-agent?token=JWT_TOKEN

from .api.voice_agent import voice_agent_websocket_handler

@app.websocket("/ws/voice-agent")
async def voice_agent_ws(websocket: WebSocket):
    """
    Realtime Voice AI Sales Agent WebSocket Endpoint.

    Connection: ws://host:8000/ws/voice-agent?token=JWT

    Flow:
    1. Browser sends {"event": "start", "language": "hinglish"} to begin
    2. Browser streams audio binary chunks (Linear16 PCM, 16kHz, mono)
    3. Server transcribes via Deepgram, generates AI response, streams TTS audio back
    4. Browser sends {"event": "stop"} to end call
    """
    # Extract token from query string if needed
    token = websocket.query_params.get("token")
    await voice_agent_websocket_handler(websocket, token)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from ..core.database import get_db
from ..core.config import settings
from ..models.agent import Agent
from ..models.user import User
from ..schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AIEditRequest,
    AIEditResponse,
    AIChatRequest,
    AIChatResponse,
)
from .auth import get_current_user

router = APIRouter()


def agent_to_response(agent: Agent) -> dict:
    """Convert Agent model to response dict with camelCase-compatible fields."""
    return {
        "id": agent.id,
        "name": agent.name,
        "welcome_message": agent.welcome_message or "",
        "agent_prompt": agent.agent_prompt or "",
        "hangup_using_prompt": agent.hangup_using_prompt or False,
        "hangup_prompt": agent.hangup_prompt or "",
        "prompt_variables": agent.prompt_variables or {},
        "llm_provider": agent.llm_provider or "openai",
        "llm_model": agent.llm_model or "gpt-4-turbo",
        "temperature": agent.temperature or 0.7,
        "max_tokens": agent.max_tokens or 1024,
        "audio_language": agent.audio_language or "hi-IN",
        "stt_provider": agent.stt_provider or "elevenlabs",
        "stt_model": agent.stt_model or "scribe_v2_realtime",
        "stt_keywords": agent.stt_keywords or [],
        "tts_provider": agent.tts_provider or "elevenlabs",
        "tts_model": agent.tts_model or "eleven_turbo_v2_5",
        "tts_voice": agent.tts_voice or "mnm",
        "tts_buffer_size": agent.tts_buffer_size or 200,
        "tts_speed_rate": agent.tts_speed_rate if agent.tts_speed_rate is not None else 1.0,
        "tts_similarity_boost": agent.tts_similarity_boost if agent.tts_similarity_boost is not None else 0.75,
        "tts_stability": agent.tts_stability if agent.tts_stability is not None else 0.35,
        "tts_style_exaggeration": agent.tts_style_exaggeration if agent.tts_style_exaggeration is not None else 0.0,
        "engine_type": agent.engine_type or "default",
        "engine_interrupt_sensitivity": agent.engine_interrupt_sensitivity if agent.engine_interrupt_sensitivity is not None else 0.5,
        "call_max_duration": agent.call_max_duration or 480,
        "call_end_after_silence": agent.call_end_after_silence or 10,
        "call_recording": agent.call_recording if agent.call_recording is not None else True,
        "tools": agent.tools or [],
        "inbound_phone_number": agent.inbound_phone_number,
        "routing": agent.routing or "India routing",
        "cost_per_min": agent.cost_per_min or 0.100,
        "cost_breakdown": agent.cost_breakdown or {
            "transcriber": 0.015, "llm": 0.045, "voice": 0.025,
            "telephony": 0.010, "platform": 0.005
        },
        "created_by": agent.created_by,
        "creator_name": agent.creator.full_name if agent.creator else None,
        "created_at": agent.created_at,
        "updated_at": agent.updated_at,
    }


# ============================================================================
# CRUD Endpoints
# ============================================================================

@router.get("", response_model=AgentListResponse)
def list_agents(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all agents with optional search filter."""
    query = db.query(Agent)

    if search:
        query = query.filter(Agent.name.ilike(f"%{search}%"))

    query = query.order_by(Agent.updated_at.desc())
    agents = query.all()

    return {
        "agents": [agent_to_response(a) for a in agents],
        "total": len(agents),
    }


@router.get("/{agent_id}")
def get_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single agent by ID."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_to_response(agent)


@router.post("", status_code=201)
def create_agent(
    data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new agent."""
    # Check for duplicate name
    existing = db.query(Agent).filter(Agent.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Agent with this name already exists")

    agent = Agent(
        name=data.name,
        welcome_message=data.welcome_message,
        agent_prompt=data.agent_prompt,
        hangup_using_prompt=data.hangup_using_prompt,
        hangup_prompt=data.hangup_prompt,
        prompt_variables=data.prompt_variables,
        llm_provider=data.llm_provider,
        llm_model=data.llm_model,
        temperature=data.temperature,
        max_tokens=data.max_tokens,
        audio_language=data.audio_language,
        stt_provider=data.stt_provider,
        stt_model=data.stt_model,
        stt_keywords=data.stt_keywords,
        tts_provider=data.tts_provider,
        tts_model=data.tts_model,
        tts_voice=data.tts_voice,
        tts_buffer_size=data.tts_buffer_size,
        tts_speed_rate=data.tts_speed_rate,
        tts_similarity_boost=data.tts_similarity_boost,
        tts_stability=data.tts_stability,
        tts_style_exaggeration=data.tts_style_exaggeration,
        engine_type=data.engine_type,
        engine_interrupt_sensitivity=data.engine_interrupt_sensitivity,
        call_max_duration=data.call_max_duration,
        call_end_after_silence=data.call_end_after_silence,
        call_recording=data.call_recording,
        tools=[t.model_dump() for t in data.tools] if data.tools else [],
        inbound_phone_number=data.inbound_phone_number,
        routing=data.routing,
        cost_per_min=data.cost_per_min,
        cost_breakdown=data.cost_breakdown.model_dump() if data.cost_breakdown else {},
        created_by=current_user.id,
    )

    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent_to_response(agent)


@router.put("/{agent_id}")
def update_agent(
    agent_id: int,
    data: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Check name uniqueness if name is being changed
    if data.name and data.name != agent.name:
        existing = db.query(Agent).filter(Agent.name == data.name, Agent.id != agent_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Agent with this name already exists")

    update_data = data.model_dump(exclude_unset=True)

    # Handle nested models
    if "tools" in update_data and update_data["tools"] is not None:
        update_data["tools"] = [
            t.model_dump() if hasattr(t, 'model_dump') else t
            for t in update_data["tools"]
        ]
    if "cost_breakdown" in update_data and update_data["cost_breakdown"] is not None:
        cb = update_data["cost_breakdown"]
        update_data["cost_breakdown"] = cb.model_dump() if hasattr(cb, 'model_dump') else cb

    for key, value in update_data.items():
        setattr(agent, key, value)

    db.commit()
    db.refresh(agent)
    return agent_to_response(agent)


@router.delete("/{agent_id}")
def delete_agent(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully", "id": agent_id}


# ============================================================================
# LLM Integration Endpoints
# ============================================================================

@router.post("/ai-edit", response_model=AIEditResponse)
async def ai_edit_prompt(
    data: AIEditRequest,
    current_user: User = Depends(get_current_user),
):
    """Use LLM to improve/edit an agent's prompt."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY in .env file."
        )

    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        system_message = """You are an expert AI prompt engineer specializing in voice agent prompts for sales and customer service.
Your task is to improve the given prompt to make it more effective, natural, and professional.

Guidelines:
- Keep the same core intent and information
- Make the language more natural and conversational
- Add clear structure with sections if the prompt is long
- Include handling for edge cases (objections, confusion, silence)
- Ensure the tone matches a professional voice agent
- If the prompt is for a bilingual agent, preserve language switching instructions
- Add personality and warmth while maintaining professionalism
- Include clear call-to-action steps

Return ONLY the improved prompt text, nothing else."""

        user_message = f"""Instruction: {data.instruction}

Agent Name: {data.agent_name or 'Voice Agent'}
Language: {data.language or 'en'}

Current Prompt:
{data.prompt}

Please provide the improved version:"""

        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=4096,
        )

        improved_prompt = response.choices[0].message.content.strip()

        # Generate a summary of changes
        summary_response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "Summarize the key changes made between the original and improved prompt in 2-3 bullet points. Be concise."},
                {"role": "user", "content": f"Original:\n{data.prompt}\n\nImproved:\n{improved_prompt}"},
            ],
            temperature=0.3,
            max_tokens=300,
        )

        changes_summary = summary_response.choices[0].message.content.strip()

        return AIEditResponse(
            original_prompt=data.prompt,
            improved_prompt=improved_prompt,
            changes_summary=changes_summary,
        )

    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="OpenAI rate limit exceeded. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {str(e)}")


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_agent(
    data: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat with an agent to test its behavior using its configured prompt."""
    agent = db.query(Agent).filter(Agent.id == data.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY in .env file."
        )

    try:
        import openai
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

        # Build the system prompt from agent configuration
        system_prompt = agent.agent_prompt or f"You are {agent.name}, a helpful voice agent."

        # Replace prompt variables
        if agent.prompt_variables:
            for key, value in agent.prompt_variables.items():
                system_prompt = system_prompt.replace(f"{{{key}}}", value)

        # Add welcome context
        if agent.welcome_message:
            system_prompt += f"\n\nYour welcome message is: {agent.welcome_message}"

        # Build conversation messages
        messages = [{"role": "system", "content": system_prompt}]

        for msg in data.conversation_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

        messages.append({"role": "user", "content": data.message})

        # Use the agent's configured LLM settings
        model = agent.llm_model or "gpt-4-turbo"
        temp = agent.temperature if agent.temperature is not None else 0.7
        max_tok = agent.max_tokens or 1024

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temp,
            max_tokens=max_tok,
        )

        return AIChatResponse(
            response=response.choices[0].message.content.strip(),
            agent_name=agent.name,
        )

    except openai.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="OpenAI rate limit exceeded. Please try again later.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

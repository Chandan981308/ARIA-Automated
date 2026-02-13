from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AgentToolSchema(BaseModel):
    id: str
    name: str
    type: str
    enabled: bool = True
    config: Dict[str, Any] = {}


class AgentCostBreakdownSchema(BaseModel):
    transcriber: float = 0.015
    llm: float = 0.045
    voice: float = 0.025
    telephony: float = 0.010
    platform: float = 0.005


class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    welcome_message: str = ""
    agent_prompt: str = ""
    hangup_using_prompt: bool = False
    hangup_prompt: str = ""
    prompt_variables: Dict[str, str] = {}

    # LLM
    llm_provider: str = "openai"
    llm_model: str = "gpt-4-turbo"
    temperature: float = 0.7
    max_tokens: int = 1024

    # Audio
    audio_language: str = "hi-IN"
    stt_provider: str = "elevenlabs"
    stt_model: str = "scribe_v2_realtime"
    stt_keywords: List[str] = []
    tts_provider: str = "elevenlabs"
    tts_model: str = "eleven_turbo_v2_5"
    tts_voice: str = "mnm"
    tts_buffer_size: int = 200
    tts_speed_rate: float = 1.0
    tts_similarity_boost: float = 0.75
    tts_stability: float = 0.35
    tts_style_exaggeration: float = 0.0

    # Engine
    engine_type: str = "default"
    engine_interrupt_sensitivity: float = 0.5

    # Call
    call_max_duration: int = 480
    call_end_after_silence: int = 10
    call_recording: bool = True

    # Tools
    tools: List[AgentToolSchema] = []

    # Inbound
    inbound_phone_number: Optional[str] = None
    routing: str = "India routing"

    # Cost
    cost_per_min: float = 0.100
    cost_breakdown: AgentCostBreakdownSchema = AgentCostBreakdownSchema()


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    welcome_message: Optional[str] = None
    agent_prompt: Optional[str] = None
    hangup_using_prompt: Optional[bool] = None
    hangup_prompt: Optional[str] = None
    prompt_variables: Optional[Dict[str, str]] = None

    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

    audio_language: Optional[str] = None
    stt_provider: Optional[str] = None
    stt_model: Optional[str] = None
    stt_keywords: Optional[List[str]] = None
    tts_provider: Optional[str] = None
    tts_model: Optional[str] = None
    tts_voice: Optional[str] = None
    tts_buffer_size: Optional[int] = None
    tts_speed_rate: Optional[float] = None
    tts_similarity_boost: Optional[float] = None
    tts_stability: Optional[float] = None
    tts_style_exaggeration: Optional[float] = None

    engine_type: Optional[str] = None
    engine_interrupt_sensitivity: Optional[float] = None

    call_max_duration: Optional[int] = None
    call_end_after_silence: Optional[int] = None
    call_recording: Optional[bool] = None

    tools: Optional[List[AgentToolSchema]] = None

    inbound_phone_number: Optional[str] = None
    routing: Optional[str] = None

    cost_per_min: Optional[float] = None
    cost_breakdown: Optional[AgentCostBreakdownSchema] = None


class AgentResponse(AgentBase):
    id: int
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int


# LLM Integration schemas
class AIEditRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The current agent prompt to improve")
    instruction: str = Field(
        default="Improve this prompt to make it more effective, clear, and professional.",
        description="Instruction for how to edit the prompt"
    )
    agent_name: Optional[str] = None
    language: Optional[str] = "en"


class AIEditResponse(BaseModel):
    original_prompt: str
    improved_prompt: str
    changes_summary: str


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    agent_id: int
    conversation_history: List[Dict[str, str]] = []


class AIChatResponse(BaseModel):
    response: str
    agent_name: str

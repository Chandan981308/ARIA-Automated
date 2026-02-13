from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, JSON, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    welcome_message = Column(Text, nullable=True, default="")
    agent_prompt = Column(Text, nullable=True, default="")
    hangup_using_prompt = Column(Boolean, default=False)
    hangup_prompt = Column(Text, nullable=True, default="")
    prompt_variables = Column(JSON, nullable=True, default=dict)

    # LLM Configuration
    llm_provider = Column(String(50), default="openai")
    llm_model = Column(String(100), default="gpt-4-turbo")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1024)

    # Audio - Language
    audio_language = Column(String(20), default="hi-IN")

    # Audio - Speech-to-Text
    stt_provider = Column(String(50), default="elevenlabs")
    stt_model = Column(String(100), default="scribe_v2_realtime")
    stt_keywords = Column(JSON, nullable=True, default=list)

    # Audio - Text-to-Speech
    tts_provider = Column(String(50), default="elevenlabs")
    tts_model = Column(String(100), default="eleven_turbo_v2_5")
    tts_voice = Column(String(100), default="mnm")
    tts_buffer_size = Column(Integer, default=200)
    tts_speed_rate = Column(Float, default=1.0)
    tts_similarity_boost = Column(Float, default=0.75)
    tts_stability = Column(Float, default=0.35)
    tts_style_exaggeration = Column(Float, default=0.0)

    # Engine Configuration
    engine_type = Column(String(50), default="default")
    engine_interrupt_sensitivity = Column(Float, default=0.5)

    # Call Configuration
    call_max_duration = Column(Integer, default=480)  # seconds
    call_end_after_silence = Column(Integer, default=10)  # seconds
    call_recording = Column(Boolean, default=True)

    # Tools (stored as JSON array)
    tools = Column(JSON, nullable=True, default=list)

    # Inbound Configuration
    inbound_phone_number = Column(String(30), nullable=True)
    routing = Column(String(100), default="India routing")

    # Cost
    cost_per_min = Column(Float, default=0.100)
    cost_breakdown = Column(JSON, nullable=True, default=dict)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_agent_name", "name"),
        Index("idx_agent_created_by", "created_by"),
    )

    def __repr__(self):
        return f"<Agent(id={self.id}, name={self.name})>"

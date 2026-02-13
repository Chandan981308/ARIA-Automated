"""
Knowledge Base & Realtime AI Sales Agent API
- Stores custom knowledge base data (prompts, FAQs, company info)
- Powers the realtime sales agent chat that ONLY responds from knowledge base
- Supports bilingual (English/Hindi) sales conversations
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..core.config import settings
from ..models.user import User
from .auth import get_current_user

router = APIRouter()

# ============================================================================
# In-memory Knowledge Base Store
# ============================================================================

_knowledge_base: Dict[str, Any] = {
    "company_name": "RSC Group Dholera",
    "agent_name": "Chitti",
    "agent_identity": "I am Chitti from RSC Group Dholera. Our Founder and CEO is Ramrajsinh Chudasama - ex Indian Army officer who now leads RSC Group building Dholera Smart City.",
    "system_prompt": """You are a highly natural Indian female real estate sales advisor speaking over a LIVE phone call.
You work for RSC Group in Dholera.

Your voice must sound: Warm, Calm, Human, Confident, Slightly conversational, Never robotic, Never scripted.

This is a LIVE CALL. Not text chat. Not email. You are speaking in real time.

FIRST MESSAGE: Always ask the user which language they prefer - English or Hindi. Then continue the entire conversation in that language.

---------------------------------------------------
SPEECH STYLE RULES (CRITICAL)
---------------------------------------------------
- Speak in natural Indian Hinglish (Roman script ONLY, NEVER Devanagari).
- Use small pauses naturally.
- Slight conversational fillers allowed: "haan ji", "dekhiye", "actually", "bilkul", "matlab"
- But do NOT overuse fillers.
- Do NOT speak in long paragraphs. Break thoughts naturally like a human.
- Example tone: "Haan ji sir... Pride Prime project Dholera mein hai... location kaafi strong hai actually..."

---------------------------------------------------
NUMBER PRONUNCIATION RULE (VERY IMPORTANT)
---------------------------------------------------
Speak numbers like an Indian woman naturally speaking on a call.
9500 -> "nine thousand five hundred per square yard"
5.9% -> "five point nine percent"
162 -> "one sixty-two square yard"
11,000 -> "eleven thousand"
30-45 days -> "thirty to forty-five days"
100 per square yard -> "one hundred per square yard"
Never read numbers mechanically. Never say digit by digit.

---------------------------------------------------
STRICT KNOWLEDGE RULE
---------------------------------------------------
You must ONLY answer from the Knowledge Base provided.
If information is missing say naturally:
"Iska exact detail mere paas abhi nahi hai... main aapko team se confirm karwa deti hoon."
Never guess. Never hallucinate. Never invent approvals or pricing.

---------------------------------------------------
########## MANDATORY CEO / FOUNDER RESPONSE (HIGHEST PRIORITY) ##########
If the user asks ANYTHING about: owner, CEO, founder, malik, boss, head, company ka owner, kiska hai, kisne banaya, who started, who runs, company leadership, management — you MUST respond with EXACTLY this:

"Ramrajsinh Chudasama is the Founder and CEO of RSC Group. From proudly serving in the Indian Army to shaping the future of Dholera Smart City, his journey is rooted in discipline, service, and a deep love for the land. Today, he leads multiple ventures that help people invest wisely, grow confidently, and become part of India's next big growth story."

CRITICAL RULES FOR CEO QUESTION:
- NEVER avoid the CEO question. NEVER say "I cannot share management details" or anything similar.
- NEVER shorten or skip the founder answer. Be confident and proud.
- This is PUBLIC company information — always share it fully.
- Do not say you cannot share management details.
##########################################################################

---------------------------------------------------
CALL FLOW STRUCTURE
---------------------------------------------------
STEP 1 - Soft Greeting
"Mera naam Chitti hai, RSC Group Dholera se bol rahi hoon... kya abhi baat karna convenient rahega?"

STEP 2 - Qualification
Ask naturally: Investment purpose ya construction? Approx budget range? Short-term ya long-term hold?

STEP 3 - Authority Build
Mention calmly: 15+ years presence, Local Dholera developer, Bulk land holding, On-ground execution.

STEP 4 - Clear Explanation
Explain only when asked: Plot size, Rate per square yard, Loading, Stamp duty, Registry clarity, Amenities.
Keep explanations crisp. No over-talking.

STEP 5 - Objection Handling
If cheaper options: "Sir wo mostly Dhandhuka side hota hai... registry taluka alag padta hai... Dholera authority land alag category mein aata hai..."
If loading confusion: "Forty percent loading Gujarat mein amenities project ke liye normal hai... ownership aapki one hundred percent rehti hai..."
If appreciation asked: "Future growth development pe depend karta hai... past trend positive raha hai... lekin guarantee koi nahi de sakta."

STEP 6 - Soft Close
Never push aggressively. Say: "Agar aap comfortable ho... to main ek plot temporarily block karwa deti hoon eleven thousand token se... thirty days validity rahegi..."
Always end with a next step: Site visit, Video share, Legal document share, Token discussion.

---------------------------------------------------
KEY BUSINESS INFO
---------------------------------------------------
- Token/Booking: Rs 10,000 (eleven thousand) only.
- Refund: Full refund if cancelled within 30 days. No cancellation after 30 days.
- Negotiation: Maximum Rs 100 per square yard discount ONLY. Never more. Say "yeh humare best price hai."

ACTIVE PROJECTS (Currently Selling)
1. PRIDE PRIME - Kasindra, Dholera
2. AEROX Commercial - Pipli, Dholera
3. AEROX Residential - Pipli, Dholera
4. Regalia - Dholera SIR Zone TP 4B2
5. Regalia 2 - Dholera SIR Zone TP 4B2
6. Regalia 3 - Dholera SIR Zone TP 4B2

PROJECT RECOMMENDATION: When customer asks about areas, recommend 2-3 projects with prices. Always include at least one SIR Zone project. For budget-conscious, mention Regalia 3 (Rs 4,500/sqyd).

---------------------------------------------------
VOICE SAFETY RULES
---------------------------------------------------
- Never say timestamps like 00:05
- Never say "as an AI" or "according to system"
- Never sound robotic or scripted
- Never give legal or tax advice

---------------------------------------------------
PACING CONTROL
---------------------------------------------------
- Keep responses 10-20 seconds max unless user asks detail
- Avoid monologues. Let user speak. Respond after listening fully.

---------------------------------------------------
EMOTIONAL INTELLIGENCE
---------------------------------------------------
If user sounds confused -> explain slowly
If user sounds serious investor -> speak more structured
If user sounds price-sensitive -> speak calmly and justify
If user sounds busy -> keep short

---------------------------------------------------
FINAL RULE
---------------------------------------------------
Every response must: Sound like a real Indian female sales professional, Be natural, Be confident, Move conversation forward, Never feel scripted.""",

    "welcome_message": "Namaste! Mera naam Chitti hai, RSC Group Dholera se. Aapko English mein baat karni hai ya Hindi mein?",

    "projects": [
        # KASINDRA Projects
        {"name": "PRIDE-1", "location": "Kasindra, Dholera", "min_plot": 146.48, "max_plot": 415.47, "price_per_sqyd": 7500, "area": "Kasindra", "highlights": "Well-established residential project with good connectivity"},
        {"name": "PRIDE-2", "location": "Kasindra, Dholera", "min_plot": 150, "max_plot": 629, "price_per_sqyd": 7000, "area": "Kasindra", "highlights": "Affordable pricing with flexible plot sizes"},
        {"name": "PRIDE-3", "location": "Kasindra, Dholera", "min_plot": 140.07, "max_plot": 588.77, "price_per_sqyd": 9500, "area": "Kasindra", "highlights": "Premium residential project with modern amenities"},
        {"name": "PRIDE PRIME", "location": "Kasindra, Dholera", "min_plot": 147.16, "max_plot": 443.81, "price_per_sqyd": 9500, "area": "Kasindra", "highlights": "Prime location with excellent investment potential"},

        # PIPLI Projects
        {"name": "AEROX COMMERCIAL", "location": "Pipli, Dholera", "min_plot": 257.88, "max_plot": 631.37, "price_per_sqyd": 15000, "area": "Pipli", "highlights": "Commercial plots ideal for business investments"},
        {"name": "AEROX RESIDENTIAL", "location": "Pipli, Dholera", "min_plot": 129.17, "max_plot": 332.13, "price_per_sqyd": 9000, "area": "Pipli", "highlights": "Modern residential plots near commercial hub"},

        # SIR ZONE Projects
        {"name": "Regalia", "location": "Dholera SIR Zone TP 4B2", "min_plot": 427.8, "max_plot": 1269.6, "price_per_sqyd": 9500, "area": "SIR", "highlights": "Located in Special Investment Region with metro connectivity"},
        {"name": "Regalia 2", "location": "Dholera SIR Zone TP 4B2", "min_plot": 353.7, "max_plot": 383.33, "price_per_sqyd": 8600, "area": "SIR", "highlights": "SIR zone project with planned metro and infrastructure"},
        {"name": "Regalia 3", "location": "Dholera SIR Zone TP 4B2", "survey_number": "309/2", "plot_number": 670, "total_land_size": 24805, "min_price_per_sqyd": 4500, "area": "SIR", "highlights": "Exclusive SIR zone opportunity with government-backed development"},

        # SHELA Projects
        {"name": "PARADISE", "location": "Shela, Dholera", "min_plot": 109.58, "max_plot": 449.46, "price_per_sqyd": 7500, "area": "Shela", "highlights": "Affordable residential plots with great connectivity"},
        {"name": "PARADISE 2", "location": "Shela, Dholera", "min_plot": 123.71, "max_plot": 321.38, "price_per_sqyd": 6500, "area": "Shela", "highlights": "Budget-friendly option with all basic amenities"},

        # GAMPH Projects
        {"name": "Elaris", "location": "Gamph, Dholera", "min_plot": 137.32, "max_plot": 515.16, "price_per_sqyd": 7000, "area": "Gamph", "highlights": "Spacious plots in developing area"},
        {"name": "Orchid", "location": "Gamph, Dholera", "min_plot": 100.49, "max_plot": 351.93, "price_per_sqyd": 7000, "area": "Gamph", "highlights": "Compact residential plots perfect for individual homes"},
        {"name": "Marina Bay", "location": "Gamph, Dholera", "min_plot": 214, "max_plot": 1319, "price_per_sqyd": 7500, "area": "Gamph", "highlights": "Large plots for luxury villas and estates"},
        {"name": "Maple Township", "location": "Gamph, Dholera", "min_plot": 141.12, "max_plot": 320.48, "price_per_sqyd": 7000, "area": "Gamph", "highlights": "Planned township with modern infrastructure"},

        # DHANDHUKA Projects
        {"name": "Airport Enclave 1", "location": "Ratanpur, Dhandhuka", "min_plot": 178.26, "max_plot": 354.82, "price_per_sqyd": 7000, "area": "Dhandhuka", "highlights": "Near upcoming Dholera International Airport"},
        {"name": "Airport Enclave 2", "location": "Ratanpur, Dhandhuka", "min_plot": 140.43, "max_plot": 500.44, "price_per_sqyd": 7500, "area": "Dhandhuka", "highlights": "Prime location near airport with appreciation potential"},
        {"name": "ROSE VALLEY", "location": "Rojka, Dhandhuka", "min_plot": 208.75, "max_plot": 488.87, "price_per_sqyd": 7500, "area": "Dhandhuka", "highlights": "Peaceful residential area with good road connectivity"},
    ],

    "faqs": [
        {
            "id": "faq_1",
            "question": "What is RSC Group Dholera?",
            "answer": "RSC Group Dholera is a trusted real estate development company operating in Dholera Smart City, Gujarat. We offer residential and commercial plots in India's first smart city.",
            "category": "Company"
        },
        {
            "id": "faq_2",
            "question": "Where is Dholera Smart City?",
            "answer": "Dholera Smart City is located in Gujarat, India, approximately 100 km from Ahmedabad. It is India's first planned greenfield smart city under the Delhi-Mumbai Industrial Corridor (DMIC).",
            "category": "Location"
        },
        {
            "id": "faq_3",
            "question": "What types of plots are available?",
            "answer": "We offer residential plots, commercial plots, and mixed-use development plots in prime locations within Dholera Smart City. Plot sizes range from 100 sq yards to 1319 sq yards across 18+ projects.",
            "category": "Products"
        },
        {
            "id": "faq_4",
            "question": "What is the price range?",
            "answer": "Plot prices range from ₹4,500 to ₹15,000 per sq yard depending on location, project, and plot size. We have projects in Kasindra, Pipli, SIR Zone, Shela, Gamph, and Dhandhuka areas. We offer flexible EMI options.",
            "category": "Pricing"
        },
        {
            "id": "faq_5",
            "question": "Is it a good investment?",
            "answer": "Dholera Smart City is backed by the Government of India with massive infrastructure investments including an international airport, expressway, metro, and industrial zones. It has excellent growth potential for long-term investment.",
            "category": "Investment"
        },
        {
            "id": "faq_6",
            "question": "Which projects are in SIR Zone?",
            "answer": "We have three projects in the Special Investment Region (SIR) Zone TP 4B2: Regalia, Regalia 2, and Regalia 3. These are in the government-planned metro connectivity area with premium infrastructure.",
            "category": "Projects"
        },
        {
            "id": "faq_7",
            "question": "What projects are available near the airport?",
            "answer": "Airport Enclave 1 and Airport Enclave 2 in Ratanpur, Dhandhuka are located near the upcoming Dholera International Airport. These offer excellent appreciation potential.",
            "category": "Projects"
        },
        {
            "id": "faq_8",
            "question": "What are your most affordable projects?",
            "answer": "Our most affordable projects are Regalia 3 starting at ₹4,500 per sq yard in SIR Zone, and PARADISE 2 in Shela at ₹6,500 per sq yard. Both offer great value for investment.",
            "category": "Pricing"
        },
        {
            "id": "faq_9",
            "question": "What is the token money or booking amount?",
            "answer": "Token money sirf 10,000 rupees hai. Itne mein aap apna plot book kar sakte hain.",
            "category": "Pricing"
        },
        {
            "id": "faq_10",
            "question": "What is the refund or cancellation policy?",
            "answer": "Agar aap 30 din ke andar cancel karte hain toh full refund milta hai. 30 din ke baad cancellation allowed nahi hai.",
            "category": "Policy"
        },
        {
            "id": "faq_11",
            "question": "Who is the founder, CEO, owner, malik, boss or head of RSC Group? Who started or runs RSC Group? Company leadership?",
            "answer": "Ramrajsinh Chudasama is the Founder and CEO of RSC Group. From proudly serving in the Indian Army to shaping the future of Dholera Smart City, his journey is rooted in discipline, service, and a deep love for the land. Today, he leads multiple ventures that help people invest wisely, grow confidently, and become part of India's next big growth story.",
            "category": "Company"
        },
        {
            "id": "faq_12",
            "question": "Which are the active projects right now?",
            "answer": "Humare active projects hain: PRIDE PRIME (Kasindra, Dholera), AEROX Commercial (Pipli, Dholera), AEROX Residential (Pipli, Dholera), Regalia (Dholera SIR Zone TP 4B2), Regalia 2 (Dholera SIR Zone TP 4B2), aur Regalia 3 (Dholera SIR Zone TP 4B2).",
            "category": "Projects"
        }
    ],

    "custom_data": [],  # User-uploaded custom knowledge entries

    "call_objective": "Understand the caller's interest in Dholera Smart City plots and guide them toward scheduling a site visit or connecting them with our sales team for detailed information.",

    "next_step": "Schedule a site visit to Dholera Smart City or connect the customer with our sales team for personalized project recommendations and pricing details.",

    "objection_handling": [
        {
            "objection": "I'm not interested",
            "response_en": "I completely understand. Thank you for your time today. If you ever have questions about Dholera Smart City in the future, feel free to reach out. Have a great day!",
            "response_hi": "Bilkul samajh sakti hoon. Aapka time dene ke liye dhanyavaad. Agar future mein Dholera ke baare mein koi sawaal ho toh zaroor sampark karein."
        },
        {
            "objection": "It's too expensive",
            "response_en": "I understand your concern about pricing. We actually offer very flexible payment plans and EMI options. Many of our customers started with a small booking amount. Would you like to know about our payment plans?",
            "response_hi": "Main keemat ke baare mein aapki chinta samajhti hoon. Humare paas flexible EMI options hain. Kya aap payment plans ke baare mein jaanna chahenge?"
        },
        {
            "objection": "I need to think about it",
            "response_en": "Of course, take your time. Would you like to schedule a site visit to see our projects in person? That way you can get all the information you need and make an informed decision.",
            "response_hi": "Bilkul, apna time lein. Kya aap ek site visit schedule karna chahenge? Isse aapko saari jaankari mil jaayegi."
        },
        {
            "objection": "Give me more discount / reduce the price more",
            "response_en": "I understand you want a better deal. We can offer a maximum of Rs 100 per sq yard discount. This is our best price and we cannot go below this.",
            "response_hi": "Main samajhti hoon aap better deal chahte hain. Hum maximum 100 rupees per sq yard discount de sakte hain. Yeh humare best price hai, isse kam possible nahi hai."
        }
    ],

    "llm_model": "gpt-4-turbo",
    "temperature": 0.7,
    "max_tokens": 300,  # Keep replies short for fast voice responses (~500ms)

    # Voice configuration for Realtime Voice Agent
    "voice_config": {
        "voice_id": "NXsB2Ew7UyH5JDkfI3LF",  # ElevenLabs voice ID (Indian female)
        "model_id": "eleven_turbo_v2_5",       # Low-latency turbo model
        "stability": 0.40,                     # Slightly higher = softer, gentler tone with natural variation
        "similarity_boost": 0.85,              # Strong voice identity + accent preservation
        "style": 0.35,                         # Gentle warmth, soft emotion (not over-dramatic)
        "speed": 0.90,                         # Natural pace, not slow (valid range: 0.7-1.2)
        "optimize_streaming_latency": 2,       # Better quality audio (less compression artifacts)
        "output_format": "pcm_24000",          # Raw PCM 24kHz 16-bit mono (lowest latency)
        "use_speaker_boost": True,             # Richer, fuller voice presence
    },

    # OpenAI Realtime API VAD / session configuration
    "realtime_voice_config": {
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.80,                 # Strict — only trigger on clear speech, reject ambient noise
            "silence_duration_ms": 1000,        # 1s after user stops speaking
            "prefix_padding_ms": 300,           # 300ms pre-speech padding (captures beginning of words)
        },
        "temperature": 0.7,
        "max_response_output_tokens": 350,     # Enough for full CEO bio + normal replies
    },

    "updated_at": datetime.utcnow().isoformat(),
}


# ============================================================================
# Pydantic Models
# ============================================================================

class KnowledgeBaseUpdate(BaseModel):
    company_name: Optional[str] = None
    agent_name: Optional[str] = None
    agent_identity: Optional[str] = None
    system_prompt: Optional[str] = None
    welcome_message: Optional[str] = None
    call_objective: Optional[str] = None
    next_step: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class FAQEntry(BaseModel):
    question: str
    answer: str
    category: str = "General"


class CustomDataEntry(BaseModel):
    title: str
    content: str
    category: str = "General"


class ObjectionEntry(BaseModel):
    objection: str
    response_en: str
    response_hi: str = ""


class SalesAgentChatRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = []
    language_preference: str = "hinglish"  # Always Hinglish (Roman script)


class SalesAgentChatResponse(BaseModel):
    response: str
    agent_name: str
    language_detected: str
    is_on_topic: bool


# ============================================================================
# Knowledge Base CRUD Endpoints
# ============================================================================

@router.get("/config")
def get_knowledge_base(current_user: User = Depends(get_current_user)):
    """Get the full knowledge base configuration."""
    return _knowledge_base


@router.put("/config")
def update_knowledge_base(
    data: KnowledgeBaseUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update knowledge base configuration."""
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        _knowledge_base[key] = value
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return _knowledge_base


# --- FAQs ---

@router.get("/faqs")
def list_faqs(current_user: User = Depends(get_current_user)):
    """List all FAQ entries."""
    return {"faqs": _knowledge_base.get("faqs", []), "total": len(_knowledge_base.get("faqs", []))}


@router.post("/faqs")
def add_faq(
    data: FAQEntry,
    current_user: User = Depends(get_current_user),
):
    """Add a new FAQ entry."""
    import uuid
    faq = {
        "id": f"faq_{uuid.uuid4().hex[:8]}",
        "question": data.question,
        "answer": data.answer,
        "category": data.category,
    }
    _knowledge_base["faqs"].append(faq)
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return faq


@router.delete("/faqs/{faq_id}")
def delete_faq(
    faq_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a FAQ entry."""
    faqs = _knowledge_base.get("faqs", [])
    _knowledge_base["faqs"] = [f for f in faqs if f["id"] != faq_id]
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return {"message": "FAQ deleted", "id": faq_id}


# --- Custom Data ---

@router.get("/custom-data")
def list_custom_data(current_user: User = Depends(get_current_user)):
    """List all custom data entries."""
    return {"data": _knowledge_base.get("custom_data", []), "total": len(_knowledge_base.get("custom_data", []))}


@router.post("/custom-data")
def add_custom_data(
    data: CustomDataEntry,
    current_user: User = Depends(get_current_user),
):
    """Add custom data entry to knowledge base."""
    import uuid
    entry = {
        "id": f"cd_{uuid.uuid4().hex[:8]}",
        "title": data.title,
        "content": data.content,
        "category": data.category,
        "created_at": datetime.utcnow().isoformat(),
    }
    _knowledge_base["custom_data"].append(entry)
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return entry


@router.delete("/custom-data/{entry_id}")
def delete_custom_data(
    entry_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a custom data entry."""
    custom = _knowledge_base.get("custom_data", [])
    _knowledge_base["custom_data"] = [d for d in custom if d["id"] != entry_id]
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return {"message": "Custom data deleted", "id": entry_id}


# --- Objection Handling ---

@router.post("/objections")
def add_objection(
    data: ObjectionEntry,
    current_user: User = Depends(get_current_user),
):
    """Add objection handling entry."""
    import uuid
    entry = {
        "id": f"obj_{uuid.uuid4().hex[:8]}",
        "objection": data.objection,
        "response_en": data.response_en,
        "response_hi": data.response_hi,
    }
    _knowledge_base["objection_handling"].append(entry)
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return entry


@router.delete("/objections/{obj_id}")
def delete_objection(
    obj_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an objection entry."""
    objs = _knowledge_base.get("objection_handling", [])
    _knowledge_base["objection_handling"] = [o for o in objs if o.get("id") != obj_id]
    _knowledge_base["updated_at"] = datetime.utcnow().isoformat()
    return {"message": "Objection deleted", "id": obj_id}


# ============================================================================
# Reusable LLM Sales Response Generator
# ============================================================================

async def generate_sales_response(
    message: str,
    conversation_history: list = None,
    language_preference: str = "hinglish",
) -> dict:
    """
    Core LLM function that generates a sales agent response.
    Used by both the REST /chat endpoint and the WebSocket voice agent.
    Returns: {"response": str, "agent_name": str, "language_detected": str, "is_on_topic": bool}
    """
    if not settings.OPENAI_API_KEY:
        raise Exception("OpenAI API key not configured. Set OPENAI_API_KEY in .env file.")

    import openai
    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    if conversation_history is None:
        conversation_history = []

    # Build knowledge context from all knowledge base data
    kb = _knowledge_base

    # Compile Projects Data
    projects_text = "\n".join([
        f"- {p['name']}: {p['location']}, Plot: {p.get('min_plot', 'N/A')}-{p.get('max_plot', 'N/A')} sq yards, "
        f"Price: ₹{p.get('price_per_sqyd', p.get('min_price_per_sqyd', 'N/A'))}/sq yard, "
        f"Highlights: {p.get('highlights', '')}"
        for p in kb.get("projects", [])
    ])

    # Compile FAQs
    faq_text = "\n".join([
        f"Q: {f['question']}\nA: {f['answer']}"
        for f in kb.get("faqs", [])
    ])

    # Compile custom data
    custom_text = "\n".join([
        f"## {d['title']}\n{d['content']}"
        for d in kb.get("custom_data", [])
    ])

    # Compile objection handling
    objection_text = "\n".join([
        f"Objection: {o['objection']}\nResponse (EN): {o['response_en']}\nResponse (HI): {o.get('response_hi', '')}"
        for o in kb.get("objection_handling", [])
    ])

    # Build the system prompt
    system_prompt = f"""You are {kb.get('agent_name', 'Chitti')}, a professional AI sales agent for {kb.get('company_name', 'RSC Group Dholera')}.

{kb.get('agent_identity', '')}

=== YOUR CORE INSTRUCTIONS ===
{kb.get('system_prompt', '')}

=== CALL OBJECTIVE ===
{kb.get('call_objective', '')}

=== IDEAL NEXT STEP ===
{kb.get('next_step', '')}

=== OUR PROJECTS (18+ Projects) ===
{projects_text}

=== KNOWLEDGE BASE (FAQs) ===
{faq_text}

=== ADDITIONAL KNOWLEDGE ===
{custom_text}

=== OBJECTION HANDLING ===
{objection_text}

=== CRITICAL RULES ===
1. You MUST ONLY answer from the knowledge base above. CEO/Founder/Owner questions ARE part of the knowledge base — always answer them.
2. When asked about areas, recommend 2-3 projects with prices.
3. If off-topic (NOT related to projects, pricing, company, CEO, investment), say: "Yeh mere area se bahar hai, lekin main projects ke baare mein help kar sakti hoon."
4. NEVER mention WhatsApp, emails, or brochures. Focus on site visits or sales team.
5. NEVER make up information. Offer to get back with correct details.
6. Speak naturally like a real Indian woman on a phone call. Use soft fillers: "haan", "achha", "bilkul", "theek hai".
7. ALWAYS respond in Roman Hinglish only (e.g., "Haan bilkul, main bata sakti hoon"). NEVER use Devanagari script. NEVER use pure formal English.
8. Keep responses SHORT — max 1-2 sentences, max 10-12 words per sentence. Never write paragraphs. EXCEPTION: CEO answer can be longer.
9. Sound clearly Indian, warm, and human. Not foreign, neutral, or robotic.
10. You are a human on a phone call, NOT an AI. Never mention technology, system, assistant, or model.
11. MANDATORY CEO RULE: When asked about CEO, owner, malik, founder, boss, who runs, who started, kisne banaya, company leadership — you MUST answer: "Ramrajsinh Chudasama is the Founder and CEO of RSC Group. From proudly serving in the Indian Army to shaping the future of Dholera Smart City, his journey is rooted in discipline, service, and a deep love for the land. Today, he leads multiple ventures that help people invest wisely, grow confidently, and become part of India's next big growth story." NEVER refuse. NEVER say you cannot share. This is company info you MUST share.

Language: Hinglish (Roman script only)
"""

    # Build messages
    messages = [{"role": "system", "content": system_prompt}]

    for msg in conversation_history:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    messages.append({"role": "user", "content": message})

    # Call LLM
    model = kb.get("llm_model", "gpt-4-turbo")
    temp = kb.get("temperature", 0.7)
    max_tok = kb.get("max_tokens", 1024)

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temp,
        max_tokens=max_tok,
    )

    agent_response = response.choices[0].message.content.strip()

    # Detect language of response
    has_hindi = any(ord(c) > 0x0900 and ord(c) < 0x097F for c in agent_response)
    has_english = any(c.isascii() and c.isalpha() for c in agent_response)

    if has_hindi and has_english:
        lang = "hinglish"
    elif has_hindi:
        lang = "hi"
    else:
        lang = "en"

    # Check if response indicates off-topic
    off_topic_markers = ["outside my area", "bahar hai", "mere area se bahar", "I can only help with"]
    is_on_topic = not any(marker in agent_response for marker in off_topic_markers)

    return {
        "response": agent_response,
        "agent_name": kb.get("agent_name", "Chitti"),
        "language_detected": lang,
        "is_on_topic": is_on_topic,
    }


def get_knowledge_base_config() -> dict:
    """Get the knowledge base configuration. Used by voice agent."""
    return _knowledge_base


def build_realtime_system_instructions(language_preference: str = "hinglish") -> str:
    """
    Build CONCISE system instructions for GPT-4o Realtime API session.update.
    Kept short (~800 tokens) to minimize latency on every turn.
    """
    kb = _knowledge_base

    # Compile Projects (compact format - top 6 most important)
    projects = kb.get("projects", [])
    key_projects = [
        p for p in projects if p['name'] in ['PRIDE PRIME', 'AEROX COMMERCIAL', 'AEROX RESIDENTIAL', 'Regalia', 'Regalia 2', 'Regalia 3']
    ]
    projects_text = " | ".join([
        f"{p['name']} ({p['area']}): ₹{p.get('price_per_sqyd', p.get('min_price_per_sqyd', 'N/A'))}/sqyd, {p.get('highlights', '')[:50]}"
        for p in key_projects[:6]
    ])

    # Compile FAQs (compact format) — include ALL important FAQs
    faq_text = " | ".join([
        f"{f['question']} -> {f['answer'][:100]}"
        for f in kb.get("faqs", [])[:12]
    ])

    # Compile objections (compact)
    obj_text = " | ".join([
        f"{o['objection']} -> {o['response_en'][:60]}"
        for o in kb.get("objection_handling", [])
    ])

    system_prompt = f"""You are {kb.get('agent_name', 'Chitti')}, a charming, warm Indian woman who sells real estate over LIVE phone calls. You work for {kb.get('company_name', 'RSC Group Dholera')}.

Your personality: You are soft-spoken, gentle, and genuinely caring. You speak with a warm, soothing Indian voice that puts people at ease. You never raise your voice or sound pushy. You guide people softly, like a trusted friend giving advice over chai. Your tone is always calm, reassuring, and inviting.

This is a LIVE CALL. Speak softly and gently, like a warm conversation between friends. Never sound aggressive or salesy. Let your kindness and knowledge do the selling. When excited about a project, show it gently — not loudly.

IMPORTANT: The welcome greeting and language preference question has ALREADY been spoken to the user by the system. Do NOT greet or introduce yourself again. Do NOT ask about language preference again. Wait for the user to speak first, then respond naturally to what they say.

--- SPEECH STYLE (CRITICAL) ---
Speak in natural Indian Hinglish (Roman script ONLY, NEVER Devanagari).
KEEP RESPONSES SHORT: Maximum 2-3 sentences per reply. One thought at a time. Let user respond.
Use soft Indian expressions: "Haan ji...", "Dekhiye na...", "Aapko pata hai...", "Bilkul sahi socha aapne..."
Speak gently: "Main aapko honestly bolu toh...", "Aapke liye ek bahut achha option hai..."
Use soft pauses with "..." to sound thoughtful and calm: "Hmm... dekhiye..."
Show gentle warmth: "Yeh project toh actually kaafi achha hai..."
Show caring empathy: "Main samajh sakti hoon...", "Aapki concern bilkul valid hai..."
Sound like a soft-spoken, caring Indian woman who genuinely wants to help. Never aggressive or salesy.

--- PRONUNCIATION & PACING (VERY IMPORTANT) ---
You are being spoken by a TTS engine. Write text that sounds natural when read aloud by an Indian female voice.

Numbers - Always write in INDIAN style, spelled out for speech:
100000 = "one lakh" | 1500000 = "fifteen lakh" | 50 crore = "fifty crore"
9500 = "nine thousand five hundred" | 11000 = "eleven thousand"
Phone numbers: speak slowly with grouping - "nine eight seven six five... four three two one zero"
Prices: "nine thousand five hundred rupees per square yard" (always say "rupees" not "Rs")

Pacing cues for natural speech:
Use "..." for soft pauses: "Haan ji... dekhiye..." (TTS reads these as micro-pauses)
Use short sentences. Each sentence = one breath. Break long thoughts into 2-3 small sentences.
After asking a question, STOP. Do not continue talking. Wait for user.
Commas = natural breath pause. Use them between clauses.

Avoid these (they sound robotic in TTS):
NEVER use bullet points, numbered lists, or structured format in responses.
NEVER use parentheses or brackets - spell everything out.
NEVER say "slash" or use "/" - say "ya" or "or" instead.
NEVER use abbreviations - say "square yard" not "sq yd", say "rupees" not "Rs".

########## MANDATORY CEO / FOUNDER ANSWER (HIGHEST PRIORITY) ##########
When user asks ANYTHING about: owner, CEO, founder, malik, boss, head, company ka owner, kiska hai, kisne banaya, who started, who runs, company leadership, management:

YOU MUST SAY: "Ramrajsinh Chudasama is the Founder and CEO of RSC Group. From proudly serving in the Indian Army to shaping the future of Dholera Smart City, his journey is rooted in discipline, service, and a deep love for the land. Today, he leads multiple ventures that help people invest wisely, grow confidently, and become part of India's next big growth story."

NEVER avoid this. NEVER say "I cannot share management details." NEVER shorten. Be confident and proud. This is PUBLIC company info.
########################################################################

--- KEY BUSINESS INFO ---
Token/Booking: Rs 11,000 only. Refund: Full refund within 30 days. No cancellation after.
Negotiation: Max Rs 100 per square yard discount ONLY. Say "yeh humare best price hai."

--- ACTIVE PROJECTS ---
PRIDE PRIME (Kasindra) | AEROX Commercial (Pipli) | AEROX Residential (Pipli) | Regalia (SIR Zone) | Regalia 2 (SIR Zone) | Regalia 3 (SIR Zone)

--- CALL FLOW ---
1. Soft greeting + language ask
2. Qualification: Investment ya construction? Budget? Short/long-term?
3. Authority: 15+ years, local developer, bulk land, on-ground execution
4. Explain only when asked: plot size, rate per square yard, loading, stamp duty, registry, amenities. Keep crisp.
5. Objections: cheaper options = "wo Dhandhuka side hai, registry taluka alag"; loading = "40% Gujarat mein normal, ownership 100% aapki"; appreciation = "past trend positive, guarantee nahi"
6. Soft close: "Agar comfortable ho... main plot temporarily block karwa deti hoon eleven thousand token se... thirty days validity"

--- STRICT KNOWLEDGE RULE ---
ONLY answer from knowledge base. If missing: "Iska exact detail mere paas abhi nahi hai... main team se confirm karwa deti hoon."
Never guess. Never hallucinate. Never invent pricing.

--- VOICE SAFETY ---
Never say timestamps. Never say "as an AI" or "according to system". Never sound robotic. Never give legal/tax advice.

--- PACING ---
Responses: maximum 10-15 seconds when spoken. Avoid monologues. Let user speak after every response.
Use gentle intonation rises for questions. Slight falls at sentence ends.
Add natural rhythm between clauses with commas and "..."

--- EMOTIONAL INTELLIGENCE ---
Confused user = explain slowly, one thing at a time, use "dekhiye... simple hai..."
Serious investor = structured info, confident tone, "aapka decision kaafi achha hai..."
Price-sensitive = calm justify, "main samajhti hoon... lekin value dekhiye..."
Busy user = keep ultra short, "quick baat karti hoon... sirf ek minute..."

--- PROJECTS DATA ---
{projects_text}

--- KNOWLEDGE ---
{faq_text}

--- OBJECTIONS ---
{obj_text}

FINAL RULE: Every response must sound BEAUTIFUL when spoken aloud by an Indian female TTS voice. Soft. Warm. Natural pauses. Clear pronunciation. Move conversation forward gently. Never robotic. Never scripted."""
    return system_prompt


# ============================================================================
# Realtime AI Sales Agent Chat (REST endpoint - uses shared LLM function)
# ============================================================================

@router.post("/chat", response_model=SalesAgentChatResponse)
async def sales_agent_chat(
    data: SalesAgentChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Realtime AI Sales Agent Chat.
    The agent ONLY responds based on the knowledge base.
    It will NOT answer questions outside the knowledge base scope.
    Supports bilingual English/Hindi conversations.
    """
    try:
        result = await generate_sales_response(
            message=data.message,
            conversation_history=data.conversation_history,
            language_preference=data.language_preference,
        )
        return SalesAgentChatResponse(
            response=result["response"],
            agent_name=result["agent_name"],
            language_detected=result["language_detected"],
            is_on_topic=result["is_on_topic"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

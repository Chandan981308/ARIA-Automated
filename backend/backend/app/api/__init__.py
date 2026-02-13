from fastapi import APIRouter
from .leads import router as leads_router
from .campaigns import router as campaigns_router
from .calls import router as calls_router
from .analytics import router as analytics_router
from .compliance import router as compliance_router
from .users import router as users_router
from .auth import router as auth_router
from .settings import router as settings_router
from .agents import router as agents_router
from .smartflo import router as smartflo_router
from .voicelab import router as voicelab_router
from .knowledge_base import router as knowledge_base_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(leads_router, prefix="/leads", tags=["Leads"])
api_router.include_router(campaigns_router, prefix="/campaigns", tags=["Campaigns"])
api_router.include_router(calls_router, prefix="/calls", tags=["Calls"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(compliance_router, prefix="/compliance", tags=["Compliance"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
api_router.include_router(agents_router, prefix="/agents", tags=["Agents"])
api_router.include_router(smartflo_router, prefix="/smartflo", tags=["Smartflo"])
api_router.include_router(voicelab_router, prefix="/voicelab", tags=["Voice Lab"])
api_router.include_router(knowledge_base_router, prefix="/knowledge-base", tags=["Knowledge Base"])

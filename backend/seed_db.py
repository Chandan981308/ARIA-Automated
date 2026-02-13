"""
Seed the database with sample data for testing
Run this script after starting the server once to create tables
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
import bcrypt
from app.core.database import SessionLocal, engine, Base
from app.models import (
    Lead, CallLog, Campaign, ComplianceLog, User, Plot,
    LeadStage, LeadStatus, Platform
)
from app.models.campaign import CampaignStatus
from app.models.call_log import CallStatus, Classification
from app.models.compliance_log import ComplianceEventType

def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if data already exists
        existing_platforms = db.query(Platform).count()
        if existing_platforms > 0:
            print("Database already seeded. Skipping...")
            return

        print("Seeding database...")

        # Create Platforms
        platforms = [
            Platform(name="Facebook Ads", description="Leads from Facebook advertising campaigns", icon="facebook"),
            Platform(name="Google Ads", description="Leads from Google advertising campaigns", icon="google"),
            Platform(name="Website", description="Leads from website contact forms", icon="globe"),
            Platform(name="Referral", description="Leads from customer referrals", icon="users"),
            Platform(name="Walk-in", description="Leads from walk-in visitors", icon="building"),
        ]
        for p in platforms:
            db.add(p)
        db.commit()
        print(f"Created {len(platforms)} platforms")

        # Create Lead Stages
        stages = [
            LeadStage(name="New", description="Newly added lead, not yet contacted", order_index=1, color="#6B7280"),
            LeadStage(name="Contacted", description="Initial contact has been made", order_index=2, color="#3B82F6"),
            LeadStage(name="Qualified", description="Lead has been qualified through discovery", order_index=3, color="#F59E0B"),
            LeadStage(name="Hot Lead", description="High intent, ready for human follow-up", order_index=4, color="#EF4444"),
            LeadStage(name="Meeting Scheduled", description="Site visit or meeting scheduled", order_index=5, color="#10B981"),
            LeadStage(name="Negotiation", description="In price negotiation phase", order_index=6, color="#8B5CF6"),
            LeadStage(name="Closed Won", description="Deal completed successfully", order_index=7, color="#059669"),
            LeadStage(name="Closed Lost", description="Deal lost or lead not interested", order_index=8, color="#DC2626"),
        ]
        for s in stages:
            db.add(s)
        db.commit()
        print(f"Created {len(stages)} lead stages")

        # Create Lead Statuses
        statuses = [
            LeadStatus(name="Active", description="Lead is actively being pursued", color="#10B981"),
            LeadStatus(name="On Hold", description="Lead is temporarily on hold", color="#F59E0B"),
            LeadStatus(name="Nurturing", description="Lead requires long-term nurturing", color="#3B82F6"),
            LeadStatus(name="Closed", description="Lead has been closed (won or lost)", color="#6B7280"),
            LeadStatus(name="Invalid", description="Lead information is invalid", color="#DC2626"),
        ]
        for s in statuses:
            db.add(s)
        db.commit()
        print(f"Created {len(statuses)} lead statuses")

        # Create Users
        hashed_password = hash_password("password123")
        users = [
            User(email="admin@aria.ai", hashed_password=hashed_password, full_name="Admin User", role="admin", phone="+91-98765-00001"),
            User(email="manager@aria.ai", hashed_password=hashed_password, full_name="Sales Manager", role="manager", phone="+91-98765-00002"),
            User(email="amit.patel@aria.ai", hashed_password=hashed_password, full_name="Amit Patel", role="sales_rep", phone="+91-98765-00003"),
            User(email="ravi.singh@aria.ai", hashed_password=hashed_password, full_name="Ravi Singh", role="sales_rep", phone="+91-98765-00004"),
            User(email="priya.mehta@aria.ai", hashed_password=hashed_password, full_name="Priya Mehta", role="sales_rep", phone="+91-98765-00005", is_on_leave=True),
            User(email="compliance@aria.ai", hashed_password=hashed_password, full_name="Compliance Officer", role="compliance", phone="+91-98765-00006"),
        ]
        for u in users:
            db.add(u)
        db.commit()
        print(f"Created {len(users)} users")

        # Create Plots
        plots = [
            Plot(name="Green Valley Phase 2", plot_number="#127", property_type="Residential", area_sqft=1200, price=2450000, location="Panvel, Near Highway", city="Navi Mumbai", state="Maharashtra", description="Premium residential plot with all amenities", status="available"),
            Plot(name="Green Valley Phase 2", plot_number="#128", property_type="Residential", area_sqft=1500, price=3050000, location="Panvel, Near Highway", city="Navi Mumbai", state="Maharashtra", description="Corner plot with extra space", status="available"),
            Plot(name="Sunrise Apartments", plot_number="#A-401", property_type="Residential", area_sqft=950, price=1800000, location="Thane West", city="Thane", state="Maharashtra", description="2 BHK apartment in prime location", status="available"),
            Plot(name="Commercial Plaza", plot_number="#G-12", property_type="Commercial", area_sqft=2000, price=5500000, location="Vashi", city="Navi Mumbai", state="Maharashtra", description="Ground floor commercial space", status="available"),
            Plot(name="Industrial Hub", plot_number="#I-05", property_type="Industrial", area_sqft=5000, price=12000000, location="Chakan", city="Pune", state="Maharashtra", description="Industrial land near MIDC", status="available"),
        ]
        for p in plots:
            db.add(p)
        db.commit()
        print(f"Created {len(plots)} plots")

        # Create Leads
        leads = [
            Lead(
                name="Rajesh Kumar", email="rajesh.kumar@email.com", phone="+91-98765-43210",
                platformId=1, assignedTo=3, plotId=1, leadStatusId=1,
                city="Mumbai", state="Maharashtra", leadStageId=4, tracker=1,
                interestStatus="interested",
                other={"budget_min": 2000000, "budget_max": 3000000, "preferred_location": "Panvel", "property_type": "Residential", "timeline": "3 months", "intent_score": 9}
            ),
            Lead(
                name="Priya Sharma", email="priya.sharma@email.com", phone="+91-91234-56789",
                platformId=3, assignedTo=4, plotId=3, leadStatusId=1,
                city="Pune", state="Maharashtra", leadStageId=3, tracker=2,
                interestStatus="interested",
                other={"budget_min": 1500000, "budget_max": 2000000, "preferred_location": "Thane", "property_type": "Residential", "timeline": "6 months", "intent_score": 7}
            ),
            Lead(
                name="Amit Verma", email="amit.verma@email.com", phone="+91-88888-77777",
                platformId=2, city="Thane", state="Maharashtra", leadStageId=1, tracker=0,
                leadStatusId=1, other={}
            ),
            Lead(
                name="Neha Gupta", email="neha.gupta@email.com", phone="+91-77777-66666",
                platformId=1, assignedTo=5, plotId=4, leadStatusId=1,
                city="Mumbai", state="Maharashtra", leadStageId=2, tracker=1,
                interestStatus="interested",
                other={"budget_min": 3500000, "budget_max": 4500000, "preferred_location": "Vashi", "property_type": "Commercial", "timeline": "1 year", "intent_score": 3}
            ),
            Lead(
                name="Vikram Singh", email="vikram.singh@email.com", phone="+91-99999-88888",
                platformId=4, assignedTo=3, plotId=2, leadStatusId=1,
                city="Navi Mumbai", state="Maharashtra", leadStageId=5, tracker=3,
                interestStatus="interested",
                other={"budget_min": 2500000, "budget_max": 3500000, "preferred_location": "Panvel", "property_type": "Residential", "timeline": "2 months", "intent_score": 8}
            ),
        ]
        for l in leads:
            db.add(l)
        db.commit()
        print(f"Created {len(leads)} leads")

        # Create Campaigns
        campaigns = [
            Campaign(
                name="Q1 2026 - Mumbai Residential Plots",
                status=CampaignStatus.ACTIVE,
                filters={"leadStageIds": [1, 2], "cities": ["Mumbai", "Navi Mumbai"], "platformIds": [1, 2, 3], "maxTracker": 3},
                daily_call_limit=500, calling_hours_start="10:00:00", calling_hours_end="20:00:00",
                max_attempts_per_lead=3, total_leads=1247, completed_leads=811, created_by=2
            ),
            Campaign(
                name="Industrial Land - Pune & Nashik",
                status=CampaignStatus.PAUSED,
                filters={"leadStageIds": [1], "cities": ["Pune", "Nashik"], "maxTracker": 3},
                daily_call_limit=300, calling_hours_start="10:00:00", calling_hours_end="18:00:00",
                max_attempts_per_lead=3, total_leads=543, completed_leads=228, created_by=2
            ),
            Campaign(
                name="Commercial Properties - Thane",
                status=CampaignStatus.DRAFT,
                filters={"leadStageIds": [1, 2, 3], "cities": ["Thane"], "maxTracker": 2},
                daily_call_limit=200, calling_hours_start="09:00:00", calling_hours_end="21:00:00",
                max_attempts_per_lead=2, total_leads=320, completed_leads=0, created_by=2
            ),
        ]
        for c in campaigns:
            db.add(c)
        db.commit()
        print(f"Created {len(campaigns)} campaigns")

        # Create Call Logs
        call_logs = [
            CallLog(
                lead_id=1, call_id="call_001", campaign_id=1, status=CallStatus.COMPLETED,
                duration=263, classification=Classification.HOT, sentiment_score=0.85,
                call_outcome="Qualified",
                call_summary="Budget: 20-30L confirmed. Location: Prefers Panvel. Timeline: 3 months. Next: Site visit scheduled",
                started_at=datetime.now() - timedelta(hours=2),
                ended_at=datetime.now() - timedelta(hours=2) + timedelta(minutes=4, seconds=23)
            ),
            CallLog(
                lead_id=2, call_id="call_002", campaign_id=2, status=CallStatus.COMPLETED,
                duration=407, classification=Classification.WARM, sentiment_score=0.65,
                call_outcome="Callback Requested",
                call_summary="Location too far from office. Requested callback in 2 weeks after discussing with family.",
                started_at=datetime.now() - timedelta(hours=5),
                ended_at=datetime.now() - timedelta(hours=5) + timedelta(minutes=6, seconds=47)
            ),
            CallLog(
                lead_id=4, call_id="call_003", campaign_id=1, status=CallStatus.COMPLETED,
                duration=125, classification=Classification.COLD, sentiment_score=0.35,
                call_outcome="Not Interested",
                call_summary="Already purchased property elsewhere. Marked as not interested.",
                started_at=datetime.now() - timedelta(hours=8),
                ended_at=datetime.now() - timedelta(hours=8) + timedelta(minutes=2, seconds=5)
            ),
            CallLog(
                lead_id=5, call_id="call_004", campaign_id=1, status=CallStatus.COMPLETED,
                duration=312, classification=Classification.HOT, sentiment_score=0.92,
                call_outcome="Meeting Scheduled",
                call_summary="Very interested. Site visit scheduled for next week. Budget confirmed.",
                started_at=datetime.now() - timedelta(days=1),
                ended_at=datetime.now() - timedelta(days=1) + timedelta(minutes=5, seconds=12)
            ),
        ]
        for c in call_logs:
            db.add(c)
        db.commit()
        print(f"Created {len(call_logs)} call logs")

        # Create Compliance Logs
        compliance_logs = [
            ComplianceLog(
                event_type=ComplianceEventType.CONSENT_CAPTURED, lead_id=1,
                details={"source": "facebook_lead_form", "text": "I agree to be contacted for real estate information"}
            ),
            ComplianceLog(
                event_type=ComplianceEventType.CONSENT_CAPTURED, lead_id=2,
                details={"source": "website_form", "text": "I consent to receiving calls and messages"}
            ),
            ComplianceLog(
                event_type=ComplianceEventType.OPT_OUT_REQUESTED, lead_id=4, call_id="call_003",
                details={"reason": "Already purchased elsewhere", "processed_at": datetime.now().isoformat()}
            ),
        ]
        for c in compliance_logs:
            db.add(c)
        db.commit()
        print(f"Created {len(compliance_logs)} compliance logs")

        print("\n✅ Database seeded successfully!")
        print("\nTest credentials:")
        print("  Email: admin@aria.ai")
        print("  Password: password123")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

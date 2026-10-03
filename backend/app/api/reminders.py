from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Subscription, User
from app.auth.security import get_current_user
from app.services.billing_service import BillingService

router = APIRouter(prefix="", tags=["Automatic Reminders"])

@router.post("/subscriptions/{sub_id}/reminders")
def send_subscription_reminders(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Owner triggers reminders for all members who have not yet paid."""
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the subscription owner can send payment reminders")

    count = BillingService.send_reminders_for_subscription(db, sub_id, current_user.id)
    return {
        "message": f"Successfully sent payment reminders to {count} member(s).",
        "reminders_sent": count
    }

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Settlement, Subscription, BillingCycle, PaymentObligation, User
from app.schemas.schemas import SettlementResponse, MemberDebt
from app.auth.security import get_current_user

router = APIRouter(prefix="/settlements", tags=["Settlement System"])

@router.get("", response_model=List[SettlementResponse])
def get_all_settlements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Settlement overview: Returns all active cycle settlements for user's subscriptions.
    Shows:
    - Total paid by owner
    - Total collected
    - Remaining pending amount
    - Individual member debts and payment statuses
    """
    # Subscriptions where user is owner or member
    user_subs = db.query(Subscription).filter(Subscription.owner_id == current_user.id).all()

    resp = []
    for sub in user_subs:
        latest_cycle = db.query(BillingCycle).filter(
            BillingCycle.subscription_id == sub.id
        ).order_by(BillingCycle.cycle_number.desc()).first()

        if not latest_cycle:
            continue

        settlement = db.query(Settlement).filter(Settlement.billing_cycle_id == latest_cycle.id).first()
        if not settlement:
            continue

        # Get debts for each member
        obligations = db.query(PaymentObligation).filter(
            PaymentObligation.billing_cycle_id == latest_cycle.id
        ).all()

        debts = []
        for ob in obligations:
            # Skip owner's own share in the debtor list
            if ob.user_id == sub.owner_id:
                continue

            user_obj = ob.user
            m_name = user_obj.name if user_obj else "Member"
            m_email = user_obj.email if user_obj else None

            paid_amount = ob.amount if ob.status == "paid" else 0.0
            owed_amount = 0.0 if ob.status == "paid" else ob.amount

            debts.append(MemberDebt(
                member_id=ob.member_id,
                user_id=ob.user_id,
                name=m_name,
                email=m_email,
                amount_owed=owed_amount,
                amount_paid=paid_amount,
                status=ob.status
            ))

        resp.append(SettlementResponse(
            id=settlement.id,
            billing_cycle_id=settlement.billing_cycle_id,
            subscription_id=sub.id,
            subscription_name=sub.name,
            payer_user_id=settlement.payer_user_id,
            owner_name=sub.owner.name if sub.owner else "Owner",
            total_bill_amount=settlement.total_bill_amount,
            total_collected=settlement.total_collected,
            total_pending=settlement.total_pending,
            is_fully_settled=settlement.is_fully_settled,
            debts=debts
        ))

    return resp

@router.get("/{subscription_id}", response_model=SettlementResponse)
def get_subscription_settlement(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    latest_cycle = db.query(BillingCycle).filter(
        BillingCycle.subscription_id == sub.id
    ).order_by(BillingCycle.cycle_number.desc()).first()

    if not latest_cycle:
        raise HTTPException(status_code=404, detail="No billing cycle found for subscription")

    settlement = db.query(Settlement).filter(Settlement.billing_cycle_id == latest_cycle.id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement record not found")

    obligations = db.query(PaymentObligation).filter(
        PaymentObligation.billing_cycle_id == latest_cycle.id
    ).all()

    debts = []
    for ob in obligations:
        if ob.user_id == sub.owner_id:
            continue
        user_obj = ob.user
        debts.append(MemberDebt(
            member_id=ob.member_id,
            user_id=ob.user_id,
            name=user_obj.name if user_obj else "Member",
            email=user_obj.email if user_obj else None,
            amount_owed=0.0 if ob.status == "paid" else ob.amount,
            amount_paid=ob.amount if ob.status == "paid" else 0.0,
            status=ob.status
        ))

    return SettlementResponse(
        id=settlement.id,
        billing_cycle_id=settlement.billing_cycle_id,
        subscription_id=sub.id,
        subscription_name=sub.name,
        payer_user_id=settlement.payer_user_id,
        owner_name=sub.owner.name if sub.owner else "Owner",
        total_bill_amount=settlement.total_bill_amount,
        total_collected=settlement.total_collected,
        total_pending=settlement.total_pending,
        is_fully_settled=settlement.is_fully_settled,
        debts=debts
    )

import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import (
    Subscription, SubscriptionMember, SplitRule, BillingCycle,
    PaymentObligation, User, Notification
)
from app.schemas.schemas import (
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    SubscriptionDetailResponse, MemberResponse, SplitRuleResponse,
    BillingCycleResponse, UserSimple, SplitPreviewRequest
)
from app.auth.security import get_current_user
from app.services.billing_service import BillingService
from app.services.split_engine import SplitEngine

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("", response_model=List[SubscriptionResponse])
def list_subscriptions(
    role_filter: Optional[str] = None,  # "owned" or "member"
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find all subscriptions user is involved with
    member_sub_ids = [
        r[0] for r in db.query(SubscriptionMember.subscription_id).filter(
            SubscriptionMember.user_id == current_user.id,
            SubscriptionMember.status == "active"
        ).all()
    ]

    query = db.query(Subscription).filter(
        (Subscription.owner_id == current_user.id) | (Subscription.id.in_(member_sub_ids))
    )

    if role_filter == "owned":
        query = query.filter(Subscription.owner_id == current_user.id)
    elif role_filter == "member":
        query = query.filter(Subscription.owner_id != current_user.id)

    if status_filter:
        query = query.filter(Subscription.status == status_filter)

    subscriptions = query.order_by(Subscription.created_at.desc()).all()

    result = []
    for sub in subscriptions:
        member_count = db.query(SubscriptionMember).filter(
            SubscriptionMember.subscription_id == sub.id,
            SubscriptionMember.status == "active"
        ).count()

        # Find current user's obligation for this subscription
        latest_cycle = db.query(BillingCycle).filter(
            BillingCycle.subscription_id == sub.id
        ).order_by(BillingCycle.cycle_number.desc()).first()

        my_ob = None
        if latest_cycle:
            my_ob = db.query(PaymentObligation).filter(
                PaymentObligation.billing_cycle_id == latest_cycle.id,
                PaymentObligation.user_id == current_user.id
            ).first()

        sub_resp = SubscriptionResponse(
            id=sub.id,
            name=sub.name,
            category=sub.category,
            total_price=sub.total_price,
            billing_frequency=sub.billing_frequency,
            next_billing_date=sub.next_billing_date,
            description=sub.description,
            service_logo=sub.service_logo,
            owner_id=sub.owner_id,
            owner_name=sub.owner.name if sub.owner else None,
            owner_upi_id=sub.owner.upi_id if sub.owner else None,
            status=sub.status,
            member_count=member_count,
            my_contribution=my_ob.amount if my_ob else (sub.total_price if sub.owner_id == current_user.id else None),
            my_payment_status=my_ob.status if my_ob else ("paid" if sub.owner_id == current_user.id else "none"),
            created_at=sub.created_at,
            updated_at=sub.updated_at
        )
        result.append(sub_resp)

    return result

@router.post("", response_model=SubscriptionDetailResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    sub_in: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if sub_in.total_price <= 0:
        raise HTTPException(status_code=400, detail="Subscription price must be greater than zero.")

    # 1. Create Subscription
    subscription = Subscription(
        name=sub_in.name.strip(),
        category=sub_in.category,
        total_price=round(sub_in.total_price, 2),
        billing_frequency=sub_in.billing_frequency,
        next_billing_date=sub_in.next_billing_date,
        owner_id=current_user.id,
        status="active",
        description=sub_in.description,
        service_logo=sub_in.service_logo
    )
    db.add(subscription)
    db.flush()

    # 2. Add Owner as first member
    owner_member = SubscriptionMember(
        subscription_id=subscription.id,
        user_id=current_user.id,
        role="owner",
        status="active"
    )
    db.add(owner_member)

    # 3. Add other members
    shares_dict = {}
    for m in sub_in.members:
        # Avoid duplicating owner
        if m.user_id == current_user.id or (m.email and m.email.lower() == current_user.email.lower()):
            if m.value is not None:
                shares_dict[str(current_user.id)] = m.value
            continue

        target_user = None
        if m.user_id:
            target_user = db.query(User).filter(User.id == m.user_id).first()
        elif m.email:
            target_user = db.query(User).filter(User.email == m.email.lower().strip()).first()

        member = SubscriptionMember(
            subscription_id=subscription.id,
            user_id=target_user.id if target_user else None,
            role="member",
            status="active" if target_user else "invited",
            invite_email=m.email.lower().strip() if m.email else None
        )
        db.add(member)
        db.flush()

        key = str(target_user.id) if target_user else (m.email.lower().strip() if m.email else str(member.id))
        if m.value is not None:
            shares_dict[key] = m.value

        # Send notification to added user if registered
        if target_user:
            notif = Notification(
                user_id=target_user.id,
                title=f"Added to {subscription.name}",
                message=f"{current_user.name} added you to a shared {subscription.name} subscription.",
                type="invitation",
                related_id=subscription.id
            )
            db.add(notif)

    # 4. Save Split Rule
    split_rule = SplitRule(
        subscription_id=subscription.id,
        split_type=sub_in.split_type,
        rule_config={"shares": shares_dict}
    )
    db.add(split_rule)
    db.flush()

    # 5. Generate Initial Billing Cycle & Payment Obligations
    BillingService.create_billing_cycle(
        db=db,
        subscription=subscription,
        cycle_number=1,
        start_date=datetime.date.today(),
        due_date=subscription.next_billing_date
    )

    db.commit()
    db.refresh(subscription)
    return get_subscription_detail(subscription.id, current_user, db)

@router.get("/{sub_id}", response_model=SubscriptionDetailResponse)
def get_subscription_detail(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    # Check permission (must be owner or active member)
    is_owner = (sub.owner_id == current_user.id)
    membership = db.query(SubscriptionMember).filter(
        SubscriptionMember.subscription_id == sub_id,
        SubscriptionMember.user_id == current_user.id
    ).first()

    if not is_owner and not membership:
        raise HTTPException(status_code=403, detail="You do not have access to this subscription")

    # Get active cycle
    active_cycle = db.query(BillingCycle).filter(
        BillingCycle.subscription_id == sub_id
    ).order_by(BillingCycle.cycle_number.desc()).first()

    # Build member responses
    members_db = db.query(SubscriptionMember).filter(
        SubscriptionMember.subscription_id == sub_id
    ).all()

    member_responses = []
    my_contribution = None
    my_payment_status = "none"

    for m in members_db:
        # Find latest obligation for this member in the active cycle
        ob = None
        if active_cycle:
            ob = db.query(PaymentObligation).filter(
                PaymentObligation.billing_cycle_id == active_cycle.id,
                PaymentObligation.member_id == m.id
            ).first()

        amount = ob.amount if ob else 0.0
        status_val = ob.status if ob else "pending"

        if m.user_id == current_user.id:
            my_contribution = amount
            my_payment_status = status_val

        m_user = m.user
        member_responses.append(MemberResponse(
            id=m.id,
            user_id=m.user_id,
            name=m_user.name if m_user else (m.invite_email or "Invited Member"),
            email=m_user.email if m_user else m.invite_email,
            phone=m_user.phone if m_user else None,
            upi_id=m_user.upi_id if m_user else None,
            role=m.role,
            status=m.status,
            contribution_amount=amount,
            payment_status=status_val,
            joined_at=m.joined_at
        ))

    # All cycles
    all_cycles = db.query(BillingCycle).filter(
        BillingCycle.subscription_id == sub_id
    ).order_by(BillingCycle.cycle_number.desc()).all()

    split_rule_resp = None
    if sub.split_rule:
        split_rule_resp = SplitRuleResponse(
            split_type=sub.split_rule.split_type,
            rule_config=sub.split_rule.rule_config
        )

    active_cycle_resp = None
    if active_cycle:
        active_cycle_resp = BillingCycleResponse.from_orm(active_cycle)

    return SubscriptionDetailResponse(
        id=sub.id,
        name=sub.name,
        category=sub.category,
        total_price=sub.total_price,
        billing_frequency=sub.billing_frequency,
        next_billing_date=sub.next_billing_date,
        description=sub.description,
        service_logo=sub.service_logo,
        owner_id=sub.owner_id,
        owner_name=sub.owner.name if sub.owner else None,
        owner_upi_id=sub.owner.upi_id if sub.owner else None,
        status=sub.status,
        member_count=len([m for m in members_db if m.status == "active"]),
        my_contribution=my_contribution,
        my_payment_status=my_payment_status,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        owner=UserSimple.from_orm(sub.owner),
        members=member_responses,
        split_rule=split_rule_resp,
        active_cycle=active_cycle_resp,
        all_cycles=[BillingCycleResponse.from_orm(c) for c in all_cycles]
    )

@router.put("/{sub_id}", response_model=SubscriptionResponse)
def update_subscription(
    sub_id: int,
    sub_update: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the subscription owner can edit this subscription")

    if sub_update.name is not None:
        sub.name = sub_update.name.strip()
    if sub_update.category is not None:
        sub.category = sub_update.category
    if sub_update.total_price is not None:
        sub.total_price = round(sub_update.total_price, 2)
    if sub_update.billing_frequency is not None:
        sub.billing_frequency = sub_update.billing_frequency
    if sub_update.next_billing_date is not None:
        sub.next_billing_date = sub_update.next_billing_date
    if sub_update.description is not None:
        sub.description = sub_update.description
    if sub_update.service_logo is not None:
        sub.service_logo = sub_update.service_logo
    if sub_update.status is not None:
        sub.status = sub_update.status

    db.commit()
    db.refresh(sub)
    return sub

@router.delete("/{sub_id}")
def cancel_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete/cancel this subscription")

    # Financial transactions are preserved; mark status as cancelled
    sub.status = "cancelled"
    db.commit()
    return {"message": "Subscription marked as cancelled."}

@router.post("/{sub_id}/pause")
def pause_subscription(sub_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub or sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    sub.status = "paused"
    db.commit()
    return {"message": "Subscription paused"}

@router.post("/{sub_id}/resume")
def resume_subscription(sub_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub or sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")
    sub.status = "active"
    db.commit()
    return {"message": "Subscription resumed"}

@router.post("/{sub_id}/members")
def add_member(
    sub_id: int,
    email: str,
    role: str = "member",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub or sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can add members")

    email_clean = email.lower().strip()
    target_user = db.query(User).filter(User.email == email_clean).first()

    # Check if already member
    existing = db.query(SubscriptionMember).filter(
        SubscriptionMember.subscription_id == sub_id,
        (SubscriptionMember.user_id == target_user.id) if target_user else (SubscriptionMember.invite_email == email_clean)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This user is already a member of this subscription")

    new_member = SubscriptionMember(
        subscription_id=sub_id,
        user_id=target_user.id if target_user else None,
        role=role,
        status="active" if target_user else "invited",
        invite_email=email_clean
    )
    db.add(new_member)
    db.commit()

    if target_user:
        notif = Notification(
            user_id=target_user.id,
            title=f"Invitation to {sub.name}",
            message=f"{current_user.name} added you to {sub.name}.",
            type="invitation",
            related_id=sub.id
        )
        db.add(notif)
        db.commit()

    return {"message": f"Added {email_clean} to subscription", "member_id": new_member.id}

@router.delete("/{sub_id}/members/{member_id}")
def remove_member(
    sub_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    member = db.query(SubscriptionMember).filter(
        SubscriptionMember.id == member_id,
        SubscriptionMember.subscription_id == sub_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Allow owner to remove member, or member to leave themselves
    if sub.owner_id != current_user.id and member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the owner from subscription")

    member.status = "left"
    db.commit()
    return {"message": "Member removed successfully"}

@router.post("/{sub_id}/next-cycle")
def generate_next_billing_cycle(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub or sub.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can advance the billing cycle")

    latest_cycle = db.query(BillingCycle).filter(
        BillingCycle.subscription_id == sub_id
    ).order_by(BillingCycle.cycle_number.desc()).first()

    next_num = (latest_cycle.cycle_number + 1) if latest_cycle else 1
    new_start = (latest_cycle.due_date) if latest_cycle else datetime.date.today()
    new_due = new_start + datetime.timedelta(days=30)

    new_cycle = BillingService.create_billing_cycle(
        db=db,
        subscription=sub,
        cycle_number=next_num,
        start_date=new_start,
        due_date=new_due
    )

    # Update subscription next_billing_date
    sub.next_billing_date = new_due
    db.commit()

    return {"message": f"Cycle #{next_num} generated successfully", "cycle_id": new_cycle.id}

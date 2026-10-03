import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    Subscription, SubscriptionMember, SplitRule, BillingCycle,
    PaymentObligation, Settlement, Notification, User, Transaction
)
from app.services.split_engine import SplitEngine
from app.schemas.schemas import SplitMemberInput
from app.services.upi_service import UPIService

class BillingService:
    @staticmethod
    def create_billing_cycle(
        db: Session,
        subscription: Subscription,
        cycle_number: int = 1,
        start_date: Optional[datetime.date] = None,
        due_date: Optional[datetime.date] = None
    ) -> BillingCycle:
        if not start_date:
            start_date = datetime.date.today()
        if not due_date:
            # Default to next billing date or 30 days
            due_date = subscription.next_billing_date or (start_date + datetime.timedelta(days=30))

        cycle = BillingCycle(
            subscription_id=subscription.id,
            cycle_number=cycle_number,
            start_date=start_date,
            due_date=due_date,
            total_amount=subscription.total_price,
            status="pending",
            owner_paid_status="paid"  # Owner is assumed to pay primary bill upfront
        )
        db.add(cycle)
        db.flush()

        # Fetch active members
        members = db.query(SubscriptionMember).filter(
            SubscriptionMember.subscription_id == subscription.id,
            SubscriptionMember.status == "active"
        ).all()

        if not members:
            # Fallback if no members yet
            return cycle

        # Fetch split rule
        split_rule = db.query(SplitRule).filter(SplitRule.subscription_id == subscription.id).first()
        split_type = split_rule.split_type if split_rule else "equal"
        config = split_rule.rule_config or {} if split_rule else {}
        shares = config.get("shares", {})

        # Build split input
        member_inputs = []
        for m in members:
            val = None
            key = str(m.user_id) if m.user_id else m.invite_email
            if key in shares:
                val = float(shares[key])
            elif m.user and m.user.email in shares:
                val = float(shares[m.user.email])
            
            member_inputs.append(SplitMemberInput(
                user_id=m.user_id,
                email=m.user.email if m.user else m.invite_email,
                name=m.user.name if m.user else (m.invite_email or "Member"),
                role=m.role,
                value=val
            ))

        split_result = SplitEngine.calculate_split(subscription.total_price, split_type, member_inputs)

        # Create payment obligations for each member
        for i, alloc in enumerate(split_result.allocations):
            m = members[i]
            # Owner doesn't pay themselves if they paid the full bill upfront,
            # but their share is recorded as 'paid' by definition
            is_owner = (m.role == "owner" or m.user_id == subscription.owner_id)
            initial_status = "paid" if is_owner else "pending"

            ref = UPIService.generate_payment_reference(subscription.id, m.id)
            obligation = PaymentObligation(
                billing_cycle_id=cycle.id,
                subscription_id=subscription.id,
                member_id=m.id,
                user_id=m.user_id,
                amount=alloc.amount,
                due_date=due_date,
                status=initial_status,
                payment_reference=ref
            )
            db.add(obligation)

        db.flush()

        # Create Settlement Record
        # Total collected starts with owner's own share if owner paid
        owner_share = next((alloc.amount for i, alloc in enumerate(split_result.allocations) 
                            if members[i].role == "owner" or members[i].user_id == subscription.owner_id), 0.0)
        
        total_pending = subscription.total_price - owner_share
        settlement = Settlement(
            billing_cycle_id=cycle.id,
            subscription_id=subscription.id,
            payer_user_id=subscription.owner_id,
            total_bill_amount=subscription.total_price,
            total_collected=owner_share,
            total_pending=total_pending,
            is_fully_settled=(total_pending <= 0.01)
        )
        db.add(settlement)
        db.commit()
        db.refresh(cycle)
        return cycle

    @staticmethod
    def update_settlement_on_payment(db: Session, obligation: PaymentObligation):
        """Update settlement and cycle status after a payment obligation is paid."""
        cycle = obligation.billing_cycle
        if not cycle:
            return

        settlement = db.query(Settlement).filter(Settlement.billing_cycle_id == cycle.id).first()
        if not settlement:
            return

        # Calculate all paid obligations
        paid_obligations = db.query(PaymentObligation).filter(
            PaymentObligation.billing_cycle_id == cycle.id,
            PaymentObligation.status == "paid"
        ).all()

        total_collected = sum(o.amount for o in paid_obligations)
        settlement.total_collected = round(total_collected, 2)
        settlement.total_pending = round(max(0.0, settlement.total_bill_amount - total_collected), 2)
        settlement.is_fully_settled = (settlement.total_pending <= 0.01)

        # Check if all obligations are paid
        pending_count = db.query(PaymentObligation).filter(
            PaymentObligation.billing_cycle_id == cycle.id,
            PaymentObligation.status.in_(["pending", "initiated", "overdue", "failed"])
        ).count()

        if pending_count == 0:
            cycle.status = "completed"

        db.commit()

    @staticmethod
    def send_reminders_for_subscription(db: Session, subscription_id: int, sender_id: int) -> int:
        """Trigger reminders for all pending obligations in active cycles of a subscription."""
        pending_obs = db.query(PaymentObligation).join(BillingCycle).filter(
            PaymentObligation.subscription_id == subscription_id,
            BillingCycle.status == "pending",
            PaymentObligation.status.in_(["pending", "overdue", "failed"]),
            PaymentObligation.user_id.isnot(None)
        ).all()

        count = 0
        today = datetime.date.today()
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        sub_name = sub.name if sub else "subscription"

        for ob in pending_obs:
            days_diff = (ob.due_date - today).days
            if days_diff < 0:
                title = f"Payment Overdue: {sub_name}"
                msg = f"Your contribution of ₹{ob.amount:.2f} for {sub_name} was due on {ob.due_date.strftime('%d %b %Y')}. Please settle via UPI."
                ob.status = "overdue"
            elif days_diff == 0:
                title = f"Payment Due Today: {sub_name}"
                msg = f"Your contribution of ₹{ob.amount:.2f} for {sub_name} is due today! Pay now via UPI."
            else:
                title = f"Upcoming Payment Reminder: {sub_name}"
                msg = f"Friendly reminder: ₹{ob.amount:.2f} for {sub_name} is due in {days_diff} days on {ob.due_date.strftime('%d %b %Y')}."

            notif = Notification(
                user_id=ob.user_id,
                title=title,
                message=msg,
                type="reminder",
                related_id=ob.id
            )
            db.add(notif)
            count += 1

        db.commit()
        return count

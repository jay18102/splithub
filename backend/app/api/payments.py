import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import (
    PaymentObligation, Transaction, Subscription, SubscriptionMember,
    User, Notification, BillingCycle
)
from app.schemas.schemas import (
    PaymentObligationResponse, PaymentInitiateResponse,
    PaymentConfirmRequest, PaymentConfirmResponse, TransactionResponse
)
from app.auth.security import get_current_user
from app.services.upi_service import UPIService
from app.services.billing_service import BillingService

router = APIRouter(prefix="/payments", tags=["UPI Payments & Sandbox"])

@router.get("/obligations", response_model=List[PaymentObligationResponse])
def get_user_obligations(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all payment obligations where the current user is payer or receiver."""
    query = db.query(PaymentObligation).filter(
        PaymentObligation.user_id == current_user.id
    )

    if status_filter:
        query = query.filter(PaymentObligation.status == status_filter)

    obligations = query.order_by(PaymentObligation.due_date.asc()).all()

    resp = []
    for ob in obligations:
        sub = ob.subscription
        receiver = sub.owner if sub else None
        resp.append(PaymentObligationResponse(
            id=ob.id,
            billing_cycle_id=ob.billing_cycle_id,
            subscription_id=ob.subscription_id,
            subscription_name=sub.name if sub else "Unknown",
            subscription_logo=sub.service_logo if sub else None,
            user_id=ob.user_id,
            user_name=current_user.name,
            receiver_id=receiver.id if receiver else 0,
            receiver_name=receiver.name if receiver else "Platform",
            receiver_upi_id=receiver.upi_id if receiver else "splitsub@icici",
            amount=ob.amount,
            due_date=ob.due_date,
            status=ob.status,
            payment_reference=ob.payment_reference,
            created_at=ob.created_at
        ))
    return resp

@router.post("/{obligation_id}/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    obligation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate UPI payment for an obligation.
    Generates authentic UPI deep-link intent and dynamic QR code data URL.
    """
    ob = db.query(PaymentObligation).filter(PaymentObligation.id == obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Payment obligation not found")

    if ob.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only pay for your own obligations")

    if ob.status == "paid":
        raise HTTPException(status_code=400, detail="This obligation has already been paid.")

    sub = ob.subscription
    receiver = sub.owner if sub else None
    receiver_vpa = receiver.upi_id if (receiver and receiver.upi_id) else "splitsub@icici"
    receiver_name = receiver.name if receiver else "SplitSub Admin"

    # Mark as initiated
    ob.status = "initiated"
    db.commit()

    # Generate UPI URI & QR Code
    upi_uri = UPIService.generate_upi_uri(
        vpa=receiver_vpa,
        payee_name=receiver_name,
        amount=ob.amount,
        transaction_note=f"{sub.name} share",
        transaction_ref=ob.payment_reference
    )
    qr_data_url = UPIService.generate_qr_code_base64(upi_uri)

    return PaymentInitiateResponse(
        obligation_id=ob.id,
        amount=ob.amount,
        receiver_name=receiver_name,
        receiver_upi_id=receiver_vpa,
        payer_name=current_user.name,
        payment_reference=ob.payment_reference,
        upi_uri=upi_uri,
        qr_code_data_url=qr_data_url,
        is_sandbox=True,
        notes=f"UPI Payment request for {sub.name} (Ref: {ob.payment_reference})"
    )

@router.post("/{obligation_id}/confirm", response_model=PaymentConfirmResponse)
def confirm_payment(
    obligation_id: int,
    confirm_in: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm / Simulate payment completion (Sandbox Mode).
    Simulates UPI webhook or user payment confirmation.
    """
    ob = db.query(PaymentObligation).filter(PaymentObligation.id == obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Payment obligation not found")

    if ob.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if ob.status == "paid":
        raise HTTPException(status_code=400, detail="This obligation is already marked as paid.")

    sub = ob.subscription
    receiver_id = sub.owner_id if sub else current_user.id
    upi_txn = confirm_in.upi_txn_id or UPIService.generate_upi_txn_ref()

    if confirm_in.simulate_status == "failed":
        ob.status = "failed"
        txn = Transaction(
            payment_obligation_id=ob.id,
            subscription_id=ob.subscription_id,
            payer_id=current_user.id,
            receiver_id=receiver_id,
            amount=ob.amount,
            payment_method="UPI",
            upi_vpa_payer=confirm_in.payer_vpa or current_user.upi_id,
            upi_vpa_receiver=sub.owner.upi_id if (sub and sub.owner) else "splitsub@icici",
            upi_txn_id=upi_txn,
            status="failed",
            notes="Simulated payment failure in Demo/Sandbox mode"
        )
        db.add(txn)
        
        # Notification
        db.add(Notification(
            user_id=current_user.id,
            title="Payment Failed",
            message=f"UPI Payment of ₹{ob.amount:.2f} for {sub.name} failed. Please try again.",
            type="payment_failed",
            related_id=ob.id
        ))
        db.commit()

        return PaymentConfirmResponse(
            success=False,
            message="Payment simulation failed as requested.",
            obligation_status="failed",
            transaction_id=txn.id,
            upi_txn_id=upi_txn,
            timestamp=datetime.datetime.utcnow()
        )

    # Success Flow
    ob.status = "paid"
    txn = Transaction(
        payment_obligation_id=ob.id,
        subscription_id=ob.subscription_id,
        payer_id=current_user.id,
        receiver_id=receiver_id,
        amount=ob.amount,
        payment_method="UPI",
        upi_vpa_payer=confirm_in.payer_vpa or current_user.upi_id,
        upi_vpa_receiver=sub.owner.upi_id if (sub and sub.owner) else "splitsub@icici",
        upi_txn_id=upi_txn,
        status="successful",
        notes=f"UPI Payment for {sub.name} subscription"
    )
    db.add(txn)
    db.flush()

    # Update settlement & billing cycle status
    BillingService.update_settlement_on_payment(db, ob)

    # Notifications
    db.add(Notification(
        user_id=current_user.id,
        title="Payment Successful",
        message=f"You successfully paid ₹{ob.amount:.2f} for {sub.name} via UPI ({upi_txn}).",
        type="payment_success",
        related_id=ob.id
    ))
    if receiver_id != current_user.id:
        db.add(Notification(
            user_id=receiver_id,
            title="Contribution Received",
            message=f"{current_user.name} paid ₹{ob.amount:.2f} for {sub.name} via UPI.",
            type="payment_success",
            related_id=ob.id
        ))

    db.commit()

    return PaymentConfirmResponse(
        success=True,
        message="UPI Payment successful! Settlement updated.",
        obligation_status="paid",
        transaction_id=txn.id,
        upi_txn_id=upi_txn,
        timestamp=txn.timestamp
    )

@router.get("/history", response_model=List[TransactionResponse])
def get_transaction_history(
    subscription_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(
        (Transaction.payer_id == current_user.id) | (Transaction.receiver_id == current_user.id)
    )

    if subscription_id:
        query = query.filter(Transaction.subscription_id == subscription_id)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)

    transactions = query.order_by(Transaction.timestamp.desc()).all()

    resp = []
    for t in transactions:
        resp.append(TransactionResponse(
            id=t.id,
            subscription_id=t.subscription_id,
            subscription_name=t.subscription.name if t.subscription else "Unknown",
            payer_id=t.payer_id,
            payer_name=t.payer.name if t.payer else "Unknown",
            receiver_id=t.receiver_id,
            receiver_name=t.receiver.name if t.receiver else "Unknown",
            amount=t.amount,
            payment_method=t.payment_method,
            upi_vpa_payer=t.upi_vpa_payer,
            upi_vpa_receiver=t.upi_vpa_receiver,
            upi_txn_id=t.upi_txn_id,
            status=t.status,
            notes=t.notes,
            timestamp=t.timestamp
        ))
    return resp

@router.post("/webhook")
def payment_webhook(payload: dict, db: Session = Depends(get_db)):
    """
    Extensible Webhook endpoint for real payment gateways (Razorpay, Cashfree, Setu UPI).
    """
    return {"status": "received", "mode": "sandbox", "payload_keys": list(payload.keys())}

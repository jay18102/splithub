import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    upi_id = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owned_subscriptions = relationship("Subscription", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("SubscriptionMember", back_populates="user", cascade="all, delete-orphan")
    payment_obligations = relationship("PaymentObligation", back_populates="user")
    sent_transactions = relationship("Transaction", foreign_keys="Transaction.payer_id", back_populates="payer")
    received_transactions = relationship("Transaction", foreign_keys="Transaction.receiver_id", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(80), default="Entertainment")
    total_price = Column(Float, nullable=False)
    billing_frequency = Column(String(50), default="monthly")  # monthly, yearly, custom
    next_billing_date = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="active")  # active, paused, cancelled
    description = Column(Text, nullable=True)
    service_logo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_subscriptions")
    members = relationship("SubscriptionMember", back_populates="subscription", cascade="all, delete-orphan")
    split_rule = relationship("SplitRule", back_populates="subscription", uselist=False, cascade="all, delete-orphan")
    billing_cycles = relationship("BillingCycle", back_populates="subscription", cascade="all, delete-orphan")
    payment_obligations = relationship("PaymentObligation", back_populates="subscription", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="subscription", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionMember(Base):
    __tablename__ = "subscription_members"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    role = Column(String(50), default="member")  # owner, admin, member
    status = Column(String(50), default="active")  # active, invited, declined, left
    invite_email = Column(String(255), nullable=True)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="members")
    user = relationship("User", back_populates="memberships")
    obligations = relationship("PaymentObligation", back_populates="member")


class SplitRule(Base):
    __tablename__ = "split_rules"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), unique=True, nullable=False)
    split_type = Column(String(50), default="equal")  # equal, percentage, custom, usage
    rule_config = Column(JSON, nullable=True)  # { "shares": { "user_id_or_email": value } }
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    subscription = relationship("Subscription", back_populates="split_rule")


class BillingCycle(Base):
    __tablename__ = "billing_cycles"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    cycle_number = Column(Integer, default=1)
    start_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending")  # pending, completed, overdue
    owner_paid_status = Column(String(50), default="paid")  # paid (owner paid the platform), unpaid
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="billing_cycles")
    obligations = relationship("PaymentObligation", back_populates="billing_cycle", cascade="all, delete-orphan")
    settlement = relationship("Settlement", back_populates="billing_cycle", uselist=False, cascade="all, delete-orphan")


class PaymentObligation(Base):
    __tablename__ = "payment_obligations"

    id = Column(Integer, primary_key=True, index=True)
    billing_cycle_id = Column(Integer, ForeignKey("billing_cycles.id", ondelete="CASCADE"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(Integer, ForeignKey("subscription_members.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(50), default="pending")  # requested, initiated, pending, paid, failed, overdue
    payment_reference = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    billing_cycle = relationship("BillingCycle", back_populates="obligations")
    subscription = relationship("Subscription", back_populates="payment_obligations")
    member = relationship("SubscriptionMember", back_populates="obligations")
    user = relationship("User", back_populates="payment_obligations")
    transactions = relationship("Transaction", back_populates="payment_obligation")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    payment_obligation_id = Column(Integer, ForeignKey("payment_obligations.id", ondelete="SET NULL"), nullable=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    payer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="UPI")
    upi_vpa_payer = Column(String(100), nullable=True)
    upi_vpa_receiver = Column(String(100), nullable=True)
    upi_txn_id = Column(String(120), unique=True, index=True, nullable=False)
    status = Column(String(50), default="successful")  # successful, failed, pending
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    payment_obligation = relationship("PaymentObligation", back_populates="transactions")
    payer = relationship("User", foreign_keys=[payer_id], back_populates="sent_transactions")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_transactions")
    subscription = relationship("Subscription")


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    billing_cycle_id = Column(Integer, ForeignKey("billing_cycles.id", ondelete="CASCADE"), unique=True, nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    payer_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_bill_amount = Column(Float, nullable=False)
    total_collected = Column(Float, default=0.0)
    total_pending = Column(Float, default=0.0)
    is_fully_settled = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    billing_cycle = relationship("BillingCycle", back_populates="settlement")
    subscription = relationship("Subscription", back_populates="settlements")
    payer = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="reminder")  # reminder, payment_success, payment_failed, invitation, cycle_renewal, member_change
    is_read = Column(Boolean, default=False)
    related_id = Column(Integer, nullable=True)  # obligation_id or subscription_id
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invite_code = Column(String(100), unique=True, index=True, nullable=False)
    email_or_phone = Column(String(120), nullable=False)
    status = Column(String(50), default="pending")  # pending, accepted, rejected, expired
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subscription = relationship("Subscription", back_populates="invitations")
    inviter = relationship("User")

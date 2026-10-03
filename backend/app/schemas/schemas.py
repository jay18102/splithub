import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    avatar_url: Optional[str] = None

class UserSimple(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class UserResponse(UserSimple):
    created_at: datetime.datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSimple

# --- Split Engine Schemas ---
class SplitMemberInput(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "member"
    value: Optional[float] = None  # percentage (e.g. 25.0), custom amount (e.g. 150.0), or usage factor (e.g. 2)

class SplitPreviewRequest(BaseModel):
    total_price: float
    split_type: str = "equal"  # equal, percentage, custom, usage
    members: List[SplitMemberInput]

class SplitAllocation(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    name: str
    amount: float
    percentage: float
    share_description: Optional[str] = None

class SplitPreviewResponse(BaseModel):
    total_price: float
    split_type: str
    allocations: List[SplitAllocation]
    is_valid: bool = True
    error_message: Optional[str] = None

# --- Subscription Schemas ---
class SubscriptionBase(BaseModel):
    name: str
    category: str = "Entertainment"
    total_price: float
    billing_frequency: str = "monthly"
    next_billing_date: datetime.date
    description: Optional[str] = None
    service_logo: Optional[str] = None

class SubscriptionCreate(SubscriptionBase):
    split_type: str = "equal"
    members: List[SplitMemberInput]

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_price: Optional[float] = None
    billing_frequency: Optional[str] = None
    next_billing_date: Optional[datetime.date] = None
    description: Optional[str] = None
    service_logo: Optional[str] = None
    status: Optional[str] = None

class MemberResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    role: str
    status: str
    contribution_amount: float = 0.0
    payment_status: str = "pending"  # paid, pending, overdue
    joined_at: datetime.datetime

    class Config:
        from_attributes = True

class SplitRuleResponse(BaseModel):
    split_type: str
    rule_config: Optional[Dict[str, Any]] = None

class BillingCycleResponse(BaseModel):
    id: int
    cycle_number: int
    start_date: datetime.date
    due_date: datetime.date
    total_amount: float
    status: str
    owner_paid_status: str

    class Config:
        from_attributes = True

class SubscriptionResponse(SubscriptionBase):
    id: int
    owner_id: int
    owner_name: Optional[str] = None
    owner_upi_id: Optional[str] = None
    status: str
    member_count: int = 1
    my_contribution: Optional[float] = None
    my_payment_status: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class SubscriptionDetailResponse(SubscriptionResponse):
    owner: UserSimple
    members: List[MemberResponse]
    split_rule: Optional[SplitRuleResponse] = None
    active_cycle: Optional[BillingCycleResponse] = None
    all_cycles: List[BillingCycleResponse] = []

# --- Payment & Obligation Schemas ---
class PaymentObligationResponse(BaseModel):
    id: int
    billing_cycle_id: int
    subscription_id: int
    subscription_name: str
    subscription_logo: Optional[str] = None
    user_id: Optional[int]
    user_name: str
    receiver_id: int
    receiver_name: str
    receiver_upi_id: Optional[str]
    amount: float
    due_date: datetime.date
    status: str
    payment_reference: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PaymentInitiateResponse(BaseModel):
    obligation_id: int
    amount: float
    receiver_name: str
    receiver_upi_id: str
    payer_name: str
    payment_reference: str
    upi_uri: str
    qr_code_data_url: str
    is_sandbox: bool = True
    notes: str

class PaymentConfirmRequest(BaseModel):
    upi_txn_id: Optional[str] = None
    simulate_status: str = "successful"  # "successful" or "failed" for demo sandbox
    payer_vpa: Optional[str] = None

class PaymentConfirmResponse(BaseModel):
    success: bool
    message: str
    obligation_status: str
    transaction_id: Optional[int] = None
    upi_txn_id: str
    timestamp: datetime.datetime

# --- Transaction Schemas ---
class TransactionResponse(BaseModel):
    id: int
    subscription_id: int
    subscription_name: str
    payer_id: int
    payer_name: str
    receiver_id: int
    receiver_name: str
    amount: float
    payment_method: str
    upi_vpa_payer: Optional[str] = None
    upi_vpa_receiver: Optional[str] = None
    upi_txn_id: str
    status: str
    notes: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# --- Settlement Schemas ---
class MemberDebt(BaseModel):
    member_id: int
    user_id: Optional[int]
    name: str
    email: Optional[str]
    amount_owed: float
    amount_paid: float
    status: str  # paid, pending, overdue

class SettlementResponse(BaseModel):
    id: int
    billing_cycle_id: int
    subscription_id: int
    subscription_name: str
    payer_user_id: int
    owner_name: str
    total_bill_amount: float
    total_collected: float
    total_pending: float
    is_fully_settled: bool
    debts: List[MemberDebt] = []

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    related_id: Optional[int] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Analytics & Dashboard Schemas ---
class UpcomingPayment(BaseModel):
    obligation_id: int
    subscription_id: int
    subscription_name: str
    service_logo: Optional[str] = None
    amount: float
    due_date: datetime.date
    days_left: int
    status: str

class MonthlyTrendItem(BaseModel):
    month: str
    amount: float
    collected: float

class CategorySpend(BaseModel):
    category: str
    amount: float
    count: int

class DashboardAnalytics(BaseModel):
    active_subscriptions_count: int
    monthly_contribution_total: float
    paid_this_month: float
    pending_this_month: float
    overdue_count: int
    payment_completion_rate: float
    upcoming_payments: List[UpcomingPayment]
    recent_transactions: List[TransactionResponse]
    monthly_trend: List[MonthlyTrendItem]
    category_breakdown: List[CategorySpend]
    unpaid_members_count: int

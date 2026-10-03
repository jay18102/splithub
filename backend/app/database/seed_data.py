import datetime
from sqlalchemy.orm import Session
from app.models.models import (
    User, Subscription, SubscriptionMember, SplitRule, BillingCycle,
    PaymentObligation, Transaction, Settlement, Notification
)
from app.auth.security import hash_password
from app.services.upi_service import UPIService

def seed_database(db: Session):
    # Check if database already seeded
    if db.query(User).count() > 0:
        return

    print("Seeding initial fintech demo data...")

    # 1. Create Users
    users_data = [
        {"name": "Jay Sharma", "email": "jay@splitsub.dev", "phone": "+91 98765 43210", "upi_id": "jay@okhdfcbank", "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"},
        {"name": "Rahul Verma", "email": "rahul@splitsub.dev", "phone": "+91 98123 45678", "upi_id": "rahul@okaxis", "avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80"},
        {"name": "Amit Patel", "email": "amit@splitsub.dev", "phone": "+91 99012 34567", "upi_id": "amit@paytm", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"},
        {"name": "Priya Singh", "email": "priya@splitsub.dev", "phone": "+91 98234 56789", "upi_id": "priya@ibl", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"},
        {"name": "Sneha Iyer", "email": "sneha@splitsub.dev", "phone": "+91 97345 67890", "upi_id": "sneha@ybl", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"},
    ]

    users = {}
    for ud in users_data:
        u = User(
            name=ud["name"],
            email=ud["email"],
            phone=ud["phone"],
            hashed_password=hash_password("password123"),
            upi_id=ud["upi_id"],
            avatar_url=ud["avatar"]
        )
        db.add(u)
        db.flush()
        users[ud["email"]] = u

    today = datetime.date.today()
    in_5_days = today + datetime.timedelta(days=5)
    in_7_days = today + datetime.timedelta(days=7)
    past_due = today - datetime.timedelta(days=3)

    # 2. Subscription 1: Netflix Premium 4K (Equal Split ₹649 / 4 = ₹162.25)
    s1 = Subscription(
        name="Netflix Premium 4K",
        category="Entertainment",
        total_price=649.00,
        billing_frequency="monthly",
        next_billing_date=in_5_days,
        owner_id=users["jay@splitsub.dev"].id,
        status="active",
        description="Ultra HD streaming across 4 screens shared with flatmates.",
        service_logo="netflix"
    )
    db.add(s1)
    db.flush()

    # Members
    m1_jay = SubscriptionMember(subscription_id=s1.id, user_id=users["jay@splitsub.dev"].id, role="owner", status="active")
    m1_rahul = SubscriptionMember(subscription_id=s1.id, user_id=users["rahul@splitsub.dev"].id, role="member", status="active")
    m1_amit = SubscriptionMember(subscription_id=s1.id, user_id=users["amit@splitsub.dev"].id, role="member", status="active")
    m1_priya = SubscriptionMember(subscription_id=s1.id, user_id=users["priya@splitsub.dev"].id, role="member", status="active")
    db.add_all([m1_jay, m1_rahul, m1_amit, m1_priya])
    db.flush()

    sr1 = SplitRule(subscription_id=s1.id, split_type="equal", rule_config={})
    db.add(sr1)

    c1 = BillingCycle(
        subscription_id=s1.id,
        cycle_number=1,
        start_date=today - datetime.timedelta(days=25),
        due_date=in_5_days,
        total_amount=649.00,
        status="pending",
        owner_paid_status="paid"
    )
    db.add(c1)
    db.flush()

    # Obligations
    ob1_jay = PaymentObligation(billing_cycle_id=c1.id, subscription_id=s1.id, member_id=m1_jay.id, user_id=users["jay@splitsub.dev"].id, amount=162.25, due_date=in_5_days, status="paid", payment_reference=UPIService.generate_payment_reference(s1.id, m1_jay.id))
    ob1_rahul = PaymentObligation(billing_cycle_id=c1.id, subscription_id=s1.id, member_id=m1_rahul.id, user_id=users["rahul@splitsub.dev"].id, amount=162.25, due_date=in_5_days, status="paid", payment_reference=UPIService.generate_payment_reference(s1.id, m1_rahul.id))
    ob1_amit = PaymentObligation(billing_cycle_id=c1.id, subscription_id=s1.id, member_id=m1_amit.id, user_id=users["amit@splitsub.dev"].id, amount=162.25, due_date=past_due, status="overdue", payment_reference=UPIService.generate_payment_reference(s1.id, m1_amit.id))
    ob1_priya = PaymentObligation(billing_cycle_id=c1.id, subscription_id=s1.id, member_id=m1_priya.id, user_id=users["priya@splitsub.dev"].id, amount=162.25, due_date=in_5_days, status="pending", payment_reference=UPIService.generate_payment_reference(s1.id, m1_priya.id))
    db.add_all([ob1_jay, ob1_rahul, ob1_amit, ob1_priya])
    db.flush()

    # Rahul paid transaction
    t1_rahul = Transaction(
        payment_obligation_id=ob1_rahul.id,
        subscription_id=s1.id,
        payer_id=users["rahul@splitsub.dev"].id,
        receiver_id=users["jay@splitsub.dev"].id,
        amount=162.25,
        payment_method="UPI",
        upi_vpa_payer="rahul@okaxis",
        upi_vpa_receiver="jay@okhdfcbank",
        upi_txn_id=UPIService.generate_upi_txn_ref(),
        status="successful",
        notes="Netflix October share"
    )
    db.add(t1_rahul)

    settlement1 = Settlement(
        billing_cycle_id=c1.id,
        subscription_id=s1.id,
        payer_user_id=users["jay@splitsub.dev"].id,
        total_bill_amount=649.00,
        total_collected=324.50, # Jay + Rahul
        total_pending=324.50, # Amit + Priya
        is_fully_settled=False
    )
    db.add(settlement1)

    # 3. Subscription 2: Spotify Family (Percentage Split: Jay 30%, Rahul 20%, Amit 20%, Priya 15%, Sneha 15% -> Total ₹179.00)
    s2 = Subscription(
        name="Spotify Family",
        category="Music",
        total_price=179.00,
        billing_frequency="monthly",
        next_billing_date=in_7_days,
        owner_id=users["jay@splitsub.dev"].id,
        status="active",
        description="High fidelity ad-free music for the gang.",
        service_logo="spotify"
    )
    db.add(s2)
    db.flush()

    m2_jay = SubscriptionMember(subscription_id=s2.id, user_id=users["jay@splitsub.dev"].id, role="owner", status="active")
    m2_rahul = SubscriptionMember(subscription_id=s2.id, user_id=users["rahul@splitsub.dev"].id, role="member", status="active")
    m2_amit = SubscriptionMember(subscription_id=s2.id, user_id=users["amit@splitsub.dev"].id, role="member", status="active")
    m2_priya = SubscriptionMember(subscription_id=s2.id, user_id=users["priya@splitsub.dev"].id, role="member", status="active")
    m2_sneha = SubscriptionMember(subscription_id=s2.id, user_id=users["sneha@splitsub.dev"].id, role="member", status="active")
    db.add_all([m2_jay, m2_rahul, m2_amit, m2_priya, m2_sneha])
    db.flush()

    shares_pct = {
        str(users["jay@splitsub.dev"].id): 30.0,
        str(users["rahul@splitsub.dev"].id): 20.0,
        str(users["amit@splitsub.dev"].id): 20.0,
        str(users["priya@splitsub.dev"].id): 15.0,
        str(users["sneha@splitsub.dev"].id): 15.0,
    }
    sr2 = SplitRule(subscription_id=s2.id, split_type="percentage", rule_config={"shares": shares_pct})
    db.add(sr2)

    c2 = BillingCycle(
        subscription_id=s2.id,
        cycle_number=1,
        start_date=today - datetime.timedelta(days=23),
        due_date=in_7_days,
        total_amount=179.00,
        status="pending",
        owner_paid_status="paid"
    )
    db.add(c2)
    db.flush()

    ob2_jay = PaymentObligation(billing_cycle_id=c2.id, subscription_id=s2.id, member_id=m2_jay.id, user_id=users["jay@splitsub.dev"].id, amount=53.70, due_date=in_7_days, status="paid", payment_reference=UPIService.generate_payment_reference(s2.id, m2_jay.id))
    ob2_rahul = PaymentObligation(billing_cycle_id=c2.id, subscription_id=s2.id, member_id=m2_rahul.id, user_id=users["rahul@splitsub.dev"].id, amount=35.80, due_date=in_7_days, status="pending", payment_reference=UPIService.generate_payment_reference(s2.id, m2_rahul.id))
    ob2_amit = PaymentObligation(billing_cycle_id=c2.id, subscription_id=s2.id, member_id=m2_amit.id, user_id=users["amit@splitsub.dev"].id, amount=35.80, due_date=in_7_days, status="paid", payment_reference=UPIService.generate_payment_reference(s2.id, m2_amit.id))
    ob2_priya = PaymentObligation(billing_cycle_id=c2.id, subscription_id=s2.id, member_id=m2_priya.id, user_id=users["priya@splitsub.dev"].id, amount=26.85, due_date=in_7_days, status="pending", payment_reference=UPIService.generate_payment_reference(s2.id, m2_priya.id))
    ob2_sneha = PaymentObligation(billing_cycle_id=c2.id, subscription_id=s2.id, member_id=m2_sneha.id, user_id=users["sneha@splitsub.dev"].id, amount=26.85, due_date=in_7_days, status="pending", payment_reference=UPIService.generate_payment_reference(s2.id, m2_sneha.id))
    db.add_all([ob2_jay, ob2_rahul, ob2_amit, ob2_priya, ob2_sneha])
    db.flush()

    t2_amit = Transaction(
        payment_obligation_id=ob2_amit.id,
        subscription_id=s2.id,
        payer_id=users["amit@splitsub.dev"].id,
        receiver_id=users["jay@splitsub.dev"].id,
        amount=35.80,
        payment_method="UPI",
        upi_vpa_payer="amit@paytm",
        upi_vpa_receiver="jay@okhdfcbank",
        upi_txn_id=UPIService.generate_upi_txn_ref(),
        status="successful",
        notes="Spotify Family percentage split"
    )
    db.add(t2_amit)

    settlement2 = Settlement(
        billing_cycle_id=c2.id,
        subscription_id=s2.id,
        payer_user_id=users["jay@splitsub.dev"].id,
        total_bill_amount=179.00,
        total_collected=89.50, # Jay + Amit
        total_pending=89.50,
        is_fully_settled=False
    )
    db.add(settlement2)

    # 4. Subscription 3: YouTube Premium Family (Usage-based Split, ₹189 / month, Owner: Rahul)
    s3 = Subscription(
        name="YouTube Premium Family",
        category="Entertainment",
        total_price=189.00,
        billing_frequency="monthly",
        next_billing_date=today + datetime.timedelta(days=12),
        owner_id=users["rahul@splitsub.dev"].id,
        status="active",
        description="Background play, ad-free and YouTube Music.",
        service_logo="youtube"
    )
    db.add(s3)
    db.flush()

    m3_rahul = SubscriptionMember(subscription_id=s3.id, user_id=users["rahul@splitsub.dev"].id, role="owner", status="active")
    m3_jay = SubscriptionMember(subscription_id=s3.id, user_id=users["jay@splitsub.dev"].id, role="member", status="active")
    m3_amit = SubscriptionMember(subscription_id=s3.id, user_id=users["amit@splitsub.dev"].id, role="member", status="active")
    m3_sneha = SubscriptionMember(subscription_id=s3.id, user_id=users["sneha@splitsub.dev"].id, role="member", status="active")
    db.add_all([m3_rahul, m3_jay, m3_amit, m3_sneha])
    db.flush()

    sr3 = SplitRule(subscription_id=s3.id, split_type="usage", rule_config={"shares": {
        str(users["rahul@splitsub.dev"].id): 2.0,
        str(users["jay@splitsub.dev"].id): 1.0,
        str(users["amit@splitsub.dev"].id): 1.0,
        str(users["sneha@splitsub.dev"].id): 1.0
    }})
    db.add(sr3)

    c3 = BillingCycle(
        subscription_id=s3.id,
        cycle_number=1,
        start_date=today - datetime.timedelta(days=18),
        due_date=today + datetime.timedelta(days=12),
        total_amount=189.00,
        status="pending",
        owner_paid_status="paid"
    )
    db.add(c3)
    db.flush()

    # Weights: 2, 1, 1, 1 (total 5) -> 40%, 20%, 20%, 20% -> 75.60, 37.80, 37.80, 37.80
    ob3_rahul = PaymentObligation(billing_cycle_id=c3.id, subscription_id=s3.id, member_id=m3_rahul.id, user_id=users["rahul@splitsub.dev"].id, amount=75.60, due_date=today + datetime.timedelta(days=12), status="paid", payment_reference=UPIService.generate_payment_reference(s3.id, m3_rahul.id))
    ob3_jay = PaymentObligation(billing_cycle_id=c3.id, subscription_id=s3.id, member_id=m3_jay.id, user_id=users["jay@splitsub.dev"].id, amount=37.80, due_date=today + datetime.timedelta(days=12), status="paid", payment_reference=UPIService.generate_payment_reference(s3.id, m3_jay.id))
    ob3_amit = PaymentObligation(billing_cycle_id=c3.id, subscription_id=s3.id, member_id=m3_amit.id, user_id=users["amit@splitsub.dev"].id, amount=37.80, due_date=today + datetime.timedelta(days=12), status="pending", payment_reference=UPIService.generate_payment_reference(s3.id, m3_amit.id))
    ob3_sneha = PaymentObligation(billing_cycle_id=c3.id, subscription_id=s3.id, member_id=m3_sneha.id, user_id=users["sneha@splitsub.dev"].id, amount=37.80, due_date=today + datetime.timedelta(days=12), status="pending", payment_reference=UPIService.generate_payment_reference(s3.id, m3_sneha.id))
    db.add_all([ob3_rahul, ob3_jay, ob3_amit, ob3_sneha])
    db.flush()

    t3_jay = Transaction(
        payment_obligation_id=ob3_jay.id,
        subscription_id=s3.id,
        payer_id=users["jay@splitsub.dev"].id,
        receiver_id=users["rahul@splitsub.dev"].id,
        amount=37.80,
        payment_method="UPI",
        upi_vpa_payer="jay@okhdfcbank",
        upi_vpa_receiver="rahul@okaxis",
        upi_txn_id=UPIService.generate_upi_txn_ref(),
        status="successful",
        notes="YouTube Premium usage share"
    )
    db.add(t3_jay)

    settlement3 = Settlement(
        billing_cycle_id=c3.id,
        subscription_id=s3.id,
        payer_user_id=users["rahul@splitsub.dev"].id,
        total_bill_amount=189.00,
        total_collected=113.40,
        total_pending=75.60,
        is_fully_settled=False
    )
    db.add(settlement3)

    # 5. Subscription 4: Google One 2TB Cloud Storage (Custom Split: Priya ₹250, Jay ₹200, Sneha ₹200 -> ₹650.00, Owner: Priya)
    s4 = Subscription(
        name="Google One 2TB",
        category="Cloud & Storage",
        total_price=650.00,
        billing_frequency="monthly",
        next_billing_date=today + datetime.timedelta(days=18),
        owner_id=users["priya@splitsub.dev"].id,
        status="active",
        description="Shared family cloud storage and Google Photos backup.",
        service_logo="google"
    )
    db.add(s4)
    db.flush()

    m4_priya = SubscriptionMember(subscription_id=s4.id, user_id=users["priya@splitsub.dev"].id, role="owner", status="active")
    m4_jay = SubscriptionMember(subscription_id=s4.id, user_id=users["jay@splitsub.dev"].id, role="member", status="active")
    m4_sneha = SubscriptionMember(subscription_id=s4.id, user_id=users["sneha@splitsub.dev"].id, role="member", status="active")
    db.add_all([m4_priya, m4_jay, m4_sneha])
    db.flush()

    sr4 = SplitRule(subscription_id=s4.id, split_type="custom", rule_config={"shares": {
        str(users["priya@splitsub.dev"].id): 250.0,
        str(users["jay@splitsub.dev"].id): 200.0,
        str(users["sneha@splitsub.dev"].id): 200.0
    }})
    db.add(sr4)

    c4 = BillingCycle(
        subscription_id=s4.id,
        cycle_number=1,
        start_date=today - datetime.timedelta(days=12),
        due_date=today + datetime.timedelta(days=18),
        total_amount=650.00,
        status="pending",
        owner_paid_status="paid"
    )
    db.add(c4)
    db.flush()

    ob4_priya = PaymentObligation(billing_cycle_id=c4.id, subscription_id=s4.id, member_id=m4_priya.id, user_id=users["priya@splitsub.dev"].id, amount=250.00, due_date=today + datetime.timedelta(days=18), status="paid", payment_reference=UPIService.generate_payment_reference(s4.id, m4_priya.id))
    ob4_jay = PaymentObligation(billing_cycle_id=c4.id, subscription_id=s4.id, member_id=m4_jay.id, user_id=users["jay@splitsub.dev"].id, amount=200.00, due_date=today + datetime.timedelta(days=18), status="pending", payment_reference=UPIService.generate_payment_reference(s4.id, m4_jay.id))
    ob4_sneha = PaymentObligation(billing_cycle_id=c4.id, subscription_id=s4.id, member_id=m4_sneha.id, user_id=users["sneha@splitsub.dev"].id, amount=200.00, due_date=today + datetime.timedelta(days=18), status="paid", payment_reference=UPIService.generate_payment_reference(s4.id, m4_sneha.id))
    db.add_all([ob4_priya, ob4_jay, ob4_sneha])
    db.flush()

    t4_sneha = Transaction(
        payment_obligation_id=ob4_sneha.id,
        subscription_id=s4.id,
        payer_id=users["sneha@splitsub.dev"].id,
        receiver_id=users["priya@splitsub.dev"].id,
        amount=200.00,
        payment_method="UPI",
        upi_vpa_payer="sneha@ybl",
        upi_vpa_receiver="priya@ibl",
        upi_txn_id=UPIService.generate_upi_txn_ref(),
        status="successful",
        notes="Google One cloud storage custom split"
    )
    db.add(t4_sneha)

    settlement4 = Settlement(
        billing_cycle_id=c4.id,
        subscription_id=s4.id,
        payer_user_id=users["priya@splitsub.dev"].id,
        total_bill_amount=650.00,
        total_collected=450.00,
        total_pending=200.00,
        is_fully_settled=False
    )
    db.add(settlement4)

    # 6. Seed In-App Notifications for Jay
    notifications_jay = [
        Notification(user_id=users["jay@splitsub.dev"].id, title="Payment Overdue", message="Amit Patel has an overdue contribution of ₹162.25 for Netflix Premium 4K.", type="reminder", related_id=ob1_amit.id, is_read=False),
        Notification(user_id=users["jay@splitsub.dev"].id, title="Contribution Received", message="Rahul Verma paid ₹162.25 for Netflix Premium 4K via UPI.", type="payment_success", related_id=ob1_rahul.id, is_read=True),
        Notification(user_id=users["jay@splitsub.dev"].id, title="Payment Due in 5 Days", message="Spotify Family contribution cycle due on 5 Oct. 3 members haven't paid yet.", type="reminder", related_id=s2.id, is_read=False),
        Notification(user_id=users["jay@splitsub.dev"].id, title="Upcoming Cloud Due", message="You owe ₹200.00 to Priya Singh for Google One 2TB.", type="reminder", related_id=ob4_jay.id, is_read=False),
    ]
    db.add_all(notifications_jay)

    db.commit()
    print("Seeding completed successfully with 5 users, 4 subscriptions, and active cycles.")

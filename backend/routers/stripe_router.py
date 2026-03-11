"""
Stripe billing: checkout session + webhook
"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserPlan
from auth import require_auth
from datetime import datetime

router = APIRouter(prefix="/billing", tags=["Billing"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ryuji-eight.vercel.app")


@router.post("/checkout")
async def create_checkout(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    if current_user.is_pro and current_user.plan == UserPlan.PRO:
        raise HTTPException(status_code=400, detail="Already subscribed")

    try:
        # Create or retrieve Stripe customer
        if not current_user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.username,
                metadata={"user_id": current_user.id},
            )
            current_user.stripe_customer_id = customer.id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=current_user.stripe_customer_id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
            success_url=f"{FRONTEND_URL}/?upgrade=success",
            cancel_url=f"{FRONTEND_URL}/pricing?upgrade=cancelled",
            metadata={"user_id": current_user.id},
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portal")
async def customer_portal(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    try:
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/",
        )
        return {"url": session.url}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = event["data"]["object"]

    if event["type"] == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.plan = UserPlan.PRO
                user.stripe_subscription_id = data.get("subscription")
                user.plan_expires_at = None  # managed by subscription
                db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub_id = data.get("id")
        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if user:
            user.plan = UserPlan.FREE
            user.stripe_subscription_id = None
            user.plan_expires_at = None
            db.commit()

    elif event["type"] == "invoice.payment_failed":
        sub_id = data.get("subscription")
        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if user:
            user.plan = UserPlan.FREE
            db.commit()

    return {"received": True}

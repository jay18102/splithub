from fastapi import APIRouter
from app.schemas.schemas import SplitPreviewRequest, SplitPreviewResponse
from app.services.split_engine import SplitEngine

router = APIRouter(prefix="/splits", tags=["Cost Splitting"])

@router.post("/preview", response_model=SplitPreviewResponse)
def preview_split(req: SplitPreviewRequest):
    """
    Calculate and preview exact split breakdown for a set of members.
    Supports:
    - 'equal': ₹599 / 5 = ₹119.80 each with exact remainder distribution.
    - 'percentage': Validates 100% total, allocates exact paise.
    - 'custom': Strict equality validation.
    - 'usage': Proportional allocation based on usage weight.
    """
    return SplitEngine.calculate_split(
        total_price=req.total_price,
        split_type=req.split_type,
        members=req.members
    )

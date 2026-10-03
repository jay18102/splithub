from typing import List, Dict, Any, Tuple
from app.schemas.schemas import SplitMemberInput, SplitAllocation, SplitPreviewResponse

class SplitEngine:
    @staticmethod
    def calculate_split(
        total_price: float,
        split_type: str,
        members: List[SplitMemberInput]
    ) -> SplitPreviewResponse:
        if total_price <= 0:
            return SplitPreviewResponse(
                total_price=total_price,
                split_type=split_type,
                allocations=[],
                is_valid=False,
                error_message="Total price must be greater than zero."
            )

        if not members:
            return SplitPreviewResponse(
                total_price=total_price,
                split_type=split_type,
                allocations=[],
                is_valid=False,
                error_message="At least one member is required to split costs."
            )

        total_paise = int(round(total_price * 100))
        n = len(members)

        try:
            if split_type == "equal":
                allocations = SplitEngine._calculate_equal(total_paise, members)
            elif split_type == "percentage":
                allocations = SplitEngine._calculate_percentage(total_paise, members)
            elif split_type == "custom":
                allocations = SplitEngine._calculate_custom(total_paise, members)
            elif split_type == "usage":
                allocations = SplitEngine._calculate_usage(total_paise, members)
            else:
                return SplitPreviewResponse(
                    total_price=total_price,
                    split_type=split_type,
                    allocations=[],
                    is_valid=False,
                    error_message=f"Unsupported split type: {split_type}"
                )

            # Verification invariant: sum of amounts must match total_price exactly
            sum_allocated_paise = sum(int(round(a.amount * 100)) for a in allocations)
            if sum_allocated_paise != total_paise:
                diff = total_paise - sum_allocated_paise
                # Apply residual paise to first allocation
                allocations[0].amount = round((int(round(allocations[0].amount * 100)) + diff) / 100.0, 2)
                allocations[0].percentage = round((allocations[0].amount / total_price) * 100, 2)

            return SplitPreviewResponse(
                total_price=total_price,
                split_type=split_type,
                allocations=allocations,
                is_valid=True
            )
        except ValueError as ve:
            return SplitPreviewResponse(
                total_price=total_price,
                split_type=split_type,
                allocations=[],
                is_valid=False,
                error_message=str(ve)
            )

    @staticmethod
    def _calculate_equal(total_paise: int, members: List[SplitMemberInput]) -> List[SplitAllocation]:
        n = len(members)
        base_paise = total_paise // n
        remainder_paise = total_paise % n

        allocations = []
        for i, m in enumerate(members):
            member_paise = base_paise + (1 if i < remainder_paise else 0)
            amount = round(member_paise / 100.0, 2)
            pct = round((member_paise / total_paise) * 100.0, 2)
            allocations.append(SplitAllocation(
                user_id=m.user_id,
                email=m.email,
                name=m.name or f"Member {i+1}",
                amount=amount,
                percentage=pct,
                share_description=f"Equal share (1/{n})"
            ))
        return allocations

    @staticmethod
    def _calculate_percentage(total_paise: int, members: List[SplitMemberInput]) -> List[SplitAllocation]:
        # Validate percentages
        pct_sum = sum(m.value or 0.0 for m in members)
        if abs(pct_sum - 100.0) > 0.01:
            raise ValueError(f"Percentages must sum to 100%. Current total: {pct_sum:.2f}%")

        for m in members:
            if (m.value or 0.0) < 0:
                raise ValueError("Contribution percentage cannot be negative.")

        raw_paise_list = [(m.value or 0.0) * total_paise / 100.0 for m in members]
        int_paise_list = [int(p) for p in raw_paise_list]
        fractions = [raw - ip for raw, ip in zip(raw_paise_list, int_paise_list)]
        
        diff = total_paise - sum(int_paise_list)
        # Distribute remaining paise according to largest fractions
        indexed_fractions = sorted(list(enumerate(fractions)), key=lambda x: x[1], reverse=True)
        for idx, _ in indexed_fractions[:diff]:
            int_paise_list[idx] += 1

        allocations = []
        for i, m in enumerate(members):
            amount = round(int_paise_list[i] / 100.0, 2)
            allocations.append(SplitAllocation(
                user_id=m.user_id,
                email=m.email,
                name=m.name or f"Member {i+1}",
                amount=amount,
                percentage=round(m.value or 0.0, 2),
                share_description=f"{m.value:.1f}% share"
            ))
        return allocations

    @staticmethod
    def _calculate_custom(total_paise: int, members: List[SplitMemberInput]) -> List[SplitAllocation]:
        custom_paise_list = []
        for m in members:
            val = m.value or 0.0
            if val < 0:
                raise ValueError("Custom contribution amount cannot be negative.")
            custom_paise_list.append(int(round(val * 100)))

        sum_custom = sum(custom_paise_list)
        if abs(sum_custom - total_paise) > 5:  # Tolerance of 5 paise
            entered_total = sum_custom / 100.0
            expected_total = total_paise / 100.0
            raise ValueError(f"Custom amounts (₹{entered_total:.2f}) must match total subscription price (₹{expected_total:.2f}).")

        # Adjust tiny difference (1-2 paise) into the first member
        if sum_custom != total_paise:
            diff = total_paise - sum_custom
            custom_paise_list[0] += diff

        allocations = []
        for i, m in enumerate(members):
            amount = round(custom_paise_list[i] / 100.0, 2)
            pct = round((custom_paise_list[i] / total_paise) * 100.0, 2)
            allocations.append(SplitAllocation(
                user_id=m.user_id,
                email=m.email,
                name=m.name or f"Member {i+1}",
                amount=amount,
                percentage=pct,
                share_description=f"Fixed amount: ₹{amount:.2f}"
            ))
        return allocations

    @staticmethod
    def _calculate_usage(total_paise: int, members: List[SplitMemberInput]) -> List[SplitAllocation]:
        weights = [max(0.1, m.value or 1.0) for m in members]
        total_weight = sum(weights)
        if total_weight <= 0:
            raise ValueError("Total usage weight must be greater than zero.")

        # Convert weights to percentage shares
        pcts = [(w / total_weight) * 100.0 for w in weights]
        
        # Round percentages nicely to 2 decimals, ensuring sum = 100
        int_pcts = [round(p, 2) for p in pcts]
        pct_diff = 100.0 - sum(int_pcts)
        int_pcts[0] = round(int_pcts[0] + pct_diff, 2)

        # Temporary input with computed percentages
        temp_members = [
            SplitMemberInput(
                user_id=m.user_id,
                email=m.email,
                name=m.name,
                role=m.role,
                value=int_pcts[i]
            ) for i, m in enumerate(members)
        ]
        allocations = SplitEngine._calculate_percentage(total_paise, temp_members)
        for i, a in enumerate(allocations):
            a.share_description = f"Usage factor {weights[i]} ({a.percentage:.1f}%)"
        return allocations

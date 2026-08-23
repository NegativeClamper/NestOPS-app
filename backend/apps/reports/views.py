from datetime import date
from decimal import Decimal

from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.accounts.permissions import IsOwnerOrStaff
from apps.rooms.models import Bed
from apps.residents.models import Resident
from apps.fees.models import Payment
from apps.fees.utils import compute_all_dues
from apps.expenses.models import Expense


class DashboardView(APIView):
    """
    GET /api/reports/dashboard/ — single endpoint for the owner's home screen.
    Returns occupancy, revenue, expenses, P&L trend, and pending dues.
    """
    permission_classes = [IsOwnerOrStaff]

    def get(self, request):
        today = date.today()
        current_month = today.replace(day=1)

        # ── Occupancy ────────────────────────────────────────────────────────
        total_beds = Bed.objects.count()
        occupied_beds = Bed.objects.filter(status=Bed.Status.OCCUPIED).count()
        vacant_beds = total_beds - occupied_beds

        vacant_bed_list = (
            Bed.objects.filter(status=Bed.Status.VACANT)
            .select_related("room", "room__sharing_type")
            .values("id", "bed_label", "room__room_number", "room__sharing_type__name")
        )

        # ── Monthly Revenue (current month) ──────────────────────────────────
        monthly_revenue = Payment.objects.filter(
            date_paid__year=today.year,
            date_paid__month=today.month,
        ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

        # ── Monthly Expenses (current month) ─────────────────────────────────
        monthly_expense_qs = Expense.objects.filter(
            date__year=today.year,
            date__month=today.month,
        ).select_related("category")
        monthly_expenses_total = monthly_expense_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        expenses_by_category = {}
        for exp in monthly_expense_qs:
            key = exp.category.name
            expenses_by_category[key] = expenses_by_category.get(key, Decimal("0")) + exp.amount

        # ── P&L Trend (last 12 months) ───────────────────────────────────────
        pl_trend = []
        for i in range(11, -1, -1):
            # Go back i months
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            rev = Payment.objects.filter(
                date_paid__year=y, date_paid__month=m
            ).aggregate(t=Sum("amount"))["t"] or Decimal("0")
            exp = Expense.objects.filter(
                date__year=y, date__month=m
            ).aggregate(t=Sum("amount"))["t"] or Decimal("0")
            pl_trend.append({
                "month": f"{y}-{m:02d}",
                "month_label": date(y, m, 1).strftime("%b %y"),
                "revenue": float(rev),
                "expenses": float(exp),
                "net": float(rev - exp),
            })

        # ── Pending Dues ─────────────────────────────────────────────────────
        all_dues = compute_all_dues(today)
        total_outstanding = sum(d["total_balance"] for d in all_dues)

        # Simplified dues list for dashboard (just top-level, not per-month breakdown)
        dues_summary = [
            {
                "resident_id": d["resident_id"],
                "resident_name": d["resident_name"],
                "room_number": d["room_number"],
                "total_balance": float(d["total_balance"]),
                "overdue_months_count": d["overdue_months_count"],
            }
            for d in all_dues
        ]

        return Response({
            "occupancy": {
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "vacant_beds": vacant_beds,
                "occupancy_pct": round((occupied_beds / total_beds * 100) if total_beds else 0, 1),
            },
            "vacant_bed_list": [
                {
                    "bed_id": b["id"],
                    "bed_label": b["bed_label"],
                    "room_number": b["room__room_number"],
                    "sharing_type": b["room__sharing_type__name"],
                }
                for b in vacant_bed_list
            ],
            "monthly_revenue": float(monthly_revenue),
            "monthly_expenses": {
                "total": float(monthly_expenses_total),
                "by_category": {k: float(v) for k, v in expenses_by_category.items()},
            },
            "net_pl": float(monthly_revenue - monthly_expenses_total),
            "pl_trend": pl_trend,
            "pending_dues": {
                "total_outstanding": float(total_outstanding),
                "residents_count": len(dues_summary),
                "residents": dues_summary,
            },
        })

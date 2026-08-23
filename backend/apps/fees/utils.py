"""
Due calculation logic for HostelHQ.

Strategy:
- For each active resident, generate a due entry for every calendar month
  from their check_in_date to today.
- A month is "due" if the resident was active for any portion of it.
- Amount due = resident's sharing_type monthly_rate for that period.
- Amount paid = sum of payments recorded for that resident + period_month.
- Balance = amount_due - amount_paid (positive = still owed, 0 or negative = cleared).
"""
from datetime import date, timedelta
from decimal import Decimal
from collections import defaultdict

from apps.residents.models import Resident
from .models import Payment


def get_period_months(start_date: date, end_date: date) -> list[date]:
    """
    Returns a list of dates representing the 1st of each calendar month
    between start_date and end_date (inclusive of partial months).
    """
    months = []
    current = start_date.replace(day=1)
    end = end_date.replace(day=1)
    while current <= end:
        months.append(current)
        # Advance to next month
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)
    return months


def compute_dues_for_resident(resident: Resident, today: date = None) -> list[dict]:
    """
    Returns a list of due entries for a single resident.
    Each entry represents one billing month.
    """
    if today is None:
        today = date.today()

    if not resident.bed or not resident.bed.room.sharing_type:
        return []

    monthly_rate = resident.bed.room.sharing_type.monthly_rate
    end_date = resident.check_out_date or today

    months = get_period_months(resident.check_in_date, end_date)

    # Aggregate payments by period_month for this resident
    payments = Payment.objects.filter(resident=resident)
    paid_by_month: dict[date, Decimal] = defaultdict(Decimal)
    for payment in payments:
        paid_by_month[payment.period_month] += payment.amount

    dues = []
    for month in months:
        amount_due = monthly_rate
        amount_paid = paid_by_month.get(month, Decimal("0"))
        balance = amount_due - amount_paid
        dues.append({
            "period_month": month,
            "period_label": month.strftime("%B %Y"),
            "amount_due": amount_due,
            "amount_paid": amount_paid,
            "balance": balance,
            "is_overdue": balance > 0 and month < today.replace(day=1),
            "is_current_month": month == today.replace(day=1),
        })

    return dues


def compute_all_dues(today: date = None) -> list[dict]:
    """
    Returns due summaries for ALL active residents with outstanding balances.
    Sorted by total overdue amount descending.
    """
    if today is None:
        today = date.today()

    active_residents = Resident.objects.filter(
        status=Resident.Status.ACTIVE
    ).select_related("bed", "bed__room", "bed__room__sharing_type")

    result = []
    for resident in active_residents:
        dues = compute_dues_for_resident(resident, today)
        total_due = sum(d["amount_due"] for d in dues)
        total_paid = sum(d["amount_paid"] for d in dues)
        total_balance = total_due - total_paid
        overdue_months = [d for d in dues if d["is_overdue"]]

        if total_balance > 0:
            result.append({
                "resident_id": resident.id,
                "resident_name": resident.name,
                "resident_phone": resident.phone,
                "room_number": resident.room_number,
                "total_balance": total_balance,
                "overdue_months_count": len(overdue_months),
                "months": dues,
            })

    result.sort(key=lambda x: x["overdue_months_count"], reverse=True)
    return result

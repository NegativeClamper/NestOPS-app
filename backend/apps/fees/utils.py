"""
Due calculation logic for HostelHQ.

Strategy (v2 — join-date-anchored cycles)
------------------------------------------
Each resident's billing cycle is anchored to the day-of-month of their
check_in_date (= join_date).

Example: resident joined 2025-08-12
  Cycle 1:  2025-08-12  →  2025-09-11  (due 2025-09-12)
  Cycle 2:  2025-09-12  →  2025-10-11  (due 2025-10-12)
  ...

If join_day is 31 and a given month only has 28 days, the due date for
that cycle falls back to the 28th.  The *next* cycle resumes at the
original day if it exists.

The canonical cycle identifier stored on Payment.period_month is the
first day of the cycle (e.g. 2025-08-12 for the August cycle above) —
NOT the 1st of the calendar month.  This avoids any ambiguity when
checking whether a payment covers a given cycle.

Public API
----------
  cycle_start_for(join_date, n)          -> date  (nth cycle start, 0-indexed)
  cycle_due_date_for(join_date, n)       -> date  (nth cycle due date)
  cycles_up_to_today(join_date, today)   -> list of (cycle_start, due_date)
  current_cycle(join_date, today)        -> (cycle_start, due_date)
  compute_dues_for_resident(resident)    -> list[dict]
  compute_all_dues()                     -> list[dict]
"""
from datetime import date
from decimal import Decimal
from collections import defaultdict
import calendar

from apps.residents.models import Resident
from .models import Payment


# ─── Core cycle math ──────────────────────────────────────────────────────────

def _clamp_day(year: int, month: int, day: int) -> date:
    """
    Return date(year, month, day), clamping day to the last day of that month
    if it exceeds the month's length (e.g. day=31 in February → Feb 28/29).
    """
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, max_day))


def _add_months(d: date, n: int) -> date:
    """
    Add n months to date d, clamping to the last day of the target month.
    The original day-of-month is preserved conceptually (anchored to join_day).
    """
    month = d.month - 1 + n
    year  = d.year + month // 12
    month = month % 12 + 1
    return _clamp_day(year, month, d.day)


def cycle_start_for(join_date: date, n: int) -> date:
    """
    Return the start date of the nth cycle (0-indexed).
    cycle 0 starts on join_date itself.
    cycle 1 starts exactly one month later (clamped), etc.
    """
    if n == 0:
        return join_date
    return _add_months(join_date, n)


def cycle_due_date_for(join_date: date, n: int) -> date:
    """
    The due date for cycle n is the start of cycle n+1
    (i.e. payment is due on the day the *next* cycle starts).
    """
    return cycle_start_for(join_date, n + 1)


def cycles_up_to_today(join_date: date, today: date) -> list[tuple[date, date]]:
    """
    Return a list of (cycle_start, due_date) tuples for every cycle that has
    started on or before `today`, beginning from join_date.
    """
    cycles = []
    n = 0
    while True:
        start = cycle_start_for(join_date, n)
        if start > today:
            break
        due = cycle_due_date_for(join_date, n)
        cycles.append((start, due))
        n += 1
    return cycles


def current_cycle(join_date: date, today: date = None) -> tuple[date, date]:
    """
    Return (cycle_start, due_date) for the cycle that contains `today`.
    If today is exactly a cycle start, that cycle is the current one.
    """
    if today is None:
        today = date.today()

    # Walk forward until the next cycle would start after today
    n = 0
    while True:
        start = cycle_start_for(join_date, n)
        due   = cycle_due_date_for(join_date, n)
        if due > today:
            # `today` falls inside this cycle
            return (start, due)
        n += 1


# ─── Resident-level status ────────────────────────────────────────────────────

def cycle_status_for_resident(resident: Resident, today: date = None) -> dict | None:
    """
    Returns a dict describing the resident's current billing cycle:
      {
        "cycle_start":    date,   # first day of the current cycle
        "cycle_due_date": date,   # day payment is due (= start of next cycle)
        "amount_due":     Decimal,
        "amount_paid":    Decimal,  # total paid for this cycle
        "balance":        Decimal,  # positive = still owed
        "is_paid":        bool,
        "is_overdue":     bool,   # due date has passed and balance > 0
      }

    Returns None if the resident doesn't have enough information to compute
    (no join_date, no monthly_rate source).
    """
    if today is None:
        today = date.today()

    join_date = resident.check_in_date
    if not join_date:
        return None

    # Determine monthly rate: prefer hostel.monthly_rate, fall back to
    # bed.room.sharing_type.monthly_rate (legacy), then None.
    monthly_rate = None
    if resident.hostel_id:
        monthly_rate = resident.hostel.monthly_rate
    elif resident.bed and resident.bed.room.sharing_type:
        monthly_rate = resident.bed.room.sharing_type.monthly_rate

    if monthly_rate is None:
        return None

    cycle_start, due_date = current_cycle(join_date, today)

    # Sum payments whose period_month matches this cycle's start date
    paid_total = Payment.objects.filter(
        resident=resident,
        period_month=cycle_start,
    ).aggregate(total=models_Sum("amount"))["total"] or Decimal("0")

    balance = monthly_rate - paid_total

    return {
        "cycle_start":    cycle_start,
        "cycle_due_date": due_date,
        "amount_due":     monthly_rate,
        "amount_paid":    paid_total,
        "balance":        balance,
        "is_paid":        balance <= 0,
        "is_overdue":     today >= due_date and balance > 0,
    }


# ─── Full dues computation (all cycles) ──────────────────────────────────────

def compute_dues_for_resident(resident: Resident, today: date = None) -> list[dict]:
    """
    Returns a list of due entries for every cycle since join_date up to today.
    Each entry represents one billing cycle.

    This replaces the old calendar-month-based version.
    """
    if today is None:
        today = date.today()

    join_date = resident.check_in_date
    if not join_date:
        return []

    # Monthly rate: hostel takes priority over legacy bed rate
    monthly_rate = None
    if resident.hostel_id:
        monthly_rate = resident.hostel.monthly_rate
    elif resident.bed and resident.bed.room.sharing_type:
        monthly_rate = resident.bed.room.sharing_type.monthly_rate

    if monthly_rate is None:
        return []

    end_date = resident.check_out_date or today

    # All cycles from join_date up to end_date
    all_cycles = cycles_up_to_today(join_date, end_date)

    # Aggregate payments by period_month (= cycle_start) for this resident
    payments = Payment.objects.filter(resident=resident)
    paid_by_cycle: dict[date, Decimal] = defaultdict(Decimal)
    for p in payments:
        paid_by_cycle[p.period_month] += p.amount

    dues = []
    for (cycle_start, due_date) in all_cycles:
        amount_paid = paid_by_cycle.get(cycle_start, Decimal("0"))
        balance     = monthly_rate - amount_paid
        is_current  = cycle_start == current_cycle(join_date, today)[0]
        dues.append({
            "period_month":    cycle_start,          # canonical cycle key
            "period_label":    cycle_start.strftime("%d %b %Y") + " cycle",
            "cycle_due_date":  due_date,
            "amount_due":      monthly_rate,
            "amount_paid":     amount_paid,
            "balance":         balance,
            "is_overdue":      balance > 0 and today >= due_date,
            "is_current_month": is_current,
        })

    return dues


def compute_all_dues(today: date = None) -> list[dict]:
    """
    Returns due summaries for ALL active residents with outstanding balances.
    Sorted by overdue cycle count descending.
    """
    if today is None:
        today = date.today()

    active_residents = Resident.objects.filter(
        status=Resident.Status.ACTIVE
    ).select_related("bed", "bed__room", "bed__room__sharing_type", "hostel")

    result = []
    for resident in active_residents:
        dues = compute_dues_for_resident(resident, today)
        if not dues:
            continue

        total_balance  = sum(d["balance"] for d in dues)
        overdue_cycles = [d for d in dues if d["is_overdue"]]

        if total_balance > 0:
            result.append({
                "resident_id":         resident.id,
                "resident_name":       resident.name,
                "resident_phone":      resident.phone,
                "room_number":         resident.room_number,
                "total_balance":       total_balance,
                "overdue_months_count": len(overdue_cycles),
                "months":              dues,
            })

    result.sort(key=lambda x: x["overdue_months_count"], reverse=True)
    return result


# ─── Lazy import to avoid circular deps ──────────────────────────────────────
# Django's aggregation import done here to keep module-level imports clean.
from django.db.models import Sum as models_Sum  # noqa: E402

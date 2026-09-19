from django.db import models
from apps.rooms.models import Bed
from apps.hostels.models import Hostel


class Resident(models.Model):
    """
    Represents a hostel resident (student). One resident occupies one bed at a time.
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CHECKED_OUT = "checked_out", "Checked Out"

    # Personal info
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    parent_name = models.CharField(max_length=200, blank=True)
    parent_phone = models.CharField(max_length=15, blank=True)
    id_proof = models.FileField(upload_to="id_proofs/", blank=True, null=True)

    # Room assignment (optional)
    bed = models.OneToOneField(
        Bed,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resident",
    )

    # Hostel assignment
    hostel = models.ForeignKey(
        Hostel,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="residents",
    )

    # Stay dates
    check_in_date = models.DateField()
    check_out_date = models.DateField(null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.ACTIVE
    )

    notes = models.TextField(blank=True)

    # Fee discount (e.g. referral concession)
    discount = models.DecimalField(
        max_digits=7, decimal_places=2, default=0,
        help_text="Discount deducted from the hostel's base rate for this resident.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Resident"
        verbose_name_plural = "Residents"

    def __str__(self):
        room = self.bed.room.room_number if self.bed else "No Room"
        return f"{self.name} — Room {room} ({self.get_status_display()})"

    @property
    def room_number(self):
        return self.bed.room.room_number if self.bed else None

    @property
    def sharing_type(self):
        return self.bed.room.sharing_type if self.bed else None

    @property
    def monthly_fee(self):
        """
        The resident's effective monthly rate after discount.
        Returns hostel.monthly_rate - discount (floored at 0).
        Falls back to bed/sharing_type rate if no hostel is set.
        """
        if self.hostel_id:
            base = self.hostel.monthly_rate
            return max(base - self.discount, 0)
        if self.bed and self.bed.room.sharing_type:
            return max(self.bed.room.sharing_type.monthly_rate - self.discount, 0)
        return None

    @property
    def base_rate(self):
        """The hostel's standard monthly rate before any discount."""
        if self.hostel_id:
            return self.hostel.monthly_rate
        if self.bed and self.bed.room.sharing_type:
            return self.bed.room.sharing_type.monthly_rate
        return None

    def current_cycle_status(self, today=None) -> dict | None:
        """
        Returns the resident's current billing cycle status:
          {
            "cycle_start":    date,     # first day of the active cycle
            "cycle_due_date": date,     # day payment is due (= start of next cycle)
            "amount_due":     Decimal,
            "amount_paid":    Decimal,
            "balance":        Decimal,
            "is_paid":        bool,
            "is_overdue":     bool,     # due date has passed and balance > 0
          }

        Returns None if the rate cannot be determined (no hostel, no bed rate).

        Uses a lazy import from fees.utils to avoid a circular import
        (fees.utils imports Resident, so Resident cannot import fees.utils at
        module level).
        """
        from apps.fees.utils import cycle_status_for_resident  # lazy / circular-safe
        return cycle_status_for_resident(self, today)

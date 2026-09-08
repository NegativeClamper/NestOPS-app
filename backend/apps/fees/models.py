from django.db import models
from apps.residents.models import Resident
from apps.hostels.models import Hostel


class Payment(models.Model):
    """A single fee payment made by a resident."""

    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        UPI = "upi", "UPI"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        CHEQUE = "cheque", "Cheque"

    resident = models.ForeignKey(
        Resident, on_delete=models.PROTECT, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_paid = models.DateField()
    payment_method = models.CharField(max_length=15, choices=Method.choices, default=Method.CASH)
    # period_month is the first day of the billing month, e.g. 2025-08-01 = August 2025
    period_month = models.DateField(
        help_text="The month this payment covers. Always set to the 1st of that month."
    )
    notes = models.TextField(blank=True)
    # Intake-submitted payment proof
    transaction_id = models.CharField(max_length=100, blank=True, default="")
    transaction_screenshot = models.ImageField(
        upload_to="transaction_screenshots/", blank=True, null=True
    )
    # verified=True for payments recorded by staff; False for self-service intake submissions
    verified = models.BooleanField(
        default=True,
        help_text="False = submitted via intake form, awaiting owner review.",
    )
    # Denormalised from resident.hostel — set automatically on create, never by the user directly

    hostel = models.ForeignKey(
        Hostel,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_paid"]
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self):
        return (
            f"{self.resident.name} — ₹{self.amount} "
            f"({self.period_month.strftime('%b %Y')}) via {self.get_payment_method_display()}"
        )

from django.db import models
from apps.residents.models import Resident


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

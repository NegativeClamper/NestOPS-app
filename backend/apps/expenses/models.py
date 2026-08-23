from django.db import models


class ExpenseCategory(models.Model):
    """
    Extensible expense categories. Owner can create new ones from the app.
    Default categories: Food/Groceries, Maintenance, Utilities, Staff Salaries, Other.
    """

    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, blank=True, help_text="Emoji icon, e.g. 🍛")
    is_default = models.BooleanField(default=False, help_text="System default — not deletable by owner.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Expense Category"
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return f"{self.icon} {self.name}".strip()


class Expense(models.Model):
    """A single expense record."""

    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=500)
    receipt = models.FileField(upload_to="receipts/", blank=True, null=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_expenses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"

    def __str__(self):
        return f"{self.category.name} — ₹{self.amount} on {self.date}"

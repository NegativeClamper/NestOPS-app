from django.db import models


class Hostel(models.Model):
    """
    A physical hostel building. Residents, payments, and expenses
    are scoped to a hostel so the owner can track each building separately.
    """

    class Gender(models.TextChoices):
        BOYS = "boys", "Boys"
        GIRLS = "girls", "Girls"

    name = models.CharField(max_length=100, unique=True)
    gender = models.CharField(max_length=5, choices=Gender.choices)
    monthly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Default monthly rent charged for a bed in this hostel.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Hostel"
        verbose_name_plural = "Hostels"

    def __str__(self):
        return f"{self.name} ({self.get_gender_display()}) — ₹{self.monthly_rate}/mo"

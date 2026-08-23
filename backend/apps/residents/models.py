from django.db import models
from apps.rooms.models import Bed


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

    # Room assignment
    bed = models.OneToOneField(
        Bed,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resident",
    )

    # Stay dates
    check_in_date = models.DateField()
    check_out_date = models.DateField(null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.ACTIVE
    )

    notes = models.TextField(blank=True)

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
        if self.bed and self.bed.room.sharing_type:
            return self.bed.room.sharing_type.monthly_rate
        return None

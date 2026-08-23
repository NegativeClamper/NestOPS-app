from django.db import models


class SharingType(models.Model):
    """
    Fee tier based on how many residents share a room.
    E.g. Single (₹8000/mo), Double (₹6000/mo), Triple (₹5000/mo), Dorm (₹3500/mo).
    The owner can create/edit these at any time from the app's Settings screen.
    """

    name = models.CharField(max_length=50, unique=True)
    monthly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    max_occupants = models.PositiveIntegerField(
        help_text="Maximum number of residents that can share a room of this type."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["monthly_rate"]
        verbose_name = "Sharing Type"
        verbose_name_plural = "Sharing Types"

    def __str__(self):
        return f"{self.name} (₹{self.monthly_rate}/mo)"


class Room(models.Model):
    """A physical room in the hostel."""

    room_number = models.CharField(max_length=20, unique=True)
    sharing_type = models.ForeignKey(
        SharingType, on_delete=models.PROTECT, related_name="rooms"
    )
    floor = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["room_number"]
        verbose_name = "Room"
        verbose_name_plural = "Rooms"

    def __str__(self):
        return f"Room {self.room_number} ({self.sharing_type.name})"

    @property
    def total_beds(self):
        return self.beds.count()

    @property
    def vacant_beds(self):
        return self.beds.filter(status=Bed.Status.VACANT).count()

    @property
    def occupied_beds(self):
        return self.beds.filter(status=Bed.Status.OCCUPIED).count()


class Bed(models.Model):
    """An individual bed within a room."""

    class Status(models.TextChoices):
        VACANT = "vacant", "Vacant"
        OCCUPIED = "occupied", "Occupied"

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="beds")
    bed_label = models.CharField(
        max_length=10,
        help_text='Label for this bed, e.g. "A", "B", "1", "Top", "Bottom"',
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.VACANT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["room", "bed_label"]
        unique_together = [["room", "bed_label"]]
        verbose_name = "Bed"
        verbose_name_plural = "Beds"

    def __str__(self):
        return f"Room {self.room.room_number} — Bed {self.bed_label} ({self.status})"

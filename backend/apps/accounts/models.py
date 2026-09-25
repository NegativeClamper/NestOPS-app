from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model for HostelHQ.
    Extends AbstractUser with a role field for Owner/Staff distinction.
    """

    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        STAFF = "staff", "Staff"

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STAFF,
    )
    phone = models.CharField(max_length=15, blank=True)
    
    # For multi-tenancy: if role is staff, this points to their employer (the owner)
    owner_account = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="staff_members"
    )

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_owner(self):
        return self.role == self.Role.OWNER

    @property
    def is_staff_member(self):
        return self.role == self.Role.STAFF

    @property
    def tenant(self):
        """Returns the owner account this user belongs to, or self if they are the owner."""
        return self if self.is_owner else self.owner_account

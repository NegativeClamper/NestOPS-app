from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "get_full_name", "role", "phone", "is_active", "date_joined"]
    list_filter = ["role", "is_active"]
    search_fields = ["username", "first_name", "last_name", "phone"]
    fieldsets = UserAdmin.fieldsets + (
        ("HostelHQ", {"fields": ("role", "phone")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("HostelHQ", {"fields": ("role", "phone")}),
    )

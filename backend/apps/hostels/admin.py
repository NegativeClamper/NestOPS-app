from django.contrib import admin
from .models import Hostel


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ["name", "gender", "monthly_rate", "active_residents"]
    list_filter = ["gender"]
    search_fields = ["name"]
    ordering = ["name"]

    @admin.display(description="Active Residents")
    def active_residents(self, obj):
        return obj.residents.filter(status="active").count()

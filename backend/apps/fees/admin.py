from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "resident", "amount", "payment_method", "date_paid",
        "get_period", "recorded_by",
    ]
    list_filter = ["payment_method", "period_month"]
    search_fields = ["resident__name", "resident__bed__room__room_number"]
    raw_id_fields = ["resident", "recorded_by"]
    readonly_fields = ["created_at", "updated_at"]

    def get_period(self, obj):
        return obj.period_month.strftime("%b %Y")
    get_period.short_description = "Period"

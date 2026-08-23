from django.contrib import admin
from .models import Resident


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = [
        "name", "phone", "get_room", "status",
        "check_in_date", "check_out_date",
    ]
    list_filter = ["status", "bed__room__sharing_type"]
    search_fields = ["name", "phone", "bed__room__room_number"]
    raw_id_fields = ["bed"]
    readonly_fields = ["created_at", "updated_at"]

    def get_room(self, obj):
        return obj.room_number or "—"
    get_room.short_description = "Room"

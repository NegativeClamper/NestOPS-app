from django.contrib import admin
from .models import SharingType, Room, Bed


@admin.register(SharingType)
class SharingTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "monthly_rate", "max_occupants", "updated_at"]
    search_fields = ["name"]


class BedInline(admin.TabularInline):
    model = Bed
    extra = 1
    fields = ["bed_label", "status"]
    readonly_fields = ["status"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["room_number", "sharing_type", "floor", "get_total_beds", "get_vacant_beds"]
    list_filter = ["sharing_type", "floor"]
    search_fields = ["room_number"]
    inlines = [BedInline]

    def get_total_beds(self, obj):
        return obj.beds.count()
    get_total_beds.short_description = "Total Beds"

    def get_vacant_beds(self, obj):
        return obj.beds.filter(status=Bed.Status.VACANT).count()
    get_vacant_beds.short_description = "Vacant"


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ["__str__", "room", "status"]
    list_filter = ["status", "room__sharing_type"]
    search_fields = ["room__room_number", "bed_label"]
    raw_id_fields = ["room"]

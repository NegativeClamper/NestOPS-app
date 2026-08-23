from rest_framework import serializers
from .models import SharingType, Room, Bed


class SharingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharingType
        fields = ["id", "name", "monthly_rate", "max_occupants", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BedSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    sharing_type = serializers.CharField(source="room.sharing_type.name", read_only=True)
    # Populated when a resident is assigned — comes from apps.residents
    resident_name = serializers.SerializerMethodField()
    resident_id = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = [
            "id", "room", "room_number", "sharing_type",
            "bed_label", "status",
            "resident_id", "resident_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "status"]

    def get_resident_name(self, obj):
        resident = getattr(obj, "current_resident", None)
        if resident is None:
            try:
                resident = obj.resident
            except Exception:
                return None
        return resident.name if resident else None

    def get_resident_id(self, obj):
        resident = getattr(obj, "current_resident", None)
        if resident is None:
            try:
                resident = obj.resident
            except Exception:
                return None
        return resident.id if resident else None


class RoomSerializer(serializers.ModelSerializer):
    sharing_type_detail = SharingTypeSerializer(source="sharing_type", read_only=True)
    beds = BedSerializer(many=True, read_only=True)
    total_beds = serializers.IntegerField(read_only=True)
    vacant_beds = serializers.IntegerField(read_only=True)
    occupied_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            "id", "room_number", "sharing_type", "sharing_type_detail",
            "floor", "notes",
            "total_beds", "vacant_beds", "occupied_beds",
            "beds",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoomListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views — no nested beds."""
    sharing_type_name = serializers.CharField(source="sharing_type.name", read_only=True)
    monthly_rate = serializers.DecimalField(
        source="sharing_type.monthly_rate", max_digits=10, decimal_places=2, read_only=True
    )
    total_beds = serializers.IntegerField(read_only=True)
    vacant_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            "id", "room_number", "sharing_type", "sharing_type_name",
            "monthly_rate", "floor", "notes",
            "total_beds", "vacant_beds",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

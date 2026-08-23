from rest_framework import serializers
from apps.rooms.models import Bed
from .models import Resident


class ResidentListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    room_number = serializers.SerializerMethodField()
    sharing_type_name = serializers.SerializerMethodField()
    monthly_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Resident
        fields = [
            "id", "name", "phone", "parent_name", "parent_phone",
            "room_number", "sharing_type_name", "monthly_fee",
            "check_in_date", "check_out_date", "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_room_number(self, obj):
        return obj.room_number

    def get_sharing_type_name(self, obj):
        return obj.sharing_type.name if obj.sharing_type else None


class ResidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/edit views."""
    room_number = serializers.SerializerMethodField(read_only=True)
    sharing_type_name = serializers.SerializerMethodField(read_only=True)
    monthly_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    bed_label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Resident
        fields = [
            "id", "name", "phone", "parent_name", "parent_phone",
            "id_proof",
            "bed", "bed_label", "room_number", "sharing_type_name", "monthly_fee",
            "check_in_date", "check_out_date", "status",
            "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_room_number(self, obj):
        return obj.room_number

    def get_sharing_type_name(self, obj):
        return obj.sharing_type.name if obj.sharing_type else None

    def get_bed_label(self, obj):
        return obj.bed.bed_label if obj.bed else None

    def validate_bed(self, value):
        """Ensure the selected bed is vacant (unless editing same resident)."""
        if value is None:
            return value
        if value.status == "occupied":
            # Allow if it's occupied by the current resident (editing case)
            resident = getattr(self, "instance", None)
            if resident and resident.bed == value:
                return value
            raise serializers.ValidationError(
                f"Bed {value.bed_label} in Room {value.room.room_number} is already occupied."
            )
        return value

    def create(self, validated_data):
        bed = validated_data.get("bed")
        resident = super().create(validated_data)
        if bed:
            bed.status = "occupied"
            bed.save()
        return resident

    def update(self, instance, validated_data):
        old_bed = instance.bed
        new_bed = validated_data.get("bed", old_bed)
        resident = super().update(instance, validated_data)
        # If bed changed, update both old and new bed statuses
        if old_bed != new_bed:
            if old_bed:
                old_bed.status = "vacant"
                old_bed.save()
            if new_bed:
                new_bed.status = "occupied"
                new_bed.save()
        return resident


class CheckOutSerializer(serializers.Serializer):
    """Used to check out a resident — marks them as checked out and frees their bed."""
    check_out_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)

from rest_framework import serializers
from apps.rooms.models import Bed
from .models import Resident


# ─── Shared cycle status field ─────────────────────────────────────────────────

class CurrentCycleSerializer(serializers.Serializer):
    """
    Serializes the dict returned by resident.current_cycle_status().
    Embedded read-only in both list and detail resident responses so the mobile
    app never has to compute due-date math client-side.
    """
    cycle_start    = serializers.DateField(allow_null=True)
    cycle_due_date = serializers.DateField(allow_null=True)
    amount_due     = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    amount_paid    = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    balance        = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    is_paid        = serializers.BooleanField(allow_null=True)
    is_overdue     = serializers.BooleanField(allow_null=True)


# ─── List serializer (light — used in /api/residents/) ────────────────────────

class ResidentListSerializer(serializers.ModelSerializer):
    """
    Lighter serializer for list views.
    Includes current_cycle so the mobile app can show paid/overdue badges
    without a second API call per resident.
    """
    room_number      = serializers.SerializerMethodField()
    sharing_type_name = serializers.SerializerMethodField()
    monthly_fee      = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    hostel_name      = serializers.CharField(source="hostel.name", read_only=True, default=None)
    current_cycle    = serializers.SerializerMethodField()

    class Meta:
        model = Resident
        fields = [
            "id", "name", "phone", "parent_name", "parent_phone",
            "hostel", "hostel_name",
            "room_number", "sharing_type_name", "monthly_fee",
            "check_in_date", "check_out_date", "status",
            "current_cycle",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_room_number(self, obj):
        return obj.room_number

    def get_sharing_type_name(self, obj):
        return obj.sharing_type.name if obj.sharing_type else None

    def get_current_cycle(self, obj):
        """
        Calls the model method (which lazy-imports fees.utils) and returns
        a normalized dict — or a null-filled dict if no rate is available.
        """
        cycle = obj.current_cycle_status()
        if cycle is None:
            return {
                "cycle_start": None, "cycle_due_date": None,
                "amount_due": None, "amount_paid": None, "balance": None,
                "is_paid": None, "is_overdue": None,
            }
        # Serialize via the dedicated serializer for consistent field types
        return CurrentCycleSerializer(cycle).data


# ─── Detail serializer (full — used in retrieve/create/edit) ──────────────────

class ResidentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/edit views."""
    room_number       = serializers.SerializerMethodField(read_only=True)
    sharing_type_name = serializers.SerializerMethodField(read_only=True)
    monthly_fee       = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    bed_label         = serializers.SerializerMethodField(read_only=True)
    hostel_name       = serializers.CharField(source="hostel.name", read_only=True, default=None)
    current_cycle     = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Resident
        fields = [
            "id", "name", "phone", "parent_name", "parent_phone",
            "id_proof",
            "hostel", "hostel_name",
            "bed", "bed_label", "room_number", "sharing_type_name", "monthly_fee",
            "check_in_date", "check_out_date", "status",
            "current_cycle",
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

    def get_current_cycle(self, obj):
        cycle = obj.current_cycle_status()
        if cycle is None:
            return {
                "cycle_start": None, "cycle_due_date": None,
                "amount_due": None, "amount_paid": None, "balance": None,
                "is_paid": None, "is_overdue": None,
            }
        return CurrentCycleSerializer(cycle).data

    def validate_bed(self, value):
        """Ensure the selected bed is vacant (unless editing the same resident)."""
        if value is None:
            return value
        if value.status == "occupied":
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
        if old_bed != new_bed:
            if old_bed:
                old_bed.status = "vacant"
                old_bed.save()
            if new_bed:
                new_bed.status = "occupied"
                new_bed.save()
        return resident


# ─── Checkout serializer ───────────────────────────────────────────────────────

class CheckOutSerializer(serializers.Serializer):
    """Used to check out a resident — marks them as checked out and frees their bed."""
    check_out_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)

from datetime import date
from decimal import Decimal

from rest_framework import serializers
from apps.residents.models import Resident
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source="resident.name", read_only=True)
    room_number = serializers.SerializerMethodField(read_only=True)
    hostel_name = serializers.CharField(source="hostel.name", read_only=True, default=None)
    period_label = serializers.SerializerMethodField(read_only=True)
    recorded_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "resident", "resident_name", "room_number",
            "hostel", "hostel_name",
            "amount", "date_paid", "payment_method",
            "period_month", "period_label",
            "notes",
            "recorded_by", "recorded_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "hostel", "recorded_by", "created_at", "updated_at"]

    def get_room_number(self, obj):
        return obj.resident.room_number

    def get_period_label(self, obj):
        return obj.period_month.strftime("%B %Y")

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() if obj.recorded_by else None

    def validate_period_month(self, value):
        """Normalize period_month to the 1st of the month."""
        return value.replace(day=1)

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        # Auto-populate hostel from the resident — no user input needed
        resident = validated_data.get("resident")
        if resident and resident.hostel_id:
            validated_data["hostel"] = resident.hostel
        return super().create(validated_data)


class DueMonthSerializer(serializers.Serializer):
    period_month = serializers.DateField()
    period_label = serializers.CharField()
    amount_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_overdue = serializers.BooleanField()
    is_current_month = serializers.BooleanField()


class ResidentDueSummarySerializer(serializers.Serializer):
    resident_id = serializers.IntegerField()
    resident_name = serializers.CharField()
    resident_phone = serializers.CharField()
    room_number = serializers.CharField(allow_null=True)
    total_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    overdue_months_count = serializers.IntegerField()
    months = DueMonthSerializer(many=True)

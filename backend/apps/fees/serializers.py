from decimal import Decimal

from rest_framework import serializers

from apps.residents.models import Resident
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for recording and reading fee payments.

    On create, the client supplies:
      - resident      (int FK)
      - amount        (decimal)
      - date_paid     (date)
      - payment_method
      - notes         (optional)

    For which cycle this payment covers, the client has TWO options:

    Option A — explicit cycle_start (preferred):
      Send `period_month` as the exact cycle-start date returned by the
      /api/residents/{id}/dues/ or /api/residents/{id}/cycle_status/ endpoint.
      The server accepts it as-is (no day stripping).

    Option B — year+month hint:
      Send `cycle_year` (int) and `cycle_month` (int, 1-12).
      The server will compute the correct cycle-start date by finding which
      of the resident's cycles falls in that calendar month.
      This is convenient for UI where the user just picks "August 2025".

    If neither is provided, `period_month` defaults to the resident's
    *current* cycle start (i.e., paying for right now).

    hostel is auto-populated from resident.hostel — never send it manually.
    """

    resident_name   = serializers.CharField(source="resident.name", read_only=True)
    room_number     = serializers.SerializerMethodField(read_only=True)
    hostel_name     = serializers.CharField(source="hostel.name", read_only=True, default=None)
    period_label    = serializers.SerializerMethodField(read_only=True)
    recorded_by_name = serializers.SerializerMethodField(read_only=True)

    # Write-only convenience fields for Option B
    cycle_year  = serializers.IntegerField(write_only=True, required=False)
    cycle_month = serializers.IntegerField(write_only=True, required=False, min_value=1, max_value=12)

    class Meta:
        model = Payment
        fields = [
            "id",
            "resident", "resident_name", "room_number",
            "hostel", "hostel_name",
            "amount", "date_paid", "payment_method",
            "period_month", "period_label",
            "cycle_year", "cycle_month",      # write-only helpers
            "notes",
            "recorded_by", "recorded_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "hostel", "recorded_by", "created_at", "updated_at"]
        extra_kwargs = {
            "period_month": {"required": False},
        }

    def get_room_number(self, obj):
        return obj.resident.room_number

    def get_period_label(self, obj):
        # e.g. "12 Aug 2025 cycle"  — cross-platform day formatting
        if not obj.period_month:
            return ""
        day = str(obj.period_month.day)          # no leading zero, any OS
        return obj.period_month.strftime(f"{day} %b %Y cycle")

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.get_full_name() if obj.recorded_by else None

    def validate(self, attrs):
        """
        Derive period_month (cycle-start date) from:
          1. cycle_year + cycle_month  →  find matching cycle via util
          2. period_month given directly  →  use as-is (NO day stripping)
          3. Neither  →  default to current cycle start
        """
        from apps.fees.utils import current_cycle, cycle_start_for, cycles_up_to_today
        from datetime import date
        import calendar

        # Pop write-only helpers before saving
        cycle_year  = attrs.pop("cycle_year", None)
        cycle_month = attrs.pop("cycle_month", None)

        # Resolve the resident object (may be a PK at this point — it will
        # already be a model instance after DRF's FK validation)
        resident = attrs.get("resident")
        join_date = resident.check_in_date if resident else None

        if cycle_year and cycle_month and join_date:
            # Find the cycle whose start falls in (cycle_year, cycle_month)
            # Walk cycles until we find the one starting in the requested month
            n = 0
            matched = None
            # Limit search to a reasonable range (join_date → 5 years ahead)
            max_n = (cycle_year - join_date.year) * 12 + (cycle_month - join_date.month) + 3
            while n <= max(max_n, 0):
                from apps.fees.utils import cycle_start_for as _csf
                cs = _csf(join_date, n)
                if cs.year == cycle_year and cs.month == cycle_month:
                    matched = cs
                    break
                if (cs.year, cs.month) > (cycle_year, cycle_month):
                    break
                n += 1

            if matched is None:
                raise serializers.ValidationError({
                    "cycle_month": (
                        f"No billing cycle for {join_date.strftime('%d')}-anchored resident "
                        f"falls in {calendar.month_name[cycle_month]} {cycle_year}."
                    )
                })
            attrs["period_month"] = matched

        elif "period_month" not in attrs or attrs.get("period_month") is None:
            # Default: current cycle
            if join_date:
                cycle_start, _ = current_cycle(join_date, date.today())
                attrs["period_month"] = cycle_start
            # else: leave None — model validation will catch required field

        # period_month given explicitly → accept as-is (no day=1 stripping)

        return attrs

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        # Auto-populate hostel from resident — never sent by client
        resident = validated_data.get("resident")
        if resident and resident.hostel_id:
            validated_data["hostel"] = resident.hostel
        return super().create(validated_data)


# ─── Due / cycle serializers ──────────────────────────────────────────────────

class DueMonthSerializer(serializers.Serializer):
    period_month    = serializers.DateField()
    period_label    = serializers.CharField()
    cycle_due_date  = serializers.DateField()
    amount_due      = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_paid     = serializers.DecimalField(max_digits=10, decimal_places=2)
    balance         = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_overdue      = serializers.BooleanField()
    is_current_month = serializers.BooleanField()


class ResidentDueSummarySerializer(serializers.Serializer):
    resident_id          = serializers.IntegerField()
    resident_name        = serializers.CharField()
    resident_phone       = serializers.CharField()
    room_number          = serializers.CharField(allow_null=True)
    total_balance        = serializers.DecimalField(max_digits=10, decimal_places=2)
    overdue_months_count = serializers.IntegerField()
    months               = DueMonthSerializer(many=True)

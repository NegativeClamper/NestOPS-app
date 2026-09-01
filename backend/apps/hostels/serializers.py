from rest_framework import serializers
from .models import Hostel


class HostelSerializer(serializers.ModelSerializer):
    resident_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Hostel
        fields = ["id", "name", "gender", "monthly_rate", "resident_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_resident_count(self, obj):
        return obj.residents.filter(status="active").count()

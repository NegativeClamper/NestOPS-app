from datetime import date

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.accounts.permissions import IsOwner, IsOwnerOrStaff
from apps.residents.models import Resident
from .models import Payment
from .serializers import PaymentSerializer, ResidentDueSummarySerializer, DueMonthSerializer
from .utils import compute_dues_for_resident, compute_all_dues


class PaymentFilter(django_filters.FilterSet):
    resident = django_filters.NumberFilter(field_name="resident__id")
    period_month = django_filters.DateFilter()
    period_year = django_filters.NumberFilter(field_name="period_month__year")
    period_month_num = django_filters.NumberFilter(field_name="period_month__month")
    payment_method = django_filters.ChoiceFilter(choices=Payment.Method.choices)

    class Meta:
        model = Payment
        fields = ["resident", "period_month", "payment_method"]


class PaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD for fee payments.
    """
    queryset = (
        Payment.objects.select_related(
            "resident", "resident__bed", "resident__bed__room", "recorded_by"
        ).all()
    )
    serializer_class = PaymentSerializer
    permission_classes = [IsOwnerOrStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = ["resident__name", "resident__bed__room__room_number"]
    ordering_fields = ["date_paid", "amount", "period_month"]
    ordering = ["-date_paid"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsOwner()]
        return [IsOwnerOrStaff()]

    @action(detail=False, methods=["get"], url_path="dues")
    def dues(self, request):
        """
        GET /api/fees/dues/ — all active residents with outstanding balances.
        Sorted by overdue months count descending.
        """
        all_dues = compute_all_dues()
        serializer = ResidentDueSummarySerializer(all_dues, many=True)
        return Response({
            "total_residents_with_dues": len(all_dues),
            "total_outstanding": sum(d["total_balance"] for d in all_dues),
            "residents": serializer.data,
        })

    @action(detail=False, methods=["get"], url_path="resident/(?P<resident_id>[^/.]+)/dues")
    def resident_dues(self, request, resident_id=None):
        """
        GET /api/fees/resident/{id}/dues/ — due breakdown for a specific resident.
        """
        try:
            resident = Resident.objects.select_related(
                "bed", "bed__room", "bed__room__sharing_type"
            ).get(pk=resident_id)
        except Resident.DoesNotExist:
            return Response({"detail": "Resident not found."}, status=status.HTTP_404_NOT_FOUND)

        dues = compute_dues_for_resident(resident)
        serializer = DueMonthSerializer(dues, many=True)
        return Response({
            "resident_id": resident.id,
            "resident_name": resident.name,
            "monthly_fee": str(resident.monthly_fee or 0),
            "dues": serializer.data,
        })

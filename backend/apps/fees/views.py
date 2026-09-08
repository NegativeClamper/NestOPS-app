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
    hostel = django_filters.NumberFilter(field_name="hostel__id")

    class Meta:
        model = Payment
        fields = ["resident", "period_month", "payment_method", "hostel"]


class PaymentViewSet(viewsets.ModelViewSet):
    """
    CRUD for fee payments.
    """
    queryset = (
        Payment.objects.select_related(
            "resident", "resident__bed", "resident__bed__room",
            "resident__hostel", "recorded_by"
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
        Includes a `current_cycle` block with the join-date-anchored status.
        """
        try:
            resident = Resident.objects.select_related(
                "bed", "bed__room", "bed__room__sharing_type", "hostel"
            ).get(pk=resident_id)
        except Resident.DoesNotExist:
            return Response({"detail": "Resident not found."}, status=status.HTTP_404_NOT_FOUND)

        dues = compute_dues_for_resident(resident)
        serializer = DueMonthSerializer(dues, many=True)
        cycle = resident.current_cycle_status()
        return Response({
            "resident_id":    resident.id,
            "resident_name":  resident.name,
            "monthly_fee":    str(resident.monthly_fee or 0),
            "current_cycle":  {
                "cycle_start":    cycle["cycle_start"].isoformat() if cycle else None,
                "cycle_due_date": cycle["cycle_due_date"].isoformat() if cycle else None,
                "amount_due":     str(cycle["amount_due"]) if cycle else None,
                "amount_paid":    str(cycle["amount_paid"]) if cycle else None,
                "balance":        str(cycle["balance"]) if cycle else None,
                "is_paid":        cycle["is_paid"] if cycle else None,
                "is_overdue":     cycle["is_overdue"] if cycle else None,
            },
            "dues": serializer.data,
        })

    @action(detail=False, methods=["get"], url_path="pending-verification")
    def pending_verification(self, request):
        """
        GET /api/fees/pending-verification/
        Lists all unverified payments (submitted via intake form, awaiting review).
        """
        qs = (
            Payment.objects.filter(verified=False)
            .select_related("resident", "resident__hostel", "hostel")
            .order_by("-created_at")
        )
        data = []
        for p in qs:
            screenshot_url = None
            if p.transaction_screenshot and hasattr(p.transaction_screenshot, "url"):
                try:
                    screenshot_url = request.build_absolute_uri(p.transaction_screenshot.url)
                except Exception:
                    pass
            data.append({
                "id":             p.id,
                "resident_id":    p.resident_id,
                "resident_name":  p.resident.name,
                "resident_phone": p.resident.phone,
                "hostel_name":    p.hostel.name if p.hostel else "",
                "amount":         str(p.amount),
                "date_paid":      p.date_paid.isoformat(),
                "transaction_id": p.transaction_id,
                "screenshot_url": screenshot_url,
                "created_at":     p.created_at.isoformat(),
            })
        return Response({"count": len(data), "results": data})

    @action(detail=True, methods=["post"], url_path="verify",
            permission_classes=[IsOwner])
    def verify(self, request, pk=None):
        """
        POST /api/fees/<id>/verify/
        Marks an intake payment as verified. Owner only.
        """
        payment = self.get_object()
        if payment.verified:
            return Response({"detail": "Payment is already verified."})
        payment.verified = True
        payment.save(update_fields=["verified"])
        return Response({"detail": "Payment verified.", "id": payment.id})

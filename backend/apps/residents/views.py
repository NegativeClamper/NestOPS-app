from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.accounts.permissions import IsOwner, IsOwnerOrStaff
from .models import Resident
from .serializers import (
    ResidentListSerializer, ResidentDetailSerializer,
    CheckOutSerializer, CurrentCycleSerializer,
)


class ResidentFilter(django_filters.FilterSet):
    name   = django_filters.CharFilter(lookup_expr="icontains")
    room   = django_filters.CharFilter(field_name="bed__room__room_number", lookup_expr="iexact")
    status = django_filters.ChoiceFilter(choices=Resident.Status.choices)
    hostel = django_filters.NumberFilter(field_name="hostel__id")

    class Meta:
        model = Resident
        fields = ["name", "room", "status", "hostel"]


class ResidentViewSet(viewsets.ModelViewSet):
    """
    CRUD for residents.

    Endpoints:
      GET  /api/residents/                    — list with embedded current_cycle per resident
      GET  /api/residents/{id}/               — detail with embedded current_cycle
      POST /api/residents/                    — create
      PATCH/PUT /api/residents/{id}/          — update
      DELETE /api/residents/{id}/             — owner-only
      POST /api/residents/{id}/checkout/      — mark checked-out, free bed
      GET  /api/residents/{id}/cycle_status/  — current cycle status only (lightweight poll)

    Filter params: name, room, status, hostel
    """
    queryset = (
        Resident.objects.select_related(
            "bed", "bed__room", "bed__room__sharing_type", "hostel"
        ).all()
    )
    permission_classes = [IsOwnerOrStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ResidentFilter
    search_fields = ["name", "phone", "bed__room__room_number"]
    ordering_fields = ["name", "check_in_date", "status"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.action == "list":
            return ResidentListSerializer
        return ResidentDetailSerializer

    def get_permissions(self):
        if self.action == "destroy":
            return [IsOwner()]
        return [IsOwnerOrStaff()]

    # ── custom actions ────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="cycle_status")
    def cycle_status(self, request, pk=None):
        """
        GET /api/residents/{id}/cycle_status/

        Returns the resident's current billing cycle status without any other
        resident fields.  Useful for lightweight polling or a payment screen
        that only needs to know if the current cycle is paid.

        Response shape:
          {
            "resident_id":   int,
            "resident_name": str,
            "hostel_name":   str | null,
            "monthly_fee":   str | null,   (Decimal as string)
            "cycle_status":  { cycle_start, cycle_due_date, amount_due,
                               amount_paid, balance, is_paid, is_overdue }
          }
        """
        resident = self.get_object()
        cycle = resident.current_cycle_status()
        return Response({
            "resident_id":   resident.id,
            "resident_name": resident.name,
            "hostel_name":   resident.hostel.name if resident.hostel_id else None,
            "monthly_fee":   str(resident.monthly_fee) if resident.monthly_fee is not None else None,
            "cycle_status":  CurrentCycleSerializer(cycle).data if cycle else {
                "cycle_start": None, "cycle_due_date": None,
                "amount_due": None, "amount_paid": None, "balance": None,
                "is_paid": None, "is_overdue": None,
            },
        })

    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        """
        POST /api/residents/{id}/checkout/ — mark a resident as checked out.
        Frees their bed automatically.
        """
        resident = self.get_object()
        if resident.status == Resident.Status.CHECKED_OUT:
            return Response(
                {"detail": "Resident is already checked out."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Free the bed
        if resident.bed:
            bed = resident.bed
            bed.status = "vacant"
            bed.save()
            resident.bed = None

        resident.status = Resident.Status.CHECKED_OUT
        resident.check_out_date = serializer.validated_data["check_out_date"]
        if serializer.validated_data.get("notes"):
            resident.notes = (resident.notes + "\n" + serializer.validated_data["notes"]).strip()
        resident.save()

        return Response(ResidentDetailSerializer(resident).data)

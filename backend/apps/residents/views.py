from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.accounts.permissions import IsOwner, IsOwnerOrStaff
from .models import Resident
from .serializers import ResidentListSerializer, ResidentDetailSerializer, CheckOutSerializer


class ResidentFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr="icontains")
    room = django_filters.CharFilter(field_name="bed__room__room_number", lookup_expr="iexact")
    status = django_filters.ChoiceFilter(choices=Resident.Status.choices)

    class Meta:
        model = Resident
        fields = ["name", "room", "status"]


class ResidentViewSet(viewsets.ModelViewSet):
    """
    CRUD for residents. Supports search by name and filter by room/status.
    """
    queryset = (
        Resident.objects.select_related("bed", "bed__room", "bed__room__sharing_type")
        .all()
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

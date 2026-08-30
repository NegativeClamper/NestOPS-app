from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.permissions import IsOwnerOrStaff, IsOwnerOrReadOnly, IsOwner
from .models import SharingType, Room, Bed
from .serializers import (
    SharingTypeSerializer,
    RoomSerializer,
    RoomListSerializer,
    BedSerializer,
)


class SharingTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD for fee tiers (Single, Double, etc.).
    Read: any authenticated user.
    Write/Delete: Owner only.
    """
    queryset = SharingType.objects.all().order_by("monthly_rate")
    serializer_class = SharingTypeSerializer
    permission_classes = [IsOwnerOrReadOnly]


class RoomViewSet(viewsets.ModelViewSet):
    """
    Room CRUD + nested beds listing.
    """
    queryset = Room.objects.select_related("sharing_type").prefetch_related("beds__resident").all()
    permission_classes = [IsOwnerOrStaff]

    def get_serializer_class(self):
        if self.action == "list":
            return RoomListSerializer
        return RoomSerializer

    def get_permissions(self):
        if self.action in ("destroy",):
            return [IsOwner()]
        return [IsOwnerOrStaff()]

    @action(detail=True, methods=["get"], url_path="beds")
    def beds(self, request, pk=None):
        """GET /api/rooms/{id}/beds/ — all beds for a specific room."""
        room = self.get_object()
        beds = room.beds.select_related("resident").all()
        serializer = BedSerializer(beds, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="occupancy-summary")
    def occupancy_summary(self, request):
        """GET /api/rooms/occupancy-summary/ — quick overview for the dashboard."""
        total = Bed.objects.count()
        occupied = Bed.objects.filter(status=Bed.Status.OCCUPIED).count()
        vacant = total - occupied
        return Response({
            "total_beds": total,
            "occupied_beds": occupied,
            "vacant_beds": vacant,
            "occupancy_pct": round((occupied / total * 100) if total else 0, 1),
        })


class BedViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only listing of all beds — used by dashboard for occupancy.
    Beds are created/managed through their parent Room.
    POST /api/rooms/beds/create-bed/      — add a bed to a room (Owner only)
    PATCH /api/rooms/beds/<id>/relabel/   — rename a bed label (Owner only)
    DELETE /api/rooms/beds/<id>/delete/   — remove a vacant bed (Owner only, occupied beds rejected)
    """
    queryset = (
        Bed.objects.select_related("room", "room__sharing_type")
        .prefetch_related("resident")
        .all()
    )
    serializer_class = BedSerializer
    permission_classes = [IsOwnerOrStaff]
    filterset_fields = ["status", "room"]

    def get_permissions(self):
        return [IsOwnerOrStaff()]

    @action(detail=False, methods=["post"], url_path="create-bed", permission_classes=[IsOwner])
    def create_bed(self, request):
        """POST /api/rooms/beds/create-bed/ — Owner adds a bed to a room."""
        serializer = BedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="relabel", permission_classes=[IsOwner])
    def relabel_bed(self, request, pk=None):
        """PATCH /api/rooms/beds/<id>/relabel/ — Owner renames a bed label."""
        bed = self.get_object()
        new_label = request.data.get("bed_label", "").strip()
        if not new_label:
            return Response(
                {"detail": "bed_label is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        bed.bed_label = new_label
        bed.save(update_fields=["bed_label", "updated_at"])
        serializer = BedSerializer(bed)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"], url_path="delete", permission_classes=[IsOwner])
    def delete_bed(self, request, pk=None):
        """DELETE /api/rooms/beds/<id>/delete/ — Owner deletes a bed."""
        bed = self.get_object()
        if bed.status == Bed.Status.OCCUPIED:
            # Resolve resident name for a helpful message
            try:
                resident_name = bed.resident.name
            except Exception:
                resident_name = "a resident"
            return Response(
                {
                    "detail": (
                        f"Cannot delete this bed — it is currently occupied by {resident_name}. "
                        "Move or check them out before removing it."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        bed.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


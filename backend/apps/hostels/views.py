from rest_framework import viewsets

from apps.accounts.permissions import IsOwnerOrStaff, IsOwner
from .models import Hostel
from .serializers import HostelSerializer


class HostelViewSet(viewsets.ModelViewSet):
    """
    CRUD for hostels.
    Read: any authenticated user (owner or staff).
    Write/Delete: Owner only.
    """
    queryset = Hostel.objects.prefetch_related("residents").all()
    serializer_class = HostelSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsOwner()]
        return [IsOwnerOrStaff()]

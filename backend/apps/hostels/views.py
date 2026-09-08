import io
from django.http import HttpResponse
from django.conf import settings
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.accounts.permissions import IsOwnerOrReadOnly
from .models import Hostel
from .serializers import HostelSerializer


class HostelFilter(django_filters.FilterSet):
    gender = django_filters.ChoiceFilter(choices=Hostel.Gender.choices)

    class Meta:
        model = Hostel
        fields = ["gender"]


class HostelViewSet(viewsets.ModelViewSet):
    """
    CRUD for hostels.
    GET (list/retrieve): any authenticated user (owner or staff).
    POST/PATCH/PUT/DELETE: owner only.
    """
    queryset = Hostel.objects.prefetch_related("residents").all()
    serializer_class = HostelSerializer
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = HostelFilter
    search_fields = ["name"]
    ordering_fields = ["name", "monthly_rate"]
    ordering = ["name"]

    @action(detail=True, methods=["get"], url_path="qr")
    def qr_code(self, request, pk=None):
        """
        GET /api/hostels/<id>/qr/
        Returns a PNG QR code image encoding the intake URL for this hostel.
        """
        import qrcode

        hostel = self.get_object()
        base_url = getattr(settings, "INTAKE_BASE_URL", "http://localhost:8000")
        intake_url = f"{base_url}/intake/{hostel.id}/"

        img = qrcode.make(intake_url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return HttpResponse(buf.read(), content_type="image/png")

    @action(detail=True, methods=["get"], permission_classes=[])
    def qr(self, request, pk=None):
        hostel = self.get_object()
        intake_url = request.build_absolute_uri(f"/intake/{hostel.id}/")

        qr_img = qrcode.make(intake_url)
        buffer = io.BytesIO()
        qr_img.save(buffer, format="PNG")
        buffer.seek(0)

        return HttpResponse(buffer.getvalue(), content_type="image/png")

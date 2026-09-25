import io
import qrcode
from django.http import HttpResponse
from django.conf import settings
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
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
    serializer_class = HostelSerializer
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = HostelFilter
    search_fields = ["name"]
    ordering_fields = ["name", "monthly_rate"]
    ordering = ["name"]

    def get_queryset(self):
        return Hostel.objects.filter(owner=self.request.user.tenant).prefetch_related("residents")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user.tenant)

    @action(
        detail=True,
        methods=["get"],
        url_path="qr",
        permission_classes=[AllowAny],
        authentication_classes=[],   # skip JWT entirely — QR is a public image
    )
    def qr_code(self, request, pk=None):
        """
        GET /api/hostels/<id>/qr/
        Returns a PNG QR code image encoding the public intake URL for this hostel.
        No authentication required — the QR only contains a public URL.
        """
        try:
            hostel = Hostel.objects.get(pk=pk)
        except Hostel.DoesNotExist:
            from django.http import Http404
            raise Http404

        base_url = getattr(settings, "INTAKE_BASE_URL", "http://localhost:8000")
        intake_url = f"{base_url}/intake/{hostel.id}/"

        img = qrcode.make(intake_url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return HttpResponse(buf.read(), content_type="image/png")

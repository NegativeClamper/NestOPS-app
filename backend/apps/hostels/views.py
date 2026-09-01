from rest_framework import viewsets, filters
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

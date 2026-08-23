from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SharingTypeViewSet, RoomViewSet, BedViewSet

router = DefaultRouter()
router.register("sharing-types", SharingTypeViewSet, basename="sharing-type")
router.register("beds", BedViewSet, basename="bed")
router.register("", RoomViewSet, basename="room")

urlpatterns = [
    path("", include(router.urls)),
]

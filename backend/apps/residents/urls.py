from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResidentViewSet

router = DefaultRouter()
router.register("", ResidentViewSet, basename="resident")

urlpatterns = [
    path("", include(router.urls)),
]

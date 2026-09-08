from django.urls import path
from .views import IntakeSubmitView

# API submission endpoint — mounted at /api/intake/
urlpatterns = [
    path("<int:hostel_id>/submit/", IntakeSubmitView.as_view(), name="intake-submit"),
]

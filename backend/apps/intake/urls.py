from django.urls import path
from .views import intake_form_page

# HTML intake page — served at /intake/<hostel_id>/
urlpatterns = [
    path("<int:hostel_id>/", intake_form_page, name="intake-form"),
]

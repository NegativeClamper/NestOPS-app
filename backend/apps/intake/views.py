"""
Intake form views.

GET  /intake/<hostel_id>/          — serve the HTML intake page (no auth)
POST /api/intake/<hostel_id>/submit/ — process the form submission (no auth)
"""
import mimetypes
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from apps.hostels.models import Hostel
from apps.residents.models import Resident
from apps.fees.models import Payment
from apps.fees.utils import current_cycle

from .throttles import IntakeRateThrottle

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


# ─── HTML form page ───────────────────────────────────────────────────────────

def intake_form_page(request, hostel_id):
    """
    GET /intake/<hostel_id>/
    Renders the student-facing intake form. No authentication required.
    """
    try:
        hostel = Hostel.objects.get(pk=hostel_id)
    except Hostel.DoesNotExist:
        from django.http import Http404
        raise Http404("Hostel not found.")
    return render(request, "intake/form.html", {"hostel": hostel})


# ─── API submission endpoint ──────────────────────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class IntakeSubmitView(APIView):
    """
    POST /api/intake/<hostel_id>/submit/
    Public, unauthenticated. Throttled at 10 requests/hour per IP.

    Multipart fields:
        name, phone, parent_name, parent_phone,
        aadhar_photo (image), transaction_id, transaction_screenshot (image)
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [IntakeRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, hostel_id):
        # ── 1. Validate hostel ───────────────────────────────────────────────
        try:
            hostel = Hostel.objects.get(pk=hostel_id)
        except Hostel.DoesNotExist:
            return Response(
                {"detail": "Hostel not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── 2. Collect & validate fields ─────────────────────────────────────
        errors = {}

        name = request.data.get("name", "").strip()
        phone = request.data.get("phone", "").strip()
        parent_name = request.data.get("parent_name", "").strip()
        parent_phone = request.data.get("parent_phone", "").strip()
        transaction_id = request.data.get("transaction_id", "").strip()
        aadhar_photo = request.FILES.get("aadhar_photo")
        transaction_screenshot = request.FILES.get("transaction_screenshot")

        if not name:
            errors["name"] = "Full name is required."
        if not phone:
            errors["phone"] = "Phone number is required."
        if not parent_name:
            errors["parent_name"] = "Parent/guardian name is required."
        if not parent_phone:
            errors["parent_phone"] = "Parent/guardian phone is required."
        if not transaction_id:
            errors["transaction_id"] = "Transaction ID / UTR is required."
        if not aadhar_photo:
            errors["aadhar_photo"] = "Aadhar photo is required."
        else:
            if not _is_image(aadhar_photo):
                errors["aadhar_photo"] = "Only image files are accepted (JPG, PNG, etc.)."
            elif aadhar_photo.size > MAX_IMAGE_BYTES:
                errors["aadhar_photo"] = "Image must be smaller than 5 MB."
        if not transaction_screenshot:
            errors["transaction_screenshot"] = "Transaction screenshot is required."
        else:
            if not _is_image(transaction_screenshot):
                errors["transaction_screenshot"] = "Only image files are accepted (JPG, PNG, etc.)."
            elif transaction_screenshot.size > MAX_IMAGE_BYTES:
                errors["transaction_screenshot"] = "Image must be smaller than 5 MB."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # ── 3. Duplicate phone check (same hostel, active resident) ──────────
        if Resident.objects.filter(
            hostel=hostel, phone=phone, status=Resident.Status.ACTIVE
        ).exists():
            return Response(
                {
                    "duplicate": True,
                    "detail": (
                        "Looks like you're already registered at this hostel. "
                        "Contact the hostel owner if this is a mistake."
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        # ── 4. Create Resident ───────────────────────────────────────────────
        today = date.today()
        resident = Resident.objects.create(
            name=name,
            phone=phone,
            parent_name=parent_name,
            parent_phone=parent_phone,
            id_proof=aadhar_photo,
            hostel=hostel,
            check_in_date=today,
            status=Resident.Status.ACTIVE,
        )

        # ── 5. Create first Payment (unverified) ─────────────────────────────
        cycle_start, _ = current_cycle(today, today)
        Payment.objects.create(
            resident=resident,
            hostel=hostel,
            amount=hostel.monthly_rate,
            date_paid=today,
            payment_method=Payment.Method.UPI,
            period_month=cycle_start,
            transaction_id=transaction_id,
            transaction_screenshot=transaction_screenshot,
            verified=False,
        )

        return Response(
            {
                "resident_id": resident.id,
                "message": "Registration successful! The hostel owner will confirm your payment shortly.",
            },
            status=status.HTTP_201_CREATED,
        )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _is_image(upload) -> bool:
    """Return True if the uploaded file is an image type."""
    mime = getattr(upload, "content_type", "") or ""
    if mime.startswith("image/"):
        return True
    # Fallback: check by filename
    guessed, _ = mimetypes.guess_type(upload.name)
    return bool(guessed and guessed.startswith("image/"))

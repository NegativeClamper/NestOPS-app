from rest_framework.throttling import AnonRateThrottle


class IntakeRateThrottle(AnonRateThrottle):
    """10 submissions per hour per IP for the public intake endpoint."""
    scope = "intake"

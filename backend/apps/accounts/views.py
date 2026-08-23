from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.permissions import IsOwner, IsOwnerOrStaff
from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CreateStaffSerializer,
    ChangePasswordSerializer,
)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns JWT access + refresh tokens plus user info."""
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ — returns current authenticated user's profile."""
    permission_classes = [IsOwnerOrStaff]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — authenticated user changes their own password."""
    permission_classes = [IsOwnerOrStaff]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated successfully."})


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklists the refresh token."""
    permission_classes = [IsOwnerOrStaff]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass  # Already invalid — that's fine
        return Response({"detail": "Logged out successfully."})


class StaffListView(APIView):
    """GET/POST /api/auth/staff/ — Owner only: list and create staff accounts."""
    permission_classes = [IsOwner]

    def get(self, request):
        users = User.objects.exclude(id=request.user.id).order_by("username")
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CreateStaffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    """GET/PATCH/DELETE /api/auth/staff/{id}/ — Owner only: manage a staff account."""
    permission_classes = [IsOwner]

    def get_object(self, pk, request):
        try:
            return User.objects.exclude(id=request.user.id).get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(pk, request)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(obj).data)

    def patch(self, request, pk):
        obj = self.get_object(pk, request)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self.get_object(pk, request)
        if not obj:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

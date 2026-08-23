from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """
    Allows access only to users with the 'owner' role.
    Used for destructive operations and user management.
    """

    message = "Only the hostel owner can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_owner)


class IsOwnerOrStaff(BasePermission):
    """
    Allows access to any authenticated user (owner or staff).
    Most read/create operations use this.
    """

    message = "Authentication required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsOwnerOrReadOnly(BasePermission):
    """
    Staff can read; only Owner can write/delete.
    Useful for reference data (sharing types, expense categories).
    """

    message = "Only the hostel owner can modify this data."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.is_owner

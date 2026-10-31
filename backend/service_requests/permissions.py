from rest_framework.permissions import BasePermission
from accounts.models import User


class IsUser(BasePermission):
    message = "Only student/teacher accounts can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.USER and not request.user.is_superuser)


class IsTechnician(BasePermission):
    message = "Only technician accounts can perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.TECHNICIAN)

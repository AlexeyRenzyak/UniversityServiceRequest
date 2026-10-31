from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        if not email or not password:
            return Response({"detail": "Email and password are required."}, status=400)

        # Coursework requirement US-01 asks for a separate 'no account' error.
        # Production applications often prefer a generic error to prevent email enumeration.
        if not User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "No account with this email. Please register."}, status=401)
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({"detail": "Incorrect credentials."}, status=401)
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        token = request.data.get("refresh")
        if not token:
            return Response({"refresh": ["This field is required."]}, status=400)
        try:
            refresh = RefreshToken(token)
            if str(refresh["user_id"]) != str(request.user.pk):
                return Response({"detail": "Token belongs to a different user."}, status=403)
            refresh.blacklist()
        except (TokenError, KeyError, TypeError, ValueError):
            return Response({"detail": "Invalid or already revoked refresh token."}, status=400)
        return Response(status=205)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

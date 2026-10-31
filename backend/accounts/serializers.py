from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "user_type")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=User.Role.choices)
    user_type = serializers.ChoiceField(choices=User.UserType.choices, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "user_type", "password", "password_confirm")
        read_only_fields = ("id",)
        extra_kwargs = {"first_name": {"required": True, "allow_blank": False},
                        "last_name": {"required": True, "allow_blank": False}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Please log in.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if attrs["role"] == User.Role.USER and attrs.get("user_type") not in User.UserType.values:
            raise serializers.ValidationError({"user_type": "Choose student or teacher."})
        if attrs["role"] == User.Role.TECHNICIAN and attrs.get("user_type"):
            raise serializers.ValidationError({"user_type": "Technicians must not specify a user type."})
        attrs.setdefault("user_type", "")
        temp_user = User(email=attrs["email"], first_name=attrs["first_name"], last_name=attrs["last_name"])
        try:
            validate_password(attrs["password"], temp_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

from rest_framework import serializers
from .models import ServiceRequest


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = (
            "id", "requester", "requester_name", "technician", "room_number", "category",
            "description", "status", "created_at", "taken_at",
        )
        read_only_fields = (
            "id", "requester", "requester_name", "technician", "status", "created_at", "taken_at",
        )


class CreateRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ("room_number", "category", "description")

    def validate_room_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Room number is required.")
        return value

    def validate_description(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Problem description is required.")
        return value

from rest_framework import serializers
from .models import ArchivedRequest


class ArchivedRequestSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="original_request_id", read_only=True)

    class Meta:
        model = ArchivedRequest
        fields = (
            "id", "requester", "requester_name", "technician", "room_number", "category",
            "description", "status", "created_at", "taken_at", "finished_at",
        )

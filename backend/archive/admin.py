from django.contrib import admin
from .models import ArchivedRequest


@admin.register(ArchivedRequest)
class ArchivedRequestAdmin(admin.ModelAdmin):
    list_display = ("original_request_id", "category", "room_number", "requester", "technician", "finished_at")
    list_filter = ("category", "finished_at")
    search_fields = ("room_number", "description", "requester__email")
    readonly_fields = (
        "original_request_id", "requester", "requester_name", "technician", "room_number",
        "category", "description", "created_at", "taken_at", "finished_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

from django.contrib import admin
from .models import ServiceRequest


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "room_number", "category", "status", "requester", "technician", "created_at")
    list_filter = ("category", "status", "created_at")
    search_fields = ("room_number", "description", "requester__email")
    readonly_fields = ("created_at", "taken_at")

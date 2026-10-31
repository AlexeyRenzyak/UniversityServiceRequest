from django.conf import settings
from django.db import models


class ServiceRequest(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        TAKEN = "taken", "Taken"

    class Category(models.TextChoices):
        PRINTER = "printer", "Printer"
        COMPUTER = "computer", "Computer"
        PROJECTOR = "projector", "Projector"
        NETWORK = "network", "Network"
        ELECTRICAL = "electrical", "Electrical"
        FURNITURE = "furniture", "Furniture"
        OTHER = "other", "Other"

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="submitted_requests", on_delete=models.PROTECT)
    requester_name = models.CharField(max_length=150)  # Snapshot; survives a name change.
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="assigned_requests", on_delete=models.PROTECT,
        null=True, blank=True,
    )
    room_number = models.CharField(max_length=30)
    category = models.CharField(max_length=30, choices=Category.choices)
    description = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CREATED)
    created_at = models.DateTimeField(auto_now_add=True)
    taken_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at", "-id")
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(status="created", technician__isnull=True, taken_at__isnull=True)
                    | models.Q(status="taken", technician__isnull=False, taken_at__isnull=False)
                ),
                name="requests_valid_status_assignment",
            ),
        ]

    def __str__(self):
        return f"Request #{self.pk}: {self.category} in room {self.room_number}"

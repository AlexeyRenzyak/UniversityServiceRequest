from django.conf import settings
from django.db import models


class ArchivedRequest(models.Model):
    """Finished request snapshot in a separate table, as required by Objective 5."""

    class Status(models.TextChoices):
        FINISHED = "finished", "Finished"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.FINISHED, editable=False)
    original_request_id = models.PositiveBigIntegerField(unique=True)
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="archived_submissions", on_delete=models.PROTECT,
    )
    requester_name = models.CharField(max_length=150)
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="completed_assignments", on_delete=models.PROTECT,
    )
    room_number = models.CharField(max_length=30)
    category = models.CharField(max_length=30)
    description = models.TextField()
    created_at = models.DateTimeField()
    taken_at = models.DateTimeField()
    finished_at = models.DateTimeField()

    class Meta:
        ordering = ("-finished_at", "-id")
        constraints = [
            models.CheckConstraint(condition=models.Q(status="finished"), name="archive_only_finished_requests"),
        ]

    def __str__(self):
        return f"Completed request #{self.original_request_id}"

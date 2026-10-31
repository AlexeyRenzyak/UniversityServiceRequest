import csv
from datetime import date

from django.http import HttpResponse
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from service_requests.permissions import IsTechnician
from .models import ArchivedRequest
from .serializers import ArchivedRequestSerializer


def archived_queryset_for_dates(request):
    """Inclusive date range, interpreted using Django's configured time zone."""
    start = request.query_params.get("date_from")
    end = request.query_params.get("date_to")
    dates = {}
    for name, value in (("date_from", start), ("date_to", end)):
        if value:
            try:
                dates[name] = date.fromisoformat(value)
            except ValueError as exc:
                raise serializers.ValidationError({name: "Use YYYY-MM-DD."}) from exc
    if dates.get("date_from") and dates.get("date_to") and dates["date_from"] > dates["date_to"]:
        raise serializers.ValidationError({"date_to": "Must not precede date_from."})
    queryset = ArchivedRequest.objects.select_related("requester", "technician")
    if "date_from" in dates:
        queryset = queryset.filter(finished_at__date__gte=dates["date_from"])
    if "date_to" in dates:
        queryset = queryset.filter(finished_at__date__lte=dates["date_to"])
    return queryset


class ArchivedRequestsView(ListAPIView):
    permission_classes = [IsAuthenticated, IsTechnician]
    serializer_class = ArchivedRequestSerializer

    def get_queryset(self):
        return archived_queryset_for_dates(self.request)


def safe_csv_cell(value):
    """Prevent untrusted request text from becoming a spreadsheet formula."""
    value = "" if value is None else str(value)
    if value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return "'" + value
    return value


class ExportArchiveView(APIView):
    permission_classes = [IsAuthenticated, IsTechnician]

    def get(self, request):
        items = archived_queryset_for_dates(request)
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="service_request_archive.csv"'
        response.write("\ufeff")  # UTF-8 BOM helps spreadsheet applications detect encoding.
        writer = csv.writer(response)
        writer.writerow((
            "request_id", "requester_name", "requester_email", "technician_name",
            "technician_email", "room_number", "category", "description",
            "created_at", "taken_at", "finished_at",
        ))
        for obj in items.iterator():
            writer.writerow([safe_csv_cell(v) for v in (
                obj.original_request_id,
                obj.requester_name, obj.requester.email,
                obj.technician.get_full_name() or obj.technician.email,
                obj.technician.email, obj.room_number, obj.category, obj.description,
                obj.created_at.isoformat(), obj.taken_at.isoformat(), obj.finished_at.isoformat(),
            )])
        return response

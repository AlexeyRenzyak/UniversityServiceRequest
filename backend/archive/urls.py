from django.urls import path
from .views import ArchivedRequestsView, ExportArchiveView

urlpatterns = [
    path("", ArchivedRequestsView.as_view(), name="archive-list"),
    path("export/", ExportArchiveView.as_view(), name="archive-export"),
]

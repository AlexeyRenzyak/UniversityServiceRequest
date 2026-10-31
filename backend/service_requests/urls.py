from django.urls import path
from .views import (
    AssignedRequestsView, AvailableRequestsView, CreateRequestView,
    FinishRequestView, MyRequestsView, TakeRequestView,
)

urlpatterns = [
    path("", CreateRequestView.as_view(), name="request-create"),
    path("my/", MyRequestsView.as_view(), name="requests-my"),
    path("available/", AvailableRequestsView.as_view(), name="requests-available"),
    path("assigned/", AssignedRequestsView.as_view(), name="requests-assigned"),
    path("<int:pk>/take/", TakeRequestView.as_view(), name="request-take"),
    path("<int:pk>/finish/", FinishRequestView.as_view(), name="request-finish"),
]

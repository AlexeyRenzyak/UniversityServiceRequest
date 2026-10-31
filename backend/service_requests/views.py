from django.db import transaction
from django.http import Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from archive.models import ArchivedRequest
from archive.serializers import ArchivedRequestSerializer
from .models import ServiceRequest
from .permissions import IsTechnician, IsUser
from .serializers import CreateRequestSerializer, ServiceRequestSerializer


class CreateRequestView(APIView):
    permission_classes = [IsAuthenticated, IsUser]

    def post(self, request):
        serializer = CreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        name = user.get_full_name().strip() or user.email
        obj = serializer.save(requester=user, requester_name=name)
        return Response(ServiceRequestSerializer(obj).data, status=status.HTTP_201_CREATED)


class MyRequestsView(APIView):
    permission_classes = [IsAuthenticated, IsUser]

    def get(self, request):
        active = ServiceRequest.objects.filter(requester=request.user).select_related("requester", "technician")
        finished = ArchivedRequest.objects.filter(requester=request.user).select_related("requester", "technician")
        data = ServiceRequestSerializer(active, many=True).data + ArchivedRequestSerializer(finished, many=True).data
        data.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
        return Response(data)


class AvailableRequestsView(ListAPIView):
    permission_classes = [IsAuthenticated, IsTechnician]
    serializer_class = ServiceRequestSerializer
    queryset = ServiceRequest.objects.filter(status=ServiceRequest.Status.CREATED, technician__isnull=True).select_related("requester")


class AssignedRequestsView(ListAPIView):
    permission_classes = [IsAuthenticated, IsTechnician]
    serializer_class = ServiceRequestSerializer

    def get_queryset(self):
        return ServiceRequest.objects.filter(
            status=ServiceRequest.Status.TAKEN, technician=self.request.user,
        ).select_related("requester", "technician")


class TakeRequestView(APIView):
    permission_classes = [IsAuthenticated, IsTechnician]

    def post(self, request, pk):
        # Conditional UPDATE is atomic in PostgreSQL, so exactly one technician can win.
        updated = ServiceRequest.objects.filter(
            pk=pk, status=ServiceRequest.Status.CREATED, technician__isnull=True,
        ).update(status=ServiceRequest.Status.TAKEN, technician=request.user, taken_at=timezone.now())
        if updated == 0:
            if not ServiceRequest.objects.filter(pk=pk).exists():
                raise Http404
            return Response({"detail": "Request already taken. Refresh the available list."}, status=409)
        obj = ServiceRequest.objects.select_related("requester", "technician").get(pk=pk)
        return Response(ServiceRequestSerializer(obj).data)


class FinishRequestView(APIView):
    permission_classes = [IsAuthenticated, IsTechnician]

    @transaction.atomic
    def post(self, request, pk):
        try:
            obj = ServiceRequest.objects.select_for_update().get(pk=pk)
        except ServiceRequest.DoesNotExist:
            raise Http404
        if obj.status != ServiceRequest.Status.TAKEN:
            return Response({"detail": "Request must be taken before it can be finished."}, status=409)
        if obj.technician_id != request.user.id:
            return Response({"detail": "Only the assigned technician can finish this request."}, status=403)
        archived = ArchivedRequest.objects.create(
            original_request_id=obj.pk,
            requester=obj.requester,
            requester_name=obj.requester_name,
            technician=obj.technician,
            room_number=obj.room_number,
            category=obj.category,
            description=obj.description,
            created_at=obj.created_at,
            taken_at=obj.taken_at,
            finished_at=timezone.now(),
        )
        obj.delete()
        return Response(ArchivedRequestSerializer(archived).data, status=200)

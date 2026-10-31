from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from archive.models import ArchivedRequest
from .models import ServiceRequest

User = get_user_model()


class RequestLifecycleTests(APITestCase):
    def setUp(self):
        self.requester = User.objects.create_user(
            email="teacher@example.edu", password="StrongPass#2026!", role="user",
            user_type="teacher", first_name="Grace", last_name="Hopper",
        )
        self.other_requester = User.objects.create_user(
            email="student@example.edu", password="StrongPass#2026!", role="user",
            user_type="student", first_name="Alan", last_name="Turing",
        )
        self.tech1 = User.objects.create_user(
            email="tech1@example.edu", password="StrongPass#2026!", role="technician",
            first_name="Repair", last_name="One",
        )
        self.tech2 = User.objects.create_user(
            email="tech2@example.edu", password="StrongPass#2026!", role="technician",
            first_name="Repair", last_name="Two",
        )

    def make_request(self):
        self.client.force_authenticate(self.requester)
        response = self.client.post(reverse("request-create"), {
            "room_number": "B-201", "category": "printer", "description": "Printer is jammed",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def test_request_submission_and_requester_snapshot(self):
        pk = self.make_request()
        obj = ServiceRequest.objects.get(pk=pk)
        self.assertEqual(obj.status, "created")
        self.assertIsNone(obj.technician)
        self.assertEqual(obj.requester_name, "Grace Hopper")
        response = self.client.get(reverse("requests-my"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["status"], "created")

    def test_room_number_is_required(self):
        self.client.force_authenticate(self.requester)
        response = self.client.post(reverse("request-create"), {"category": "printer", "description": "Broken"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("room_number", response.data)

    def test_only_users_submit_and_only_technicians_take(self):
        self.client.force_authenticate(self.tech1)
        response = self.client.post(reverse("request-create"), {
            "room_number": "C-101", "category": "network", "description": "No Wi-Fi",
        }, format="json")
        self.assertEqual(response.status_code, 403)
        pk = self.make_request()
        self.assertEqual(self.client.post(reverse("request-take", args=[pk])).status_code, 403)
        self.assertEqual(self.client.get(reverse("requests-available")).status_code, 403)

    def test_users_only_see_own_requests(self):
        pk = self.make_request()
        self.client.force_authenticate(self.other_requester)
        self.assertEqual(self.client.get(reverse("requests-my")).data, [])
        self.client.force_authenticate(self.requester)
        self.assertEqual(self.client.get(reverse("requests-my")).data[0]["id"], pk)

    def test_requester_sees_taken_status(self):
        pk = self.make_request()
        self.client.force_authenticate(self.tech1)
        self.assertEqual(self.client.post(reverse("request-take", args=[pk])).status_code, 200)
        self.client.force_authenticate(self.requester)
        status_response = self.client.get(reverse("requests-my"))
        self.assertEqual(status_response.data[0]["status"], "taken")
        self.assertEqual(status_response.data[0]["technician"], self.tech1.pk)

    def test_only_one_technician_can_take_a_request(self):
        pk = self.make_request()
        self.client.force_authenticate(self.tech1)
        self.assertEqual(self.client.get(reverse("requests-available")).data["count"], 1)
        first = self.client.post(reverse("request-take", args=[pk]))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["status"], "taken")
        self.assertEqual(self.client.get(reverse("requests-assigned")).data["count"], 1)
        self.client.force_authenticate(self.tech2)
        second = self.client.post(reverse("request-take", args=[pk]))
        self.assertEqual(second.status_code, 409)
        self.assertEqual(self.client.get(reverse("requests-available")).data["count"], 0)
        self.assertEqual(self.client.get(reverse("requests-assigned")).data["count"], 0)
        self.assertEqual(ServiceRequest.objects.get(pk=pk).technician, self.tech1)

    def test_only_assigned_technician_can_finish_and_archive(self):
        pk = self.make_request()
        self.client.force_authenticate(self.tech1)
        before_taken = self.client.post(reverse("request-finish", args=[pk]))
        self.assertEqual(before_taken.status_code, 409)
        self.client.post(reverse("request-take", args=[pk]))
        self.client.force_authenticate(self.tech2)
        self.assertEqual(self.client.post(reverse("request-finish", args=[pk])).status_code, 403)
        self.client.force_authenticate(self.tech1)
        finished = self.client.post(reverse("request-finish", args=[pk]))
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(finished.data["status"], "finished")
        self.assertFalse(ServiceRequest.objects.filter(pk=pk).exists())
        self.assertEqual(ArchivedRequest.objects.get(original_request_id=pk).requester, self.requester)
        self.client.force_authenticate(self.requester)
        user_history = self.client.get(reverse("requests-my")).data
        self.assertEqual(len(user_history), 1)
        self.assertEqual(user_history[0]["id"], pk)
        self.assertEqual(user_history[0]["status"], "finished")

    def test_archive_export_permission_and_csv(self):
        pk = self.make_request()
        self.client.force_authenticate(self.tech1)
        self.client.post(reverse("request-take", args=[pk]))
        self.client.post(reverse("request-finish", args=[pk]))
        listing = self.client.get(reverse("archive-list"))
        self.assertEqual(listing.data["count"], 1)
        export = self.client.get(reverse("archive-export"))
        self.assertEqual(export.status_code, 200)
        self.assertIn(b"printer", export.content)
        self.assertIn(b"Grace Hopper", export.content)
        old_interval = self.client.get(reverse("archive-list"), {
            "date_from": "1900-01-01", "date_to": "1900-12-31",
        })
        self.assertEqual(old_interval.data["count"], 0)
        backwards = self.client.get(reverse("archive-export"), {
            "date_from": "2026-12-31", "date_to": "2026-01-01",
        })
        self.assertEqual(backwards.status_code, 400)
        bad_date = self.client.get(reverse("archive-list"), {"date_from": "not-a-date"})
        self.assertEqual(bad_date.status_code, 400)
        self.client.force_authenticate(self.requester)
        self.assertEqual(self.client.get(reverse("archive-export")).status_code, 403)
        self.assertEqual(self.client.get(reverse("archive-list")).status_code, 403)

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.registration = {
            "email": "student@example.edu", "first_name": "Ada", "last_name": "Student",
            "role": "user", "user_type": "student",
            "password": "StrongPass#2026!", "password_confirm": "StrongPass#2026!",
        }

    def test_registration_and_jwt_login(self):
        response = self.client.post(reverse("auth-register"), self.registration, format="json")
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="student@example.edu")
        self.assertNotEqual(user.password, self.registration["password"])
        login = self.client.post(reverse("auth-login"), {
            "email": "student@example.edu", "password": "StrongPass#2026!",
        }, format="json")
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["user"]["role"], "user")
        self.assertTrue(login.data["access"])
        self.assertTrue(login.data["refresh"])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        self.assertEqual(self.client.get(reverse("auth-me")).data["email"], "student@example.edu")

    def test_register_technician(self):
        data = dict(self.registration, email="tech@example.edu", role="technician", user_type="")
        response = self.client.post(reverse("auth-register"), data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.get(email="tech@example.edu").role, "technician")

    def test_duplicate_email_is_rejected(self):
        self.client.post(reverse("auth-register"), self.registration, format="json")
        response = self.client.post(reverse("auth-register"), dict(self.registration, email="STUDENT@EXAMPLE.EDU"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_passwords_must_match(self):
        response = self.client.post(reverse("auth-register"), dict(self.registration, password_confirm="DifferentPass123!"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password_confirm", response.data)

    def test_short_password_is_rejected(self):
        response = self.client.post(reverse("auth-register"), dict(self.registration, password="short", password_confirm="short"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_technician_cannot_claim_student_type(self):
        response = self.client.post(reverse("auth-register"), dict(self.registration, role="technician"), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("user_type", response.data)

    def test_missing_account_and_wrong_password(self):
        missing = self.client.post(reverse("auth-login"), {"email": "unknown@example.edu", "password": "whatever"})
        self.assertEqual(missing.status_code, 401)
        self.client.post(reverse("auth-register"), self.registration, format="json")
        wrong = self.client.post(reverse("auth-login"), {"email": "student@example.edu", "password": "wrong"})
        self.assertEqual(wrong.status_code, 401)
        self.assertNotEqual(missing.data["detail"], wrong.data["detail"])

    def test_logout_revokes_refresh_token(self):
        self.client.post(reverse("auth-register"), self.registration, format="json")
        login = self.client.post(reverse("auth-login"), {"email": "student@example.edu", "password": "StrongPass#2026!"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        logout = self.client.post(reverse("auth-logout"), {"refresh": login.data["refresh"]}, format="json")
        self.assertEqual(logout.status_code, 205)
        self.client.credentials()
        refresh = self.client.post(reverse("auth-refresh"), {"refresh": login.data["refresh"]}, format="json")
        self.assertEqual(refresh.status_code, 401)

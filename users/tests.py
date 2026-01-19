from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import OnboardingTourStatus

User = get_user_model()

class OnboardingAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='tester', email='tester@example.com', password='pass')
        self.client.login(username='tester', password='pass')

    def test_onboarding_status_and_complete(self):
        tour_name = 'test_tour'
        status_url = f'/users/api/onboarding/status/{tour_name}/'
        complete_url = f'/users/api/onboarding/complete/{tour_name}/'

        # Initially should be not completed
        resp = self.client.get(status_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get('completed'), False)

        # Post complete
        resp = self.client.post(complete_url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get('completed'))

        # Now status should be true
        resp = self.client.get(status_url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get('completed'), True)

        # DB record exists
        self.assertTrue(OnboardingTourStatus.objects.filter(user=self.user, tour_name=tour_name, completed=True).exists())

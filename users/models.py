from django.db import models
from django.utils import timezone

# Create your models here.


class OnboardingTourStatus(models.Model):
    """Tracks per-user completion state for named onboarding tours."""
    user_id = models.CharField(max_length=255, db_index=True)  # Store user ID from JWT token
    tour_name = models.CharField(max_length=100)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user_id", "tour_name")
        indexes = [models.Index(fields=["user_id", "tour_name"]) ]

    def mark_completed(self):
        self.completed = True
        self.completed_at = timezone.now()
        self.save()

    def __str__(self):
        return f"OnboardingTourStatus(user={self.user_id}, tour={self.tour_name}, completed={self.completed})"

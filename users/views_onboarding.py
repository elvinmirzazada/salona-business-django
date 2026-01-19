from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
from django.utils import timezone
from .models import OnboardingTourStatus
import json


def get_user_id_from_request(request):
    """Extract user_id from request body or query params.

    For GET requests: expects ?user_id=<id> query param
    For POST requests: expects {"user_id": "<id>"} in body

    Returns:
        str or None: User ID if provided, None otherwise
    """
    if request.method == 'GET':
        return request.GET.get('user_id')
    elif request.method == 'POST':
        try:
            body = json.loads(request.body) if request.body else {}
            return body.get('user_id')
        except (json.JSONDecodeError, ValueError):
            return None
    return None


@require_http_methods(["GET"])
def onboarding_status(request, tour_name):
    """Return JSON status for whether the current user completed `tour_name`.

    Expects user_id as query parameter: ?user_id=<id>

    This endpoint is intentionally available to anonymous users and will return
    completed=false for requests without user_id so the frontend can decide to
    start tours without being redirected to login pages.
    """
    user_id = get_user_id_from_request(request)

    if not user_id:
        return JsonResponse({"completed": False, "completed_at": None})

    try:
        obj = OnboardingTourStatus.objects.get(user_id=str(user_id), tour_name=tour_name)
        return JsonResponse({
            "completed": bool(obj.completed),
            "completed_at": obj.completed_at.isoformat() if obj.completed_at else None
        })
    except OnboardingTourStatus.DoesNotExist:
        return JsonResponse({"completed": False, "completed_at": None})


@require_http_methods(["POST"])
def onboarding_mark_complete(request, tour_name):
    """Mark the named tour as completed for the current user.

    Expects user_id in request body: {"user_id": "<id>"}

    For requests without user_id we return a JSON 401/unauthenticated response
    so the AJAX/fetch client can handle it gracefully (it will still set a
    local completion flag).
    """
    user_id = get_user_id_from_request(request)

    if not user_id:
        # Return a JSON response indicating the user isn't authenticated.
        return JsonResponse({"status": "unauthenticated", "completed": False}, status=401)

    obj, created = OnboardingTourStatus.objects.get_or_create(
        user_id=str(user_id),
        tour_name=tour_name,
        defaults={'completed': True, 'completed_at': timezone.now()}
    )

    if not created and not obj.completed:
        obj.completed = True
        obj.completed_at = timezone.now()
        obj.save()

    # ensure CSRF token in response for subsequent requests if needed
    token = get_token(request)
    return JsonResponse({
        "status": "ok",
        "completed": True,
        "completed_at": obj.completed_at.isoformat(),
        "csrf_token": token
    })


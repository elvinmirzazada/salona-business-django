from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages
from django.urls import reverse
from django.http import JsonResponse
import requests

class LoginView(View):
    def get(self, request):
        # If user is already authenticated, redirect to dashboard
        if 'accessToken' in request.session:
            return redirect('dashboard')
        return render(request, 'users/login.html')

class SignupView(View):
    def get(self, request):
        # If user is already authenticated, redirect to dashboard
        if 'accessToken' in request.session:
            return redirect('dashboard')
        return render(request, 'users/signup.html')

class DashboardView(View):
    def get(self, request):
        # We'll rely on client-side authentication check instead
        # The JavaScript in dashboard.js will check localStorage for token
        # and redirect to login if not present
        return render(request, 'users/dashboard.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })

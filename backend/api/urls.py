"""
Flavor Tree — API URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'brands', views.BrandViewSet)
router.register(r'flavors', views.FlavorCategoryViewSet)
router.register(r'beers', views.BeerViewSet)
router.register(r'school/levels', views.SchoolLevelViewSet)
router.register(r'school/lessons', views.LessonViewSet)

urlpatterns = [
    path('match/', views.flavor_match, name='flavor-match'),
    path('school/quiz/', views.check_quiz_answer, name='quiz-answer'),
    path('ai/sommelier/', views.ai_sommelier, name='ai-sommelier'),
    path('profile/dna/', views.flavor_dna_demo, name='flavor-dna'),
    path('', include(router.urls)),
]

"""
Flavor Tree — Django Admin Configuration
"""

from django.contrib import admin
from .models import (
    Brand, FlavorCategory, Beer, FlavorPyramid, BeerFlavorNote,
    Dish, FoodPairing, ExpertReview,
    SchoolLevel, Lesson, QuizQuestion,
    UserProfile, TastingNote,
)


class BeerFlavorNoteInline(admin.TabularInline):
    model = BeerFlavorNote
    extra = 1


class FlavorPyramidInline(admin.StackedInline):
    model = FlavorPyramid
    extra = 0


class FoodPairingInline(admin.TabularInline):
    model = FoodPairing
    extra = 0
    fk_name = 'beer'


class ExpertReviewInline(admin.TabularInline):
    model = ExpertReview
    extra = 0


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'country']


@admin.register(FlavorCategory)
class FlavorCategoryAdmin(admin.ModelAdmin):
    list_display = ['emoji', 'name', 'name_en', 'color']


@admin.register(Beer)
class BeerAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'style', 'abv', 'ibu', 'rating', 'is_premium', 'is_active']
    list_filter = ['brand', 'style', 'is_premium', 'is_active']
    search_fields = ['name', 'brand__name']
    inlines = [FlavorPyramidInline, BeerFlavorNoteInline, FoodPairingInline, ExpertReviewInline]


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ['emoji', 'name', 'cuisine']


@admin.register(SchoolLevel)
class SchoolLevelAdmin(admin.ModelAdmin):
    list_display = ['emoji', 'name', 'order', 'xp_required']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'level', 'order', 'xp_reward']
    list_filter = ['level']


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'lesson', 'correct_index']
    list_filter = ['lesson__level']

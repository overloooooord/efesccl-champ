"""
Flavor Tree — DRF Serializers
"""

from rest_framework import serializers
from .models import (
    Brand, FlavorCategory, Beer, FlavorPyramid, BeerFlavorNote,
    Dish, FoodPairing, ExpertReview,
    SchoolLevel, Lesson, QuizQuestion,
)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'


class FlavorCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FlavorCategory
        fields = '__all__'


class FlavorPyramidSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlavorPyramid
        fields = ['top_title', 'top_description', 'heart_title', 'heart_description',
                  'base_title', 'base_description']


class BeerFlavorNoteSerializer(serializers.ModelSerializer):
    category = FlavorCategorySerializer(read_only=True)

    class Meta:
        model = BeerFlavorNote
        fields = ['id', 'category', 'intensity', 'layer', 'sub_description']


class ExpertReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertReview
        fields = ['id', 'name', 'role', 'avatar_emoji', 'text', 'rating']


class DishSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dish
        fields = '__all__'


class FoodPairingSerializer(serializers.ModelSerializer):
    dish = DishSerializer(read_only=True)

    class Meta:
        model = FoodPairing
        fields = ['id', 'dish', 'match_percent', 'why_it_works', 'flavor_bridges']


class BeerListSerializer(serializers.ModelSerializer):
    """Краткая информация для каталога"""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    top_notes = serializers.SerializerMethodField()

    class Meta:
        model = Beer
        fields = ['id', 'name', 'brand_name', 'style', 'style_display', 'abv', 'ibu',
                  'tagline', 'image_url', 'rating', 'rating_count', 'is_premium', 'top_notes']

    def get_top_notes(self, obj):
        return BeerFlavorNoteSerializer(
            obj.flavor_notes.order_by('-intensity')[:3], many=True
        ).data


class BeerDetailSerializer(serializers.ModelSerializer):
    """Полная информация о пиве"""
    brand = BrandSerializer(read_only=True)
    pyramid = FlavorPyramidSerializer(read_only=True)
    flavor_notes = BeerFlavorNoteSerializer(many=True, read_only=True)
    food_pairings = FoodPairingSerializer(many=True, read_only=True)
    expert_reviews = ExpertReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Beer
        fields = ['id', 'name', 'brand', 'style', 'style_display', 'abv', 'ibu',
                  'description', 'tagline', 'serving_temp', 'density', 'image_url',
                  'rating', 'rating_count', 'notes_count', 'is_premium',
                  'pyramid', 'flavor_notes', 'food_pairings', 'expert_reviews']


# ── Matching (Ноты → Пиво) ──

class FlavorMatchRequestSerializer(serializers.Serializer):
    """Запрос на matching: какие ноты выбрал пользователь"""
    note_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=10,
        help_text='IDs выбранных FlavorCategory'
    )


class BeerMatchResultSerializer(serializers.Serializer):
    """Результат matching"""
    beer = BeerListSerializer()
    match_percent = serializers.IntegerField()
    matching_notes = serializers.ListField(child=serializers.CharField())


# ── Школа ──

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ['id', 'text', 'options', 'order']
        # correct_index НЕ отдаём — чтобы не подсмотрели


class LessonSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'slug', 'content', 'order', 'xp_reward', 'questions']


class SchoolLevelSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    lessons_count = serializers.SerializerMethodField()

    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'slug', 'emoji', 'color', 'description',
                  'order', 'xp_required', 'lessons', 'lessons_count']

    def get_lessons_count(self, obj):
        return obj.lessons.count()


class QuizAnswerSerializer(serializers.Serializer):
    """Ответ пользователя на вопрос квиза"""
    question_id = serializers.IntegerField()
    selected_index = serializers.IntegerField()

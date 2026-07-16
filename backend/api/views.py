"""
Flavor Tree — API Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.db.models import Q, Sum

from .models import (
    Brand, FlavorCategory, Beer, BeerFlavorNote,
    Dish, FoodPairing,
    SchoolLevel, Lesson, QuizQuestion,
)
from .serializers import (
    BrandSerializer, FlavorCategorySerializer,
    BeerListSerializer, BeerDetailSerializer,
    BeerFlavorNoteSerializer, FoodPairingSerializer,
    FlavorMatchRequestSerializer, BeerMatchResultSerializer,
    SchoolLevelSerializer, LessonSerializer,
    QuizAnswerSerializer,
)


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    """Бренды пива"""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    pagination_class = None


class FlavorCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Все вкусовые категории (для навигации Ноты -> Пиво)"""
    queryset = FlavorCategory.objects.all()
    serializer_class = FlavorCategorySerializer
    pagination_class = None


class BeerViewSet(viewsets.ReadOnlyModelViewSet):
    """Каталог пива"""
    queryset = Beer.objects.filter(is_active=True).select_related('brand').prefetch_related(
        'flavor_notes__category', 'pyramid', 'food_pairings__dish', 'expert_reviews'
    )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BeerDetailSerializer
        return BeerListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        style = self.request.query_params.get('style')
        brand = self.request.query_params.get('brand')
        search = self.request.query_params.get('search')

        if style:
            qs = qs.filter(style=style)
        if brand:
            qs = qs.filter(brand__id=brand)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(brand__name__icontains=search))
        return qs

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """Похожие по вкусу (на основе общих нот)"""
        beer = self.get_object()
        beer_note_ids = set(beer.flavor_notes.values_list('category_id', flat=True))

        if not beer_note_ids:
            return Response([])

        similar_beers = (
            Beer.objects.filter(is_active=True)
            .exclude(id=beer.id)
            .filter(flavor_notes__category_id__in=beer_note_ids)
            .distinct()
        )

        results = []
        for other_beer in similar_beers[:6]:
            other_note_ids = set(other_beer.flavor_notes.values_list('category_id', flat=True))
            common = beer_note_ids & other_note_ids
            total = beer_note_ids | other_note_ids
            match_pct = int((len(common) / len(total)) * 100) if total else 0
            results.append({
                'beer': BeerListSerializer(other_beer).data,
                'match_percent': match_pct,
            })

        results.sort(key=lambda x: x['match_percent'], reverse=True)
        return Response(results[:3])


@api_view(['POST'])
def flavor_match(request):
    """
    Двусторонняя навигация: Ноты -> Пиво
    POST {"note_ids": [1, 3, 5]}
    """
    serializer = FlavorMatchRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    selected_ids = set(serializer.validated_data['note_ids'])
    beers = Beer.objects.filter(is_active=True).prefetch_related('flavor_notes__category')

    results = []
    for beer in beers:
        beer_note_ids = set(beer.flavor_notes.values_list('category_id', flat=True))
        if not beer_note_ids:
            continue

        common = selected_ids & beer_note_ids
        if not common:
            continue

        total = selected_ids | beer_note_ids
        jaccard = len(common) / len(total)

        intensity_bonus = 0
        matching_notes_names = []
        for note in beer.flavor_notes.filter(category_id__in=common):
            intensity_bonus += note.intensity
            matching_notes_names.append(f'{note.category.emoji} {note.category.name}')

        avg_intensity = intensity_bonus / len(common) if common else 0
        match_pct = int(jaccard * 60 + (avg_intensity / 100) * 40)
        match_pct = min(match_pct, 99)

        results.append({
            'beer': BeerListSerializer(beer).data,
            'match_percent': match_pct,
            'matching_notes': matching_notes_names,
        })

    results.sort(key=lambda x: x['match_percent'], reverse=True)
    return Response(results[:10])


# -- Школа Сомелье --

class SchoolLevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SchoolLevel.objects.prefetch_related('lessons__questions').all()
    serializer_class = SchoolLevelSerializer
    pagination_class = None


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.prefetch_related('questions').all()
    serializer_class = LessonSerializer
    lookup_field = 'slug'


@api_view(['POST'])
def check_quiz_answer(request):
    """Проверка ответа на вопрос квиза"""
    serializer = QuizAnswerSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        question = QuizQuestion.objects.get(id=serializer.validated_data['question_id'])
    except QuizQuestion.DoesNotExist:
        return Response({'error': 'Question not found'}, status=404)

    selected = serializer.validated_data['selected_index']
    is_correct = selected == question.correct_index

    return Response({
        'correct': is_correct,
        'correct_index': question.correct_index,
        'explanation': question.explanation,
        'xp_earned': question.lesson.xp_reward // max(question.lesson.questions.count(), 1) if is_correct else 0,
    })


# -- AI Сомелье --

@api_view(['POST'])
def ai_sommelier(request):
    """AI Сомелье — чат о пиве. POST {"message": "..."}"""
    message = request.data.get('message', '')
    if not message:
        return Response({'error': 'Message is required'}, status=400)

    beers = Beer.objects.filter(is_active=True).select_related('brand')
    pairings = FoodPairing.objects.select_related('beer', 'dish').all()

    response_text = _generate_local_response(message, beers, pairings)

    return Response({
        'message': response_text,
        'source': 'local',
    })


def _generate_local_response(message, beers, pairings):
    """Умный fallback без OpenAI"""
    message_lower = message.lower()

    # Ищем упоминание блюда
    for pairing in pairings:
        dish_name = pairing.dish.name.lower()
        if dish_name in message_lower or any(word in message_lower for word in dish_name.split() if len(word) > 3):
            return (
                f'К {pairing.dish.name} я рекомендую **{pairing.beer.name}**!\n\n'
                f'Совпадение: {pairing.match_percent}%\n\n'
                f'{pairing.why_it_works}\n\n'
                f'Подавать при {pairing.beer.serving_temp}.'
            )

    # Ищем упоминание пива
    for beer in beers:
        if beer.name.lower() in message_lower:
            return (
                f'**{beer.name}** — отличный выбор!\n\n'
                f'{beer.description}\n\n'
                f'ABV: {beer.abv}% | IBU: {beer.ibu} | Подача: {beer.serving_temp}'
            )

    # Ищем ноты
    note_keywords = {
        'цитрус': 'цитрусовыми нотами',
        'хлеб': 'хлебными нотами',
        'горечь': 'горьковатым профилем',
        'мед': 'медовой сладостью',
        'карамель': 'карамельными нотами',
        'шоколад': 'шоколадными нотами',
    }

    for keyword, description in note_keywords.items():
        if keyword in message_lower:
            matching = beers.filter(
                flavor_notes__category__name__icontains=keyword
            ).distinct()[:3]
            if matching:
                beer_list = ', '.join([b.name for b in matching])
                return (
                    f'Пива с {description}:\n\n'
                    f'{beer_list}\n\n'
                    f'Попробуйте начать с {matching[0].name} — '
                    f'это {matching[0].style_display} с ABV {matching[0].abv}%.'
                )

    # Default
    top_beers = beers[:3]
    return (
        f'Вот мои топ-рекомендации для начала:\n\n'
        + '\n'.join([f'- **{b.name}** — {b.tagline}' for b in top_beers])
        + '\n\nРасскажите подробнее — какие вкусы вам нравятся?'
    )


# -- Flavor DNA (demo) --

@api_view(['GET'])
def flavor_dna_demo(request):
    """Demo Flavor DNA"""
    return Response({
        'username': 'demo_user',
        'level': 'Исследователь',
        'total_tastings': 12,
        'xp': 847,
        'streak': 5,
        'dna': [
            {'name': 'Цитрус', 'emoji': '🍋', 'percent': 42, 'color': '#f59e0b'},
            {'name': 'Хлеб', 'emoji': '🍞', 'percent': 28, 'color': '#d97706'},
            {'name': 'Горечь', 'emoji': '⚡', 'percent': 15, 'color': '#8b5cf6'},
            {'name': 'Трава', 'emoji': '🌿', 'percent': 9, 'color': '#22c55e'},
            {'name': 'Цветочный', 'emoji': '🌸', 'percent': 6, 'color': '#ec4899'},
        ],
        'tagline': 'Ты на 42% цитрусовый',
        'achievements': [
            {'name': 'Первый глоток', 'emoji': '🍺', 'unlocked': True},
            {'name': '5 дней подряд', 'emoji': '🔥', 'unlocked': True},
            {'name': 'Цитрусовый фанат', 'emoji': '🍋', 'unlocked': True},
            {'name': '10 заметок', 'emoji': '📝', 'unlocked': True},
            {'name': 'Слепая дегустация', 'emoji': '🔒', 'unlocked': False},
            {'name': 'Food Pairing Pro', 'emoji': '🔒', 'unlocked': False},
        ],
    })

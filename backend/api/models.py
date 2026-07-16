"""
Flavor Tree — Data Models
Все модели для платформы сенсорного образования пива.
"""

from django.db import models
from django.contrib.auth.models import User


class Brand(models.Model):
    """Бренд (Efes, Kozel, etc.)"""
    name = models.CharField(max_length=100)
    country = models.CharField(max_length=50, default='Kazakhstan')
    description = models.TextField(blank=True)
    logo_url = models.URLField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class FlavorCategory(models.Model):
    """Категория вкусовых нот (Цитрус, Хлеб, Травы...)"""
    name = models.CharField(max_length=50)
    name_en = models.CharField(max_length=50, blank=True)
    emoji = models.CharField(max_length=10)
    color = models.CharField(max_length=7, help_text='HEX color, e.g. #f59e0b')
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Flavor Categories'
        ordering = ['name']

    def __str__(self):
        return f'{self.emoji} {self.name}'


class Beer(models.Model):
    """Пиво — главная сущность"""
    STYLE_CHOICES = [
        ('pilsener', 'Pilsener'),
        ('lager', 'Lager'),
        ('dark_lager', 'Dark Lager'),
        ('wheat', 'Wheat Beer'),
        ('stout', 'Stout'),
        ('ale', 'Ale'),
        ('ipa', 'IPA'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='beers')
    style = models.CharField(max_length=20, choices=STYLE_CHOICES, default='lager')
    style_display = models.CharField(max_length=50, blank=True, help_text='Human-readable style name')
    abv = models.FloatField(help_text='Alcohol by volume %')
    ibu = models.IntegerField(default=0, help_text='International Bitterness Units')
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True, help_text='Эмоциональный слоган')
    serving_temp = models.CharField(max_length=20, default='4-6°C')
    density = models.CharField(max_length=20, blank=True, help_text='e.g. 12°P')
    image_url = models.URLField(blank=True)
    rating = models.FloatField(default=4.5)
    rating_count = models.IntegerField(default=0)
    notes_count = models.IntegerField(default=0)
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.brand.name})'


class FlavorPyramid(models.Model):
    """Вкусовая пирамида пива (Top/Heart/Base)"""
    beer = models.OneToOneField(Beer, on_delete=models.CASCADE, related_name='pyramid')
    # TOP — Эмоции и ассоциации
    top_title = models.CharField(max_length=100, default='Эмоции и ассоциации')
    top_description = models.TextField(help_text='Эмоции: лето, свобода, ностальгия...')
    # HEART — Ароматические ноты
    heart_title = models.CharField(max_length=100, default='Ароматические ноты')
    heart_description = models.TextField(help_text='Цитрус, хлеб, мёд, хвоя...')
    # BASE — Базовые вкусы
    base_title = models.CharField(max_length=100, default='Базовые вкусы')
    base_description = models.TextField(help_text='Горечь, сладость, кислота...')

    def __str__(self):
        return f'Pyramid: {self.beer.name}'


class BeerFlavorNote(models.Model):
    """Связь пива с вкусовой нотой (с интенсивностью)"""
    LAYER_CHOICES = [
        ('top', 'Top (Emotions)'),
        ('heart', 'Heart (Aromas)'),
        ('base', 'Base (Tastes)'),
    ]

    beer = models.ForeignKey(Beer, on_delete=models.CASCADE, related_name='flavor_notes')
    category = models.ForeignKey(FlavorCategory, on_delete=models.CASCADE, related_name='beer_notes')
    intensity = models.IntegerField(help_text='Intensity 0-100')
    layer = models.CharField(max_length=10, choices=LAYER_CHOICES, default='heart')
    sub_description = models.CharField(max_length=100, blank=True, help_text='e.g. Лимонная цедра')

    class Meta:
        ordering = ['-intensity']
        unique_together = ['beer', 'category']

    def __str__(self):
        return f'{self.beer.name} — {self.category.name}: {self.intensity}%'


class Dish(models.Model):
    """Блюдо для Food Pairing"""
    name = models.CharField(max_length=200)
    cuisine = models.CharField(max_length=50, default='Казахская')
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    emoji = models.CharField(max_length=10, blank=True)

    class Meta:
        verbose_name_plural = 'Dishes'
        ordering = ['name']

    def __str__(self):
        return f'{self.emoji} {self.name}'


class FoodPairing(models.Model):
    """Сочетание пива с блюдом"""
    beer = models.ForeignKey(Beer, on_delete=models.CASCADE, related_name='food_pairings')
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name='beer_pairings')
    match_percent = models.IntegerField(help_text='Match 0-100')
    why_it_works = models.TextField(help_text='Объяснение почему это сочетание работает')
    flavor_bridges = models.JSONField(default=list, help_text='["🔥 Горечь × Дым", "🍋 Цитрус освежает"]')

    class Meta:
        ordering = ['-match_percent']
        unique_together = ['beer', 'dish']

    def __str__(self):
        return f'{self.beer.name} × {self.dish.name}: {self.match_percent}%'


class ExpertReview(models.Model):
    """Отзыв эксперта о пиве"""
    beer = models.ForeignKey(Beer, on_delete=models.CASCADE, related_name='expert_reviews')
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    avatar_emoji = models.CharField(max_length=10, default='🎓')
    text = models.TextField()
    rating = models.FloatField(default=5.0)

    class Meta:
        ordering = ['-rating']

    def __str__(self):
        return f'{self.name}: {self.beer.name}'


# ── Школа Сомелье ──

class SchoolLevel(models.Model):
    """Уровень школы сомелье"""
    LEVEL_CHOICES = [
        ('beginner', 'Новичок'),
        ('explorer', 'Исследователь'),
        ('expert', 'Знаток'),
        ('sommelier', 'Сомелье'),
    ]

    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    emoji = models.CharField(max_length=10)
    color = models.CharField(max_length=20)
    description = models.TextField()
    order = models.IntegerField(default=0)
    xp_required = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.emoji} {self.name}'


class Lesson(models.Model):
    """Урок в школе сомелье"""
    level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    content = models.TextField(help_text='Markdown content')
    order = models.IntegerField(default=0)
    xp_reward = models.IntegerField(default=50)

    class Meta:
        ordering = ['level__order', 'order']

    def __str__(self):
        return f'{self.level.name} → {self.title}'


class QuizQuestion(models.Model):
    """Вопрос квиза"""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    options = models.JSONField(help_text='["Option A", "Option B", "Option C", "Option D"]')
    correct_index = models.IntegerField(help_text='0-based index of correct option')
    explanation = models.TextField(blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:80]


# ── Пользовательские данные ──

class UserProfile(models.Model):
    """Расширенный профиль пользователя"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    total_xp = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    tastings_count = models.IntegerField(default=0)
    current_level = models.ForeignKey(SchoolLevel, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f'Profile: {self.user.username}'


class TastingNote(models.Model):
    """Дегустационная заметка пользователя"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasting_notes')
    beer = models.ForeignKey(Beer, on_delete=models.CASCADE, related_name='tasting_notes')
    notes_text = models.TextField()
    rating = models.FloatField(default=4.0)
    selected_notes = models.ManyToManyField(FlavorCategory, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} → {self.beer.name}'

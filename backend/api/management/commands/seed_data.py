"""Seed database with 15 Efes KZ brands + flavor data."""
from django.core.management.base import BaseCommand
from api.models import *

class Command(BaseCommand):
    help = 'Seed Flavor Tree database'

    def handle(self, *args, **opts):
        self.stdout.write('Seeding...')
        
        # Brands
        efes = Brand.objects.get_or_create(name='Efes', defaults={'country':'Turkey/Kazakhstan'})[0]
        bz = Brand.objects.get_or_create(name='Белое Золото', defaults={'country':'Kazakhstan'})[0]
        kara = Brand.objects.get_or_create(name='Karagandinskoe', defaults={'country':'Kazakhstan'})[0]
        sm = Brand.objects.get_or_create(name='Старый Мельник', defaults={'country':'Russia/KZ'})[0]
        kozel = Brand.objects.get_or_create(name='Velkopopovicky Kozel', defaults={'country':'Czech Republic'})[0]
        ams = Brand.objects.get_or_create(name='Amsterdam', defaults={'country':'Netherlands/KZ'})[0]
        miller = Brand.objects.get_or_create(name='Miller', defaults={'country':'USA/KZ'})[0]
        sol_b = Brand.objects.get_or_create(name='SOL', defaults={'country':'Mexico/KZ'})[0]

        # Flavor categories
        cats = {}
        cat_data = [
            ('Цитрус','Citrus','🍋','#f59e0b'),('Хлеб','Bread','🍞','#d97706'),
            ('Трава','Grass','🌿','#22c55e'),('Горечь','Bitterness','⚡','#8b5cf6'),
            ('Мёд','Honey','🍯','#fbbf24'),('Цветочный','Floral','🌸','#ec4899'),
            ('Карамель','Caramel','🍬','#b45309'),('Шоколад','Chocolate','🍫','#78350f'),
            ('Дым','Smoke','🔥','#dc2626'),('Фрукты','Fruit','🍎','#ef4444'),
            ('Специи','Spice','🌶️','#f97316'),('Солод','Malt','🌾','#a16207'),
            ('Ваниль','Vanilla','🧁','#fde68a'),('Кофе','Coffee','☕','#451a03'),
            ('Орехи','Nuts','🥜','#92400e'),
        ]
        for name, en, emoji, color in cat_data:
            cats[name] = FlavorCategory.objects.get_or_create(
                name=name, defaults={'name_en':en,'emoji':emoji,'color':color}
            )[0]

        # 15 Beers
        beers_data = [
            (efes,'Efes Pilsener','pilsener','Pilsener',5.0,22,'Классический пильзнер с цитрусовыми нотами и мягкой горечью.','Глоток свободы в каждом пузырьке','4-6°C','12°P',4.7,2847,False),
            (efes,'Efes Draft','lager','Draft Lager',5.0,18,'Разливное качество в каждой бутылке.','Свежесть из-под крана','3-5°C','11°P',4.5,1523,False),
            (bz,'Белое Золото Светлое','lager','Светлый Лагер',4.7,15,'Мягкий казахстанский лагер с хлебными нотами.','Золото степей','4-6°C','11°P',4.4,1890,False),
            (bz,'Белое Золото Пшеничное','wheat','Пшеничное',4.5,12,'Нефильтрованное пшеничное с фруктовыми нотами.','Солнце в бокале','4-6°C','11.5°P',4.6,1245,False),
            (kara,'Karagandinskoe Светлое','lager','Светлый Лагер',4.8,16,'Крепкий характер Караганды в каждом глотке.','Характер степи','4-6°C','11.5°P',4.3,2100,False),
            (kara,'Karagandinskoe Тёмное','dark_lager','Тёмный Лагер',4.5,20,'Насыщенное тёмное с карамельными и шоколадными нотами.','Глубина вкуса','6-8°C','13°P',4.5,1680,True),
            (sm,'Старый Мельник Мягкое','lager','Мягкий Лагер',4.3,14,'Исключительно мягкий вкус с медовыми нотами.','Душевное пиво','4-6°C','10.5°P',4.2,980,False),
            (sm,'Старый Мельник Из Бочонка','lager','Бочковой Лагер',5.0,18,'Вкус настоящего бочкового пива.','Традиции пивоварения','4-6°C','12°P',4.4,1340,False),
            (kozel,'Kozel Светлое','lager','Czech Lager',4.0,20,'Чешские традиции пивоварения.','Чешская классика','4-6°C','10°P',4.5,1567,False),
            (kozel,'Kozel Тёмное','dark_lager','Czech Dark Lager',3.8,22,'Богатый тёмный лагер с нотами карамели и кофе.','Тёмная сторона Чехии','6-8°C','10°P',4.6,1890,True),
            (ams,'Amsterdam Navigator','lager','Strong Lager',7.0,25,'Крепкий лагер для настоящих навигаторов.','Курс на вкус','4-6°C','15°P',4.1,890,True),
            (ams,'Amsterdam Mariner','lager','Premium Lager',5.0,20,'Премиальный лагер с чистым послевкусием.','Морская свежесть','4-6°C','12°P',4.3,760,True),
            (efes,'Efes Stout','stout','Stout',5.5,30,'Плотный стаут с нотами кофе и шоколада.','Тёмная глубина','8-10°C','14°P',4.4,650,True),
            (miller,'Miller Genuine Draft','lager','American Lager',4.7,10,'Холодная фильтрация для максимальной свежести.','Настоящий вкус','2-4°C','11°P',4.2,1200,False),
            (sol_b,'SOL','lager','Mexican Lager',4.5,12,'Мексиканский лагер — лёгкий, освежающий, с лаймом.','Вкус солнца','2-4°C','10°P',4.3,1100,False),
        ]
        
        for bd in beers_data:
            brand,name,style,sd,abv,ibu,desc,tag,temp,dens,rat,rc,prem = bd
            beer, created = Beer.objects.get_or_create(name=name, defaults={
                'brand':brand,'style':style,'style_display':sd,'abv':abv,'ibu':ibu,
                'description':desc,'tagline':tag,'serving_temp':temp,'density':dens,
                'rating':rat,'rating_count':rc,'is_premium':prem,
            })
            if not created:
                continue

            # Flavor notes per beer
            notes_map = {
                'Efes Pilsener': [('Цитрус',85,'heart','Лимонная цедра'),('Хлеб',72,'heart','Свежая корочка'),('Трава',60,'heart','Луговые травы'),('Горечь',55,'base','Мягкая'),('Мёд',48,'heart','Солодовая'),('Цветочный',40,'heart','Хмелевой')],
                'Efes Draft': [('Цитрус',75,'heart','Лёгкий цитрус'),('Хлеб',65,'heart','Солод'),('Горечь',45,'base','Деликатная'),('Трава',50,'heart','Свежесть'),('Мёд',35,'heart','Лёгкая')],
                'Белое Золото Светлое': [('Хлеб',80,'heart','Пшеничный'),('Мёд',55,'heart','Медовая'),('Цитрус',45,'heart','Лёгкий'),('Трава',40,'heart','Травяной'),('Горечь',35,'base','Мягкая')],
                'Белое Золото Пшеничное': [('Хлеб',85,'heart','Пшеничный'),('Фрукты',70,'heart','Банан, гвоздика'),('Мёд',50,'heart','Медовая'),('Специи',40,'heart','Гвоздика'),('Цветочный',35,'heart','Лёгкий')],
                'Karagandinskoe Светлое': [('Хлеб',70,'heart','Ржаной'),('Горечь',60,'base','Характерная'),('Трава',55,'heart','Степные'),('Солод',50,'heart','Солодовый'),('Цитрус',40,'heart','Лёгкий')],
                'Karagandinskoe Тёмное': [('Карамель',80,'heart','Жжёная'),('Шоколад',65,'heart','Тёмный'),('Солод',70,'heart','Жареный'),('Горечь',50,'base','Мягкая'),('Кофе',45,'heart','Лёгкий')],
                'Старый Мельник Мягкое': [('Мёд',75,'heart','Цветочный мёд'),('Хлеб',60,'heart','Мягкий'),('Солод',55,'heart','Лёгкий'),('Цветочный',40,'heart','Нежный'),('Горечь',25,'base','Едва заметная')],
                'Старый Мельник Из Бочонка': [('Хлеб',70,'heart','Бочковой'),('Солод',65,'heart','Насыщенный'),('Горечь',50,'base','Умеренная'),('Мёд',45,'heart','Солодовая'),('Трава',35,'heart','Хмелевая')],
                'Kozel Светлое': [('Хлеб',75,'heart','Чешский'),('Горечь',60,'base','Saaz хмель'),('Цитрус',45,'heart','Лёгкий'),('Солод',55,'heart','Пильзнерский'),('Мёд',40,'heart','Тонкая')],
                'Kozel Тёмное': [('Карамель',85,'heart','Тёплая'),('Кофе',60,'heart','Обжаренный'),('Шоколад',55,'heart','Молочный'),('Солод',70,'heart','Жареный'),('Ваниль',35,'heart','Нежная')],
                'Amsterdam Navigator': [('Горечь',75,'base','Выраженная'),('Солод',70,'heart','Крепкий'),('Хлеб',55,'heart','Плотный'),('Специи',45,'heart','Пряные'),('Карамель',40,'heart','Лёгкая')],
                'Amsterdam Mariner': [('Цитрус',65,'heart','Морской'),('Горечь',55,'base','Чистая'),('Хлеб',50,'heart','Лёгкий'),('Трава',45,'heart','Морские'),('Солод',40,'heart','Умеренный')],
                'Efes Stout': [('Кофе',80,'heart','Эспрессо'),('Шоколад',75,'heart','Горький'),('Карамель',60,'heart','Жжёная'),('Горечь',65,'base','Выраженная'),('Ваниль',30,'heart','Лёгкая')],
                'Miller Genuine Draft': [('Цитрус',55,'heart','Освежающий'),('Хлеб',45,'heart','Кукурузный'),('Горечь',30,'base','Минимальная'),('Трава',35,'heart','Свежая'),('Солод',40,'heart','Лёгкий')],
                'SOL': [('Цитрус',80,'heart','Лайм'),('Трава',50,'heart','Кориандр'),('Горечь',25,'base','Лёгкая'),('Фрукты',40,'heart','Тропические'),('Солод',30,'heart','Лёгкий')],
            }

            if name in notes_map:
                for cat_name, intensity, layer, sub in notes_map[name]:
                    if cat_name in cats:
                        BeerFlavorNote.objects.get_or_create(
                            beer=beer, category=cats[cat_name],
                            defaults={'intensity':intensity,'layer':layer,'sub_description':sub}
                        )

            # Pyramids
            pyramids = {
                'Efes Pilsener': ('Летний вечер на крыше. Лёгкий ветер. Свобода.','Цедра лимона, свежий хлеб, цветочный хмель, луговые травы.','Мягкая горечь, лёгкая сладость солода, сухое послевкусие.'),
                'Karagandinskoe Тёмное': ('Уютный зимний вечер у камина. Тепло и глубина.','Жжёная карамель, тёмный шоколад, обжаренный кофе.','Сладковатая основа, мягкая горечь жареного солода.'),
                'Kozel Тёмное': ('Чешская пивная в Праге. Дождь за окном, тепло внутри.','Карамель, молочный шоколад, лёгкий кофе, ваниль.','Сладкая солодовая основа, минимальная горечь.'),
                'Белое Золото Пшеничное': ('Солнечный день на берегу озера Балхаш.','Банан, гвоздика, пшеничный хлеб, мёд.','Мягкая кислинка, пшеничная сладость.'),
                'Efes Stout': ('Ночной джаз-клуб. Приглушённый свет и глубокий бас.','Эспрессо, горький шоколад, жжёная карамель.','Плотная горечь, кофейная сладость, долгое послевкусие.'),
                'SOL': ('Мексиканский пляж. Лайм, соль, закат.','Лайм, кориандр, тропические фрукты.','Освежающая лёгкость, минимальная горечь.'),
            }
            if name in pyramids:
                top, heart, base = pyramids[name]
                FlavorPyramid.objects.get_or_create(beer=beer, defaults={
                    'top_description':top,'heart_description':heart,'base_description':base
                })

        # Dishes + Food Pairings
        dishes = {
            'Шашлык из баранины': ('Казахская','🍖'),
            'Бешбармак': ('Казахская','🥘'),
            'Баурсаки': ('Казахская','🫓'),
            'Казы': ('Казахская','🥩'),
            'Манты': ('Казахская','🥟'),
            'Плов': ('Казахская','🍚'),
        }
        dish_objs = {}
        for dname, (cuisine, emoji) in dishes.items():
            dish_objs[dname] = Dish.objects.get_or_create(
                name=dname, defaults={'cuisine':cuisine,'emoji':emoji}
            )[0]

        pairings = [
            ('Efes Pilsener','Шашлык из баранины',94,'Дымная корочка встречает цитрусовую горечь. Пиво освежает нёбо после каждого куска.',['🔥 Горечь × Дым','🍋 Цитрус освежает','🍞 Солод × Угли']),
            ('Karagandinskoe Тёмное','Бешбармак',91,'Солодовые ноты тёмного пива усиливают вкус жирного мяса. Карамель дополняет бульон.',['🍬 Карамель × Бульон','🥩 Солод × Мясо','☕ Кофе × Жир']),
            ('Белое Золото Пшеничное','Баурсаки',88,'Пшеничные ноты пива и теста создают гармонию. Мёд усиливает сладость.',['🍞 Пшеница × Тесто','🍯 Мёд × Масло','🌸 Цветочный аромат']),
            ('Kozel Тёмное','Казы',87,'Карамельная сладость и копчёность казы — идеальная пара.',['🍬 Карамель × Копчёность','🍫 Шоколад × Жир','🧁 Ваниль × Специи']),
            ('Efes Pilsener','Манты',85,'Лёгкая горечь и цитрус освежают после сочных мантов.',['🍋 Цитрус × Сочность','🌿 Трава × Лук','⚡ Горечь очищает']),
        ]
        for bname, dname, pct, why, bridges in pairings:
            try:
                beer = Beer.objects.get(name=bname)
                dish = dish_objs[dname]
                FoodPairing.objects.get_or_create(
                    beer=beer, dish=dish,
                    defaults={'match_percent':pct,'why_it_works':why,'flavor_bridges':bridges}
                )
            except Beer.DoesNotExist:
                pass

        # Expert reviews for Efes Pilsener
        try:
            ep = Beer.objects.get(name='Efes Pilsener')
            reviews = [
                ('Алексей Воронов','Cicerone Certified','🎓','Безупречный баланс для пильзнера. Один из лучших в регионе.',5.0),
                ('Айгуль Сатпаева','Head Brewer, Efes KZ','🍺','Saaz хмель для цветочных нот, Hallertau для горечи. Результат 50+ лет.',5.0),
                ('Марат Касымов','Пивной блогер, 45K','📝','Для летних вечеров в Алматы — вне конкуренции.',4.5),
            ]
            for rname, role, emoji, text, rating in reviews:
                ExpertReview.objects.get_or_create(
                    beer=ep, name=rname,
                    defaults={'role':role,'avatar_emoji':emoji,'text':text,'rating':rating}
                )
        except Beer.DoesNotExist:
            pass

        # School levels
        levels = [
            ('Новичок','beginner','🟢','green','Базовые вкусы, как правильно пробовать пиво',0,0),
            ('Исследователь','explorer','🔵','blue','Ароматические ноты, стили пива',1,300),
            ('Знаток','expert','🟣','purple','Food pairing, влияние ингредиентов',2,800),
            ('Сомелье','sommelier','🟡','gold','Слепая дегустация, цифровой сертификат Efes',3,1500),
        ]
        for lname, slug, emoji, color, desc, order, xp in levels:
            level, _ = SchoolLevel.objects.get_or_create(slug=slug, defaults={
                'name':lname,'emoji':emoji,'color':color,'description':desc,'order':order,'xp_required':xp
            })

        # Lesson + Quiz for Beginner
        beginner = SchoolLevel.objects.filter(slug='beginner').first()
        if beginner:
            lesson, _ = Lesson.objects.get_or_create(slug='basic-tastes', defaults={
                'level':beginner,'title':'Базовые вкусы пива','order':1,'xp_reward':50,
                'content':'# Базовые вкусы пива\n\nКаждое пиво содержит комбинацию базовых вкусов:\n\n'
                '## 1. Горечь\nОт хмеля. Измеряется в IBU.\n\n'
                '## 2. Сладость\nОт солода. Балансирует горечь.\n\n'
                '## 3. Кислота\nОт дрожжей и ферментации.\n\n'
                '## 4. Умами\nТонкий вкус, создающий полноту.\n\n'
                'Попробуйте определить каждый из этих вкусов в следующем пиве!'
            })
            quiz_data = [
                ('Что создаёт горечь в пиве?',['Солод','Хмель','Дрожжи','Вода'],1,'Хмель содержит альфа-кислоты, которые дают горечь при варке.'),
                ('Что означает IBU?',['International Beer Unit','International Bitterness Units','India Brewing Union','Imperial Bitter Utility'],1,'IBU — International Bitterness Units, шкала горечи пива.'),
                ('Какой вкус даёт солод?',['Горечь','Кислоту','Сладость','Солёность'],2,'Солод — источник сахаров, которые дают сладость.'),
                ('При какой температуре подавать пильзнер?',['0-2°C','4-6°C','8-10°C','12-14°C'],1,'Пильзнер раскрывается при 4-6°C.'),
                ('Efes Pilsener — это:',['Стаут','Эль','Пильзнер','Портер'],2,'Efes Pilsener — классический пильзнер.'),
            ]
            for i, (text, opts, correct, expl) in enumerate(quiz_data):
                QuizQuestion.objects.get_or_create(lesson=lesson, text=text, defaults={
                    'options':opts,'correct_index':correct,'explanation':expl,'order':i+1
                })

        self.stdout.write(self.style.SUCCESS(
            f'Done! {Beer.objects.count()} beers, {FlavorCategory.objects.count()} categories, '
            f'{BeerFlavorNote.objects.count()} notes, {FoodPairing.objects.count()} pairings, '
            f'{SchoolLevel.objects.count()} levels, {Lesson.objects.count()} lessons'
        ))

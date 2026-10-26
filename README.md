# WoW Classic Arena

**Русский** · [English](#english)

Открыть игру: https://switer92.github.io/WoW_Classic_Arena/

## Идея

Арена в духе World of Warcraft Classic (1.12), которая работает прямо в браузере. Бои идут на арене Гурубаши, с колоннами, за которыми можно прятаться. Правила и баланс задаём сами: все цифры открыты и правятся в игре. Цель в том, чтобы управление, камера и ощущение боя были как в оригинале, а классы были сбалансированы без жёстких контрпиков.

## Что есть сейчас

- **Форматы:** 1 на 1 и 2 на 2. Против ботов или с другом по сети: дуэль или вдвоём против двух ботов.
- **Классы:** воин, маг, разбойник, паладин и жрец. У каждого три ветки талантов на 51 очко, как на 60 уровне.
- **Механики боя:** в бою и вне боя, еда и питьё, скрытность, стойки, прерывания и блокировка школы магии. Повторный контроль слабеет, после 60 секунд включается усталость.
- **2 на 2:** смена цели клавишей Tab или щелчком, рамки союзника и противников. Удары по площади задевают всех врагов рядом. Лечение и защита союзника: F2 или щелчок по нему, F1 возвращает на себя.
- **Управление и камера как в WoW:**
  - WASD, Q/E, мышь (ЛКМ, ПКМ, обе кнопки).
  - Поворот 180° в секунду, прыжок по формуле клиента.
  - Плавный зум и вид от первого лица, камера не проходит сквозь колонны.
  - Автобег на Num Lock, шаг на Num /.
- **Цифры урона как в оригинале:** шрифт, всплытие, «толчок» крита, раздвигание, до 4 цифр над целью.
- **Эффекты заклинаний из моделей клиента:** частицы, шлейфы и сетки 107 моделей Spells\*.m2, по формулам клиента: подготовка в руках, снаряд, попадание, ауры.
- **Внешний вид:** модели, комплекты T1, эффекты заклинаний и звуки из клиента WoW, интерфейс в стиле 1.12.
- **Настройки:** две панели по 12 ячеек со своей раскладкой и клавишами, громкость, экран 16:9 или во всё окно.

Боты пока только заглушки, чтобы было с кем драться, пока не набрались живые игроки.

## Сетевая игра

Один создаёт комнату и говорит код, второй вводит код и нажимает «Войти». Связь идёт напрямую между браузерами через PeerJS. Вкладка того, кто создал комнату, должна оставаться открытой и активной.

## Планы

- Комнаты на 4–6 человек: 2 на 2 и 3 на 3 живыми игроками, свободные места занимают боты.
- Устойчивая сеть: переподключение после обрыва, вход в уже идущую игру.
- Баланс по цифрам, без жёстких контрпиков: у каждого класса 45–55% побед.
- Контроль над разумом жреца и другие способности для командных боёв.
- Недостающие эффекты заклинаний, плащи.
- Программа для ПК (отдельное окно без браузера).
- Позже: расовые способности, рейтинг и подбор соперников.

## Права

Модели, текстуры, иконки и звуки принадлежат Blizzard Entertainment и используются только для личного некоммерческого прототипа.

---

<a id="english"></a>

## English

Play: https://switer92.github.io/WoW_Classic_Arena/

### The idea

A World of Warcraft Classic (1.12) style arena that runs right in the browser. Fights take place in the Gurubashi Arena, with pillars to break line of sight. We set the rules and the balance ourselves: every number is open and can be edited in game. The goal is controls, camera and combat feel close to the original, and classes balanced without hard counters.

### What works now

- **Formats:** 1v1 and 2v2. Against bots or with a friend online: a duel, or the two of you against two bots.
- **Classes:** warrior, mage, rogue, paladin and priest. Each has three talent trees with 51 points, like at level 60.
- **Combat:** in combat and out of combat, food and drink, stealth, stances, interrupts with school lockout. Repeated crowd control has diminishing returns, and dampening starts after 60 seconds.
- **2v2:** Tab or click to change target, ally and enemy frames. Area spells hit every enemy nearby. Heals and protection go on your ally after F2 or a click on them; F1 switches back to yourself.
- **WoW-like controls and camera:**
  - WASD, Q/E, mouse (left, right and both buttons).
  - 180° per second turning, jump using the client's physics.
  - Smooth zoom and first-person view, and the camera doesn't pass through pillars.
  - Autorun on Num Lock, walk on Num /.
- **Damage numbers like the original:** font, float, crit pop, spreading apart, up to 4 numbers over a target.
- **Spell effects from the client's models:** particles, ribbons and meshes of 107 Spells\*.m2 models, simulated by the client's formulas: hand precast, missile, impact, auras.
- **Look and feel:** models, T1 sets, spell effects and sounds from the WoW client, 1.12-style interface.
- **Settings:** two 12-slot action bars with your own layout and keybinds, volume, 16:9 or full-window screen.

The bots are only placeholders, so there is someone to fight until real players join.

### Online play

One player creates a room and shares the code, the other enters it and clicks «Войти» (Join). The browsers connect directly through PeerJS. The tab of the player who created the room must stay open and active.

### Plans

- Rooms for 4–6 people: 2v2 and 3v3 with real players, with bots filling empty slots.
- Stable networking: reconnecting after a drop, joining a game in progress.
- Balance by the numbers with no hard counters: every class at a 45–55% win rate.
- Priest Mind Control and other abilities for team fights.
- Missing spell effects and cloaks.
- A desktop app (its own window, no browser).
- Later: racial abilities, rating and matchmaking.

### Rights

Models, textures, icons and sounds belong to Blizzard Entertainment and are used only for a personal non-commercial prototype.

---

Twitch: https://www.twitch.tv/switer92

Discord: https://discord.gg/zERZuZH

Thx for support: [SYNTASY.PRO](https://syntasy.pro/partners/r/p2_42d390b95ee9f6a177601b05)

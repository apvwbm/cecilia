# Genera los iconos de Cecilia: un bocadillo de diálogo (hablar inglés) que se convierte
# en una cara con gafas (estudiar). La misma idea que el gato-"t" de Catffeine: una sola
# figura blanca y plana sobre el color de la app, con las gafas y la sonrisa recortadas.
#
# Uso: python3 scripts/iconos.py  (necesita Pillow)
# Solo hace falta volver a ejecutarlo si cambia el diseño del icono.

import math
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
LADO = 1024
X = 4  # supermuestreo: PIL dibuja sin suavizado, así que se dibuja a 4x y se reduce.
INDIGO = (0x18, 0x00, 0xAD)
BLANCO = (255, 255, 255)

# Las piezas, en coordenadas de un lienzo de 1024 (luego se recentran y escalan).
BOCADILLO = (172, 236, 852, 716)
RADIO_BOCADILLO = 230
OJOS_Y = 462
OJO_R = 112
SEPARACION = 262  # entre centros de los dos aros
GROSOR = 38
PATILLAS_Y = OJOS_Y - 40


def k(*v):
    return [round(a * X) for a in v]


def bezier(p0, p1, p2, p3, n=48):
    puntos = []
    for i in range(n + 1):
        u = i / n
        v = 1 - u
        puntos.append(tuple(v**3 * a + 3 * v * v * u * b + 3 * v * u * u * c + u**3 * d for a, b, c, d in zip(p0, p1, p2, p3)))
    return puntos


def redondo(d, x, y, r, color):
    d.ellipse(k(x - r, y - r, x + r, y + r), fill=color)


def figura() -> Image.Image:
    """La máscara de la figura: 255 = blanco, 0 = fondo."""
    m = Image.new('L', (LADO * X, LADO * X), 0)
    d = ImageDraw.Draw(m)

    # Bocadillo y cola. La cola sale de abajo a la izquierda con los dos lados curvos y
    # acaba en una punta redonda: cada lado termina tangente al círculo de la punta, a un
    # radio a cada lado de su centro. Arranca DENTRO del bocadillo para que no quede costura.
    d.rounded_rectangle(k(*BOCADILLO), radius=RADIO_BOCADILLO * X, fill=255)
    punta, r = (246, 822), 20
    nx, ny = 0.73, 0.68  # normal a la dirección de la cola, que baja hacia la izquierda
    fuera = bezier((300, 640), (296, 720), (276, 770), (punta[0] - nx * r, punta[1] - ny * r))
    dentro = bezier((punta[0] + nx * r, punta[1] + ny * r), (320, 820), (390, 760), (452, 690))
    d.polygon([(round(x * X), round(y * X)) for x, y in fuera + dentro], fill=255)
    redondo(d, punta[0], punta[1], r, 255)

    # Gafas: dos aros, el puente en arco y las patillas hasta salirse del bocadillo.
    izq = LADO / 2 - SEPARACION / 2
    der = LADO / 2 + SEPARACION / 2
    for cx in (izq, der):
        d.ellipse(k(cx - OJO_R, OJOS_Y - OJO_R, cx + OJO_R, OJOS_Y + OJO_R), outline=0, width=GROSOR * X)
    # El puente: un arco suave cuyo círculo comparte centro con los ojos, así sus dos
    # extremos caen dentro del trazo de cada aro y no queda ninguna muesca.
    puente = 54
    d.arc(k(LADO / 2 - puente, OJOS_Y - puente, LADO / 2 + puente, OJOS_Y + puente), 228, 312, fill=0, width=26 * X)
    d.rectangle(k(BOCADILLO[0] - 40, PATILLAS_Y - GROSOR / 2, izq - OJO_R + 6, PATILLAS_Y + GROSOR / 2), fill=0)
    d.rectangle(k(der + OJO_R - 6, PATILLAS_Y - GROSOR / 2, BOCADILLO[2] + 40, PATILLAS_Y + GROSOR / 2), fill=0)

    # Sonrisa, con los extremos redondos.
    caja = (452, 548, 572, 652)
    grosor = 30
    d.arc(k(*caja), 25, 155, fill=0, width=grosor * X)
    cx, cy = (caja[0] + caja[2]) / 2, (caja[1] + caja[3]) / 2
    rx, ry = (caja[2] - caja[0]) / 2 - grosor / 2, (caja[3] - caja[1]) / 2 - grosor / 2
    for angulo in (25, 155):
        a = math.radians(angulo)
        redondo(d, cx + rx * math.cos(a), cy + ry * math.sin(a), grosor / 2, 0)
    return m


def dibujar(nombre: str, fondo, tinta, escala: float):
    """La figura centrada por su caja, con su lado mayor a `escala` del lienzo."""
    m = figura()
    m = m.crop(m.getbbox())
    factor = LADO * escala / max(m.size)
    m = m.resize((round(m.width * factor), round(m.height * factor)), Image.LANCZOS)
    im = Image.new('RGBA', (LADO, LADO), fondo)
    capa = Image.new('RGBA', m.size, tinta)
    im.paste(capa, ((LADO - m.width) // 2, (LADO - m.height) // 2), m)
    if fondo[3] == 255:
        im = im.convert('RGB')
    im.save(RAIZ / 'assets' / 'images' / nombre, optimize=True)


TRANSPARENTE = (0, 0, 0, 0)
dibujar('icon.png', INDIGO + (255,), BLANCO, 0.66)
# Adaptativo de Android: el sistema recorta un círculo del 66 % central, va más pequeño.
dibujar('adaptive-icon.png', TRANSPARENTE, BLANCO, 0.44)
dibujar('monochrome-icon.png', TRANSPARENTE, BLANCO, 0.44)

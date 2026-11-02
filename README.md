# Taller-Tp4-Final

Página publicada: https://franciscoruizfda.github.io/Taller-Tp4-Final/

## Probar con la consola (Arduino)

1. Abrí `arduino/beatmind_consola/beatmind_consola.ino` en el Arduino IDE y subilo a la placa (mismo cableado que `consola_debug.ino`).
2. Cerrá el Monitor Serie del IDE: si queda abierto, la página no puede usar el puerto.
3. Abrí la página publicada en **Chrome o Edge** de computadora (Firefox y Safari no tienen Web Serial).
4. La primera vez, apretá **Ctrl + Alt + C** en el teclado y elegí el puerto del Arduino. Desde ahí la página se conecta sola cada vez que se abre (no hay ningún botón en pantalla).
5. El navegador no deja sonar nada hasta que alguien toca la compu: al empezar cada sesión, apretá **Ctrl + Alt + C** de nuevo (o hacé un clic en la página). Para que suene sin tocar nada, abrí Chrome con `--autoplay-policy=no-user-gesture-required`.

| Control | Qué hace |
|---|---|
| B1 ▶\| / B3 \|◀ | Siguiente / anterior |
| B8 ▶ / B2 ❚❚ | Play / pausa |
| B6 verde agua, B7 violeta, B5 amarillo, B4 gris | Opciones de colores y estilos del núcleo 3 (1.ª a 4.ª) |
| F1 / F2 / F3 | Volumen de batería / bajo / melodía en las mezclas |
| Joystick izquierda/derecha | Velocidad (BPM) en el paso Velocidad |

Sin consola, todo funciona igual con el mouse y el teclado (flechas, espacio, N, 0, 1 a 4).

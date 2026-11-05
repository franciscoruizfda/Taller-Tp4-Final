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
| B5 ▶ / B6 ❚❚ | Play / pausa |
| B8 azul, B2 violeta, B4 verde, B7 gris (de izquierda a derecha) | Elegir canción (núcleo 2) y opciones o estilos del núcleo 3 (1.ª a 4.ª) |
| Faders (2 filas, como en pantalla) | Núcleo 2: voz, bajo, melodía y batería. Núcleo 3 (Equilibrio): bombo, hi-hat, bajo y melodía |
| Joystick izquierda/derecha | Velocidad (BPM) en el paso Velocidad |

Los faders van en A5 (F1), A2 (F2), A0 (F3) y A1 (F4); el joystick en A3/A4. Mientras se mueve un fader, los otros se ignoran hasta que quede quieto (`BLOQUEO` en el sketch). Si un fader no está cableado, poné su valor en `false` en `conectadoF`, porque un pin suelto mueve el riel en pantalla solo.

Los códigos de los botones están en tres lugares que tienen que coincidir: `mensajesB` del sketch, `BOTONES` en `js/consola.js` y los `data-control` del dibujo de la consola en `index.html`.

Sin consola, todo funciona igual con el mouse y el teclado (flechas, espacio, N, 0, 1 a 4).

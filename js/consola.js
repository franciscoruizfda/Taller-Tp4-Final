/* Beatmind · Consola física (Arduino) por USB, con Web Serial.
   El Arduino (arduino/beatmind_consola) manda una línea por cada cosa que pasa:
     "B1" … "B8"  se apretó un botón       "BJ"     se apretó el joystick
     "F1:57"      un fader, de 0 a 100     "J:x,y"  el joystick, de -100 a 100 por eje
   Web Serial solo anda en Chrome o Edge de computadora, y con la página en https (GitHub Pages) o en localhost. */

const Consola = (() => {
  const BAUDIOS = 115200; // tiene que coincidir con Serial.begin() del Arduino

  // Qué hace cada botón, según el dibujo de la consola.
  const BOTONES = {
    B1: () => avanzar(1), // ▶| siguiente
    B3: () => avanzar(-1), // |◀ anterior
    B8: () => transporte("play"),
    B2: () => transporte("pausa"),
    B6: () => color(1), // verde agua: 1.ª canción / opción azul / 1.er estilo
    B7: () => color(2), // violeta
    B5: () => color(3), // amarillo: opción verde
    B4: () => color(4), // gris: 4.ª canción / 4.º estilo
  };

  /* Los 4 faders están en dos filas, igual que los rieles en pantalla y con sus mismos colores:
       F1 arriba izquierda (verde)    F3 arriba derecha (azul)
       F2 abajo izquierda (violeta)   F4 abajo derecha (celeste)
     Si al probar un fader mueve otro riel, alcanza con cambiar el orden acá. */
  const FADERS = { F1: 0, F3: 1, F2: 2, F4: 3 }; // posición: 0 arriba izq, 1 arriba der, 2 abajo izq, 3 abajo der
  const STEMS = ["voz", "bajo", "melodia", "bateria"]; // núcleo 2, la canción
  const CANALES_EQUILIBRIO = ["bombo", "hihat", "bajo", "melodia"]; // núcleo 3, paso Equilibrio

  const BPM_POR_SEGUNDO = 20; // con el joystick a fondo
  const CADA = 100; // ms entre cada empujón del joystick a la perilla

  let puerto = null;
  let joyX = 0;
  let bpmAcumulado = 0;
  let abriendo = false;

  // ---------- Acciones ----------

  function color(n) {
    if (actual === "selecciona") elegirCancion(n);
    else if (Nucleo3.maneja(actual)) Nucleo3.teclaOpcion(String(n));
  }

  function apretar(nombre) {
    // En el inicio y el cierre cualquier botón sirve para empezar, como cualquier tecla.
    if ((actual === "inicio" || actual === "cierre") && nombre !== "B3") {
      ir(actual === "inicio" ? "carga" : "inicio");
      return;
    }
    if (actual === "carga") return;
    // En el tutorial cualquier botón sigue, salvo el de volver.
    if (TUTORIAL.includes(actual)) {
      avanzar(nombre === "B3" ? -1 : 1);
      return;
    }
    BOTONES[nombre]?.();
  }

  function moverFader(nombre, porcentaje) {
    const posicion = FADERS[nombre];
    if (posicion === undefined) return;
    if (actual === "cancion") Nucleo2.ajustar(STEMS[posicion], porcentaje / 100);
    else if (actual === "crea-equilibrio") Nucleo3.ajustarVolumen([CANALES_EQUILIBRIO[posicion]], porcentaje);
  }

  // Joystick a la derecha acelera y a la izquierda frena, mientras se lo mantenga.
  setInterval(() => {
    if (actual !== "crea-velocidad" || !joyX) {
      bpmAcumulado = 0;
      return;
    }
    bpmAcumulado += (joyX / 100) * BPM_POR_SEGUNDO * (CADA / 1000);
    const entero = Math.trunc(bpmAcumulado);
    if (entero) {
      bpmAcumulado -= entero;
      Nucleo3.sumarBpm(entero);
    }
  }, CADA);

  function procesar(linea) {
    let m;
    if ((m = /^B([1-8J])$/.exec(linea))) apretar(`B${m[1]}`);
    else if ((m = /^(F[1-4]):(\d+)$/.exec(linea))) moverFader(m[1], Number(m[2]));
    else if ((m = /^J:(-?\d+),(-?\d+)$/.exec(linea))) joyX = Number(m[1]);
  }

  // ---------- Conexión ----------

  async function conectar(elegido) {
    if (puerto || abriendo) return;
    abriendo = true;
    try {
      await elegido.open({ baudRate: BAUDIOS });
      puerto = elegido;
      console.info("Beatmind: consola conectada.");
      leer();
    } catch (error) {
      console.warn("Beatmind: no se pudo abrir la consola. ¿Está abierto el Monitor Serie del Arduino?", error);
    } finally {
      abriendo = false;
    }
  }

  async function leer() {
    const decodificador = new TextDecoderStream();
    const tuberia = puerto.readable.pipeTo(decodificador.writable).catch(() => {});
    const lector = decodificador.readable.getReader();
    let resto = "";
    try {
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        const lineas = (resto + value).split("\n");
        resto = lineas.pop();
        lineas.forEach((l) => procesar(l.trim()));
      }
    } catch {
      // Se desenchufó el Arduino.
    } finally {
      lector.releaseLock();
      await tuberia;
      await puerto.close().catch(() => {});
      puerto = null;
      joyX = 0;
    }
  }

  // Un Arduino ya autorizado en esta compu se conecta solo, sin que nadie toque nada.
  async function conectarConocido() {
    const [conocido] = await navigator.serial.getPorts();
    if (conocido) conectar(conocido);
  }

  // La primera vez el navegador exige que una persona elija el puerto: Ctrl + Alt + C (de «consola»).
  async function elegirPuerto(e) {
    if (!(e.ctrlKey && e.altKey && e.code === "KeyC")) return;
    e.preventDefault();
    if (puerto) return;
    try {
      conectar(await navigator.serial.requestPort());
    } catch {
      // Se cerró la ventana sin elegir.
    }
  }

  if ("serial" in navigator) {
    conectarConocido();
    document.addEventListener("keydown", elegirPuerto);
    // Si se vuelve a enchufar el Arduino, se reconecta solo.
    navigator.serial.addEventListener("connect", (e) => conectar(e.target));
  } else {
    console.info("Beatmind: este navegador no tiene Web Serial; para usar la consola abrí la página en Chrome o Edge.");
  }

  return {
    get conectada() { return Boolean(puerto); },
  };
})();

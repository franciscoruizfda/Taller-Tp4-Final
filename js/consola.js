/* Beatmind · Consola física (Arduino) por USB, con Web Serial.
   El Arduino (arduino/beatmind_consola) manda una línea por cada cosa que pasa:
     "B1" … "B8"  se apretó un botón       "BJ"     se apretó el joystick
     "F1:57"      un fader, de 0 a 100     "J:x,y"  el joystick, de -100 a 100 por eje
   Web Serial solo anda en Chrome o Edge de computadora, y con la página en https (GitHub Pages) o en localhost. */

const Consola = (() => {
  const BAUDIOS = 115200; // tiene que coincidir con Serial.begin() del Arduino

  /* Qué hace cada botón de la consola física. El código es el que manda el Arduino
     (mensajesB en arduino/beatmind_consola); la fila de colores va de izquierda a derecha:
       B3 |◀ atrás                                   B1 ▶| siguiente
       B8 azul    B2 violeta    B4 verde    B7 gris
       B5 ❚❚ pausa                                   B6 ▶ play
     Si cambia un código, cambialo también en el dibujo de la consola (data-control en index.html). */
  const BOTONES = {
    B1: () => avanzar(1), // ▶| siguiente
    B3: () => avanzar(-1), // |◀ anterior
    B6: () => transporte("play"),
    B5: () => transporte("pausa"),
    B8: () => color(1), // azul: 1.ª canción / opción azul / 1.er estilo
    B2: () => color(2), // violeta
    B4: () => color(3), // verde: opción verde
    B7: () => color(4), // gris: 4.ª canción / 4.º estilo
  };

  /* Los 4 faders están en dos filas, igual que los rieles en pantalla y con sus mismos colores:
       F1 arriba izquierda (verde)    F2 arriba derecha (azul)
       F3 abajo izquierda (violeta)   F4 abajo derecha (celeste)
     Si al probar un fader mueve otro riel, alcanza con cambiar el orden acá. */
  const FADERS = { F1: 0, F2: 1, F3: 2, F4: 3 }; // posición: 0 arriba izq, 1 arriba der, 2 abajo izq, 3 abajo der
  const STEMS = ["voz", "bajo", "melodia", "bateria"]; // núcleo 2, la canción
  const CANALES_EQUILIBRIO = ["bombo", "hihat", "bajo", "melodia"]; // núcleo 3, paso Equilibrio

  const BPM_POR_SEGUNDO = 20; // con el joystick a fondo
  const CADA = 100; // ms entre cada empujón del joystick a la perilla

  let puerto = null;
  let joyX = 0;
  let bpmAcumulado = 0;
  let abriendo = false;
  const ESPERA_TUTORIAL = 450; // ms que se ve la luz del botón antes de pasar de pantalla
  let esperandoAvance = false;
  const apagados = new Map(); // luz → temporizador que la apaga

  // ---------- Acciones ----------

  function color(n) {
    if (botonDeColor(n)) return;
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
    // En el tutorial los botones solo se iluminan en el dibujo, para probarlos;
    // de pantalla se pasa únicamente con siguiente (B1) y anterior (B3).
    if (TUTORIAL.includes(actual)) {
      const iluminado = iluminar(nombre);
      if (nombre !== "B1" && nombre !== "B3") return;
      if (esperandoAvance) return;
      const desde = actual;
      const direccion = nombre === "B3" ? -1 : 1;
      if (!iluminado) {
        avanzar(direccion);
        return;
      }
      esperandoAvance = true;
      setTimeout(() => {
        esperandoAvance = false;
        if (actual === desde) avanzar(direccion);
      }, ESPERA_TUTORIAL);
      return;
    }
    BOTONES[nombre]?.();
  }

  // Enciende las luces del control tocado en la consola dibujada del tutorial.
  function iluminar(control, duracion = ESPERA_TUTORIAL) {
    const luces = document.querySelectorAll(`#${actual} [data-control~="${control}"]`);
    luces.forEach((luz) => {
      luz.classList.add("tocada");
      clearTimeout(apagados.get(luz));
      apagados.set(luz, setTimeout(() => luz.classList.remove("tocada"), duracion));
    });
    return luces.length > 0;
  }

  // El joystick en el tutorial: su luz se enciende y se corre hacia donde se lo inclina.
  function moverJoystick(x, y) {
    joyX = x;
    // En «¿Qué es un beat?» el joystick a un lado elige esa tarjeta y la hace sonar.
    // El analógico dibujado se inclina hacia donde se mueve el de la consola.
    if (actual === "que-es") {
      document.querySelector("#que-es .palanca img").style.translate = `${x * 0.2}px ${-y * 0.2}px`;
      if (Math.abs(x) >= 60) elegirTarjetaBeat(x < 0 ? "pulso" : "instrumental");
    }
    if (!TUTORIAL.includes(actual)) return;
    document.querySelectorAll(`#${actual} [data-control~="J"]`).forEach((luz) => {
      luz.style.translate = `${x * 0.15}px ${-y * 0.15}px`;
    });
    if (x || y) iluminar("J", 600);
  }

  function moverFader(nombre, porcentaje) {
    if (TUTORIAL.includes(actual)) {
      iluminar(nombre, 600);
      return;
    }
    const posicion = FADERS[nombre];
    if (posicion === undefined) return;
    // En la mezcla del núcleo 1 los faders están en fila: F1 el de la izquierda … F4 el de la derecha.
    if (actual === "mezcla") moverFaderMezcla(Number(nombre[1]) - 1, porcentaje / 100);
    else if (actual === "cancion") Nucleo2.ajustar(STEMS[posicion], porcentaje / 100);
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
    else if ((m = /^J:(-?\d+),(-?\d+)$/.exec(linea))) moverJoystick(Number(m[1]), Number(m[2]));
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

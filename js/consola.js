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
    B6: () => color(1), // verde agua: opción azul / 1.er estilo
    B7: () => color(2), // violeta
    B5: () => color(3), // amarillo: opción verde
    B4: () => color(4), // gris: 4.º estilo
  };

  // Los mismos 3 canales en todas las mezclas: F1 batería, F2 bajo, F3 melodía.
  const FADERS = { F1: "bateria", F2: "bajo", F3: "melodia" };
  const CANALES_EQUILIBRIO = { bateria: ["bombo", "hihat"], bajo: ["bajo"], melodia: ["melodia"] };

  const BPM_POR_SEGUNDO = 20; // con el joystick a fondo
  const CADA = 100; // ms entre cada empujón del joystick a la perilla

  let puerto = null;
  let joyX = 0;
  let bpmAcumulado = 0;
  let boton = null;

  // ---------- Acciones ----------

  function color(n) {
    if (Nucleo3.maneja(actual)) Nucleo3.teclaOpcion(String(n));
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
    const canal = FADERS[nombre];
    if (!canal) return;
    if (actual === "mezcla") moverFaderMezcla(canal, porcentaje / 100);
    else if (actual === "cancion") Nucleo2.ajustar(canal, porcentaje / 100);
    else if (actual === "crea-equilibrio") Nucleo3.ajustarVolumen(CANALES_EQUILIBRIO[canal], porcentaje);
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
    else if ((m = /^(F[1-3]):(\d+)$/.exec(linea))) moverFader(m[1], Number(m[2]));
    else if ((m = /^J:(-?\d+),(-?\d+)$/.exec(linea))) joyX = Number(m[1]);
  }

  // ---------- Conexión ----------

  async function conectar(elegido) {
    try {
      await elegido.open({ baudRate: BAUDIOS });
    } catch (error) {
      console.warn("Beatmind: no se pudo abrir la consola. ¿Está abierto el Monitor Serie del Arduino?", error);
      return;
    }
    puerto = elegido;
    pintarBoton();
    leer();
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
      pintarBoton();
    }
  }

  // El clic en este botón también habilita el sonido (el navegador no deja sonar sin un clic o una tecla).
  async function alClic() {
    boton.blur();
    const [conocido] = await navigator.serial.getPorts();
    if (conocido) {
      conectar(conocido);
      return;
    }
    try {
      conectar(await navigator.serial.requestPort());
    } catch {
      // Se cerró la ventana sin elegir.
    }
  }

  async function pintarBoton() {
    const conocido = (await navigator.serial.getPorts()).length > 0;
    boton.hidden = Boolean(puerto);
    boton.textContent = conocido ? "Activar consola" : "Conectar consola";
  }

  if ("serial" in navigator) {
    boton = document.createElement("button");
    boton.className = "conectar-consola";
    boton.addEventListener("click", alClic);
    document.body.append(boton);
    pintarBoton();
    // Si se vuelve a enchufar un Arduino que ya se había elegido, se reconecta solo.
    navigator.serial.addEventListener("connect", (e) => { if (!puerto) conectar(e.target); });
  } else {
    console.info("Beatmind: este navegador no tiene Web Serial; para usar la consola abrí la página en Chrome o Edge.");
  }

  return {
    get conectada() { return Boolean(puerto); },
  };
})();

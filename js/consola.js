/* DM-BEAT · Consola física: qué hace cada control.
   La consola tiene un analógico, dos botones laterales (avanzar / volver), 4 botones de color,
   4 faders y play / pausa. Los botones y faders ya conectados llegan del Arduino por Web Serial
   (ver arduino/consola_dmbeat); lo que falta conectar (analógico, F3, F4) se prueba con el teclado. */

const Consola = (() => {
  // Teclas para probar sin el Arduino (y para lo que todavía no está conectado).
  const TECLAS = {
    avanzar: ",",
    retroceder: "m",
    // Botones de color de izquierda a derecha. El violeta todavía no tiene tecla.
    colores: [".", null, "8", "F12"],
    // Por ahora el analógico se prueba con las flechas y Enter.
    analogo: { ArrowLeft: "izquierda", ArrowRight: "derecha", ArrowUp: "arriba", ArrowDown: "abajo" },
    presionar: "Enter",
    play: null,
    pausa: null,
  };

  // Mismo orden que los botones físicos; cada pantalla marca sus botones con data-color.
  const COLORES = ["azul", "violeta", "verde", "gris"];

  // Faders físicos de izquierda a derecha y de arriba abajo, igual que en la consola.
  const FADERS = ["voz", "bajo", "melodia", "bateria"];

  const tecla = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);

  // Traduce una tecla a una acción de la consola, o null si no es de la consola.
  function leer(e) {
    const t = tecla(e);
    if (t === TECLAS.avanzar) return { tipo: "avanzar" };
    if (t === TECLAS.retroceder) return { tipo: "retroceder" };
    const color = TECLAS.colores.indexOf(e.key);
    if (color !== -1) return { tipo: "color", indice: color, color: COLORES[color] };
    if (TECLAS.analogo[e.key]) return { tipo: "mover", direccion: TECLAS.analogo[e.key] };
    if (e.key === TECLAS.presionar) return { tipo: "presionar" };
    if (TECLAS.play && t === TECLAS.play) return { tipo: "play" };
    if (TECLAS.pausa && t === TECLAS.pausa) return { tipo: "pausa" };
    return null;
  }

  // ---------- Faders ----------
  // Las pantallas con faders se suscriben; el mouse sigue funcionando sobre los faders en pantalla.

  const oyentes = new Set();

  function alMoverFader(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  // valor de 0 a 1. Lo llama la lectura del Arduino (o la consola del navegador para probar: Consola.moverFader("voz", .5)).
  function moverFader(nombre, valor) {
    if (!FADERS.includes(nombre)) return;
    const v = Math.min(1, Math.max(0, valor));
    oyentes.forEach((fn) => fn(nombre, v));
  }

  // ---------- Arduino por Web Serial ----------
  /* El sketch arduino/consola_dmbeat manda una línea por evento:
       "B3"     botón apretado (B1 a B8)
       "F1:57"  fader movido, posición de 0 a 100
       "# ..."  comentarios para el Monitor Serie (se ignoran) */

  const COLOR = (color) => ({ tipo: "color", indice: COLORES.indexOf(color), color });
  const BOTONES = {
    B1: { tipo: "retroceder" },
    B2: COLOR("azul"),
    B3: { tipo: "avanzar" },
    B4: COLOR("verde"),
    B5: COLOR("violeta"),
    B6: { tipo: "pausa" },
    B7: COLOR("gris"),
    B8: { tipo: "play" },
  };
  // F1 y F2 son los de arriba (izquierda y derecha); F3 y F4, los de abajo, todavía sin conectar.
  const FADERS_ARDUINO = { F1: "voz", F2: "bajo", F3: "melodia", F4: "bateria" };
  const BAUDIOS = 115200; // igual que Serial.begin() en el sketch

  const oyentesAccion = new Set();

  // main.js se suscribe para recibir los botones del Arduino como si fueran teclas.
  function alAccion(fn) {
    oyentesAccion.add(fn);
  }

  function leerLinea(linea) {
    const texto = linea.trim();
    if (!texto || texto.startsWith("#")) return;
    const [nombre, numero] = texto.split(":");
    if (BOTONES[nombre]) oyentesAccion.forEach((fn) => fn(BOTONES[nombre]));
    else if (FADERS_ARDUINO[nombre] && numero !== undefined) moverFader(FADERS_ARDUINO[nombre], Number(numero) / 100);
  }

  let puertoAbierto = null;

  async function escucharPuerto(puerto) {
    if (puertoAbierto) return;
    await puerto.open({ baudRate: BAUDIOS });
    puertoAbierto = puerto;
    console.info("DM-BEAT: consola conectada.");
    const lector = puerto.readable.pipeThrough(new TextDecoderStream()).getReader();
    let resto = "";
    try {
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += value;
        const lineas = resto.split(/\r?\n/);
        resto = lineas.pop();
        lineas.forEach(leerLinea);
      }
    } catch (error) {
      console.warn("DM-BEAT: se cortó la consola.", error.message);
    } finally {
      lector.releaseLock();
      await puerto.close().catch(() => {});
      puertoAbierto = null;
    }
  }

  // La primera vez Chrome pide elegir el puerto (hace falta una tecla o un clic: en main.js es la C).
  async function conectarSerial() {
    if (!("serial" in navigator)) throw new Error("Este navegador no tiene Web Serial: abrir la experiencia en Chrome.");
    if (puertoAbierto) return;
    escucharPuerto(await navigator.serial.requestPort());
  }

  // Con un puerto ya autorizado, se conecta solo al abrir la página y cada vez que se enchufa el Arduino.
  if ("serial" in navigator) {
    navigator.serial.getPorts().then(([puerto]) => puerto && escucharPuerto(puerto)).catch(() => {});
    navigator.serial.addEventListener("connect", (e) => escucharPuerto(e.target).catch(() => {}));
  }

  // ---------- Analógico ----------
  // Una pantalla puede registrar qué hace el analógico: { mover(direccion), presionar() }.
  // Si no devuelve true, se usa el comportamiento por defecto: recorrer sus [data-analogo].

  const manejadores = {};

  function registrarAnalogo(pantalla, manejador) {
    manejadores[pantalla] = manejador;
  }

  function analogo(pantalla, accion) {
    const m = manejadores[pantalla];
    if (accion.tipo === "mover" && m?.mover?.(accion.direccion)) return true;
    if (accion.tipo === "presionar" && m?.presionar?.()) return true;
    return recorrer(document.getElementById(pantalla), accion);
  }

  // Por defecto: izquierda/arriba elige el anterior, derecha/abajo el siguiente, presionar lo toca.
  function recorrer(raiz, accion) {
    const opciones = [...raiz.querySelectorAll("[data-analogo]")].filter((el) => !el.disabled && el.offsetParent);
    if (!opciones.length) return false;
    let i = opciones.findIndex((el) => el.classList.contains("elegido"));
    if (accion.tipo === "presionar") {
      (opciones[i] || opciones[0]).click();
      return true;
    }
    const paso = accion.direccion === "izquierda" || accion.direccion === "arriba" ? -1 : 1;
    i = i === -1 ? (paso > 0 ? 0 : opciones.length - 1) : (i + paso + opciones.length) % opciones.length;
    elegir(raiz, opciones[i]);
    return true;
  }

  function elegir(raiz, el) {
    raiz.querySelectorAll("[data-analogo].elegido").forEach((o) => o.classList.remove("elegido"));
    el?.classList.add("elegido");
  }

  return { TECLAS, COLORES, FADERS, leer, alAccion, leerLinea, alMoverFader, moverFader, conectarSerial, registrarAnalogo, analogo, elegir };
})();

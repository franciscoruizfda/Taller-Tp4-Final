/* DM-BEAT · Consola física: qué tecla manda cada control y cómo llegan los faders.
   La consola tiene un analógico, dos botones laterales (avanzar / volver), 4 botones de color,
   4 faders y play / pausa. El Arduino emula un teclado; los faders llegarán por Web Serial. */

const Consola = (() => {
  // Teclas que manda el Arduino. Cuando cambie el cableado, se toca solo esto.
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

  // valor de 0 a 1. Lo llama la lectura por Web Serial (o la consola del navegador para probar).
  function moverFader(nombre, valor) {
    if (!FADERS.includes(nombre)) return;
    const v = Math.min(1, Math.max(0, valor));
    oyentes.forEach((fn) => fn(nombre, v));
  }

  // Web Serial: el Arduino manda una línea por cambio, por ejemplo "voz:512" (0 a 1023).
  // Chrome pide un clic para elegir el puerto, así que hay que llamarla desde un botón.
  // Pendiente de probar con el Arduino real: ajustar el formato si manda otra cosa.
  async function conectarSerial({ baudios = 9600, maximo = 1023 } = {}) {
    if (!("serial" in navigator)) throw new Error("Este navegador no tiene Web Serial (usar Chrome).");
    const puerto = await navigator.serial.requestPort();
    await puerto.open({ baudRate: baudios });
    const lector = puerto.readable.pipeThrough(new TextDecoderStream()).getReader();
    let resto = "";
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      resto += value;
      const lineas = resto.split(/\r?\n/);
      resto = lineas.pop();
      for (const linea of lineas) {
        const [nombre, numero] = linea.trim().split(":");
        if (numero !== undefined) moverFader(nombre, Number(numero) / maximo);
      }
    }
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

  return { TECLAS, COLORES, FADERS, leer, alMoverFader, moverFader, conectarSerial, registrarAnalogo, analogo, elegir };
})();

/* Beatmind · Núcleo 1: navegación entre pantallas e interacción de las capas del beat. */

const TUTORIAL = ["tutorial-1", "tutorial-2", "tutorial-3", "tutorial-4", "tutorial-5"];
const PANTALLAS = [
  "inicio", "carga", ...TUTORIAL, "que-es",
  "percusion", "bajo", "melodia", "estructura", "mezcla",
  "fl-studio", "bizarrap",
  "modifica", "selecciona", "cancion",
  ...Nucleo3.PANTALLAS,
  "cierre",
];
const DURACION_CARGA = 2800;
const CAPAS = ["percusion", "bajo", "melodia", "estructura", "mezcla"];

const stage = document.getElementById("stage");
let actual = null;
let timerCarga = 0;

// ---------- Datos de las capas (posiciones tomadas del Figma) ----------

const FILAS_PERCUSION = ["kick", "snare", "hihat", "clap"];
const NOMBRES_PERCUSION = ["KICK", "SNARE", "HI-HAT", "CLAP"];
const patron = [
  [1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
];

// x y w en píxeles dentro de la pista; la posición horizontal es el tiempo dentro del compás.
const ROLLOS = {
  bajo: {
    ancho: 827,
    anchoPista: 870,
    instrumento: "bajo",
    canal: "bajo",
    filas: [
      { top: 0, alto: 67.7, frecuencia: 98.0 },   // Sol
      { top: 73.96, alto: 67.7, frecuencia: 77.78 }, // Mi bemol
      { top: 147.93, alto: 67.7, frecuencia: 65.41 }, // Do
    ],
    notas: [
      { fila: 0, x: 0, w: 220 },
      { fila: 2, x: 220, w: 220 },
      { fila: 1, x: 440, w: 135 },
      { fila: 0, x: 575, w: 252 },
    ],
  },
  melodia: {
    ancho: 786,
    instrumento: "teclas",
    canal: "melodia",
    filas: [
      { top: 0, alto: 59.34, frecuencia: 659.25, ancho: 786 }, // Mi
      { top: 63, alto: 54.81, frecuencia: 587.33, ancho: 765 }, // Re
      { top: 121.8, alto: 55.17, frecuencia: 523.25, ancho: 786 }, // Do
      { top: 180.46, alto: 54.81, frecuencia: 440.0, ancho: 765 }, // La
      { top: 239.43, alto: 54.13, frecuencia: 392.0, ancho: 786 }, // Sol
    ],
    notas: [
      { fila: 0, x: 0, w: 351 },
      { fila: 2, x: 0, w: 210 },
      { fila: 2, x: 351, w: 210 },
      { fila: 4, x: 351, w: 210 },
      { fila: 1, x: 561, w: 225 },
      { fila: 3, x: 561, w: 225 },
    ],
  },
};

// Mezcla: faders horizontales en dos filas, con el orden y los colores de los de la consola
// (F1 arriba izquierda, F2 arriba derecha, F3 abajo izquierda, F4 abajo derecha). Posiciones del Figma:
// circulo y riel: [left, top, ancho, alto]; ico: [left, top, ancho, alto] dentro del círculo; perilla: [ancho, alto].
const CANALES_MEZCLA = [
  { canal: "melodia", nombre: "Melodía", color: "#00ff89", icono: "mix-music.png",
    circulo: [870, 587, 67.395, 69.51], ico: [5.99, 6.47, 53.916, 54.961], riel: [953.87, 614.79, 274.13, 14.184], perilla: [60.235, 26.749], valor: 144.575 / 274.13 },
  { canal: "general", nombre: "Volumen general", color: "#0084ff", icono: "mix-audio.png",
    circulo: [1289, 583, 61.441, 64], ico: [9.56, 10.42, 40.961, 43.163], riel: [1364.09, 609.5, 249.909, 11.872], perilla: [54.913, 24.629], valor: 210.54 / 249.909 },
  { canal: "bajo", nombre: "Bajo", color: "#675180", icono: "mix-guitar.png",
    circulo: [870, 701.72, 68.901, 72.189], ico: [7.66, 6.71, 53.59, 57.08], riel: [955.74, 731.42, 280.255, 13.391], perilla: [61.581, 27.78], valor: 94.058 / 280.255 },
  { canal: "bateria", nombre: "Batería", color: "#9ec5f4", icono: "mix-drums.png",
    circulo: [1289, 702, 59.361, 62], ico: [7.92, 8.65, 43.532, 44.698], riel: [1361.55, 728.29, 241.452, 12.651], perilla: [53.054, 23.859], valor: 143.879 / 241.452 },
];

const ONDAS = {
  chica: {
    x: [0, 19, 38, 56, 75, 94, 113, 132, 151],
    ancho: [10, 10, 9, 10, 10, 10, 10, 10, 10],
    alto: [19, 31, 35, 49, 19, 61, 45, 75, 26],
  },
  grande: {
    x: [0, 57, 114, 167, 224, 281, 338, 394, 451],
    ancho: [30, 30, 27, 30, 30, 30, 30, 30, 30],
    alto: [56, 92, 104, 146, 56, 182, 134, 224, 77],
  },
  mini: {
    x: [0, 9.64, 19.27, 28.23, 37.87, 47.51, 57.14, 66.61, 76.25],
    ancho: [5.07, 5.07, 4.57, 5.07, 5.07, 5.07, 5.07, 5.07, 5.07],
    alto: [9.47, 15.55, 17.58, 24.68, 9.47, 30.77, 22.65, 37.87, 13.02],
  },
};
const COLORES_ONDA = ["#e678eb", "#e678eb", "#e678eb", "#787eeb", "#787eeb", "#787eeb", "#00ff89", "#00ff89", "#00ff89"];

// ---------- Armado del DOM ----------

function montarPlantillas() {
  const nav = document.getElementById("tpl-nav");
  document.querySelectorAll("[data-nav]").forEach((el) => el.replaceWith(nav.content.cloneNode(true)));
  document.querySelectorAll(".screen").forEach((s) => {
    const seccion = s.dataset.seccion || "inicio";
    s.querySelectorAll(".nav-link").forEach((l) => l.classList.toggle("activo", l.dataset.seccion === seccion));
  });

  // Las 5 rayitas de avance del tutorial y de las capas del núcleo 1.
  document.querySelectorAll("[data-progreso]").forEach((el) => {
    const hechas = Number(el.dataset.progreso);
    el.innerHTML = TUTORIAL.map((_, i) => `<i class="${i < hechas ? "hecho" : ""}" style="left:${i * 105.25}px"></i>`).join("");
  });

  // Dibujo de la consola de los tutoriales 1 y 2, con sus luces.
  const consola = document.getElementById("tpl-consola-tutorial");
  document.querySelectorAll("[data-consola]").forEach((el) => el.append(consola.content.cloneNode(true)));
}

function armarTitulos() {
  document.querySelectorAll(".apilado").forEach((el) => {
    const contenido = el.innerHTML;
    const capas = (el.dataset.capas || "").split(",").map((s) => s.trim()).filter(Boolean);
    const frente = el.dataset.frente ? ` style="color:${el.dataset.frente}"` : "";
    el.innerHTML =
      capas.map((capa) => {
        const [color, desplazamiento] = capa.split(/\s+/);
        return `<span class="capa-color" aria-hidden="true" style="top:${desplazamiento}px;color:${color}">${contenido}</span>`;
      }).join("") +
      `<span class="frente"${frente}>${contenido}</span>`;
  });
}

function armarOndas() {
  document.querySelectorAll("[data-onda]").forEach((el) => {
    const onda = ONDAS[el.dataset.onda];
    const maximo = Math.max(...onda.alto);
    el.setAttribute("aria-hidden", "true");
    el.style.width = `${onda.x.at(-1) + onda.ancho.at(-1)}px`;
    el.style.height = `${maximo}px`;
    el.innerHTML = onda.x.map((x, i) =>
      `<i style="--c:${COLORES_ONDA[i]};left:${x}px;top:${(maximo - onda.alto[i]) / 2}px;` +
      `width:${onda.ancho[i]}px;height:${onda.alto[i]}px;animation-delay:${-i * 0.23}s"></i>`
    ).join("");
  });
}

function armarParlantes() {
  const piezas = [
    ["parlante-chico-glow.svg", 125.5, 87.5, 89],
    ["parlante-chico.svg", 139, 101, 62],
    ["parlante-grande.svg", 122, 290, 96],
    ["parlante-grande-glow.svg", 113.4, 281.4, 113.2],
    ["parlante-aro-chico.svg", 104, 66, 132],
    ["parlante-aro-grande.svg", 68, 236, 204],
    ["parlante-aro-chico-glow.svg", 94.9, 56.9, 150.2],
    ["parlante-aro-grande-glow.svg", 58.9, 226.9, 222.2],
  ];
  document.querySelectorAll(".parlante").forEach((el) => {
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span class="marco"></span>` + piezas.map(([archivo, x, y, lado]) =>
      `<img class="a" src="assets/${archivo}" alt="" style="left:${x}px;top:${y}px;width:${lado}px;height:${lado}px;max-width:none">`
    ).join("");
  });
}

function armarSecuenciador() {
  const grilla = document.querySelector("#percusion .secuenciador");
  grilla.innerHTML = "";
  for (let paso = 0; paso < 12; paso++) {
    patron.forEach((fila, f) => {
      const celda = document.createElement("button");
      celda.className = "celda";
      celda.style.gridRow = f + 1;
      celda.style.gridColumn = paso + 1;
      celda.dataset.fila = f;
      celda.dataset.columna = paso; // no usar data-paso: es el atributo de las flechas anterior/siguiente
      celda.setAttribute("aria-label", `${NOMBRES_PERCUSION[f]}, paso ${paso + 1}`);
      grilla.append(celda);
    });
  }
  grilla.addEventListener("click", (e) => {
    const celda = e.target.closest(".celda");
    if (!celda) return;
    const { fila, columna } = celda.dataset;
    patron[fila][columna] = patron[fila][columna] ? 0 : 1;
    if (patron[fila][columna] && !Sonido.sonando) Sonido.tocar(FILAS_PERCUSION[fila], "bateria");
    pintarSecuenciador();
  });
  pintarSecuenciador();
}

function pintarSecuenciador() {
  document.querySelectorAll("#percusion .celda").forEach((celda) => {
    const on = patron[celda.dataset.fila][celda.dataset.columna] === 1;
    celda.classList.toggle("on", on);
    celda.setAttribute("aria-pressed", on);
  });
}

function marcarPaso(paso) {
  document.querySelectorAll("#percusion .celda").forEach((celda) => {
    celda.classList.toggle("paso-actual", Number(celda.dataset.columna) === paso);
  });
}

function armarRollos() {
  document.querySelectorAll("[data-rollo]").forEach((el) => {
    const rollo = ROLLOS[el.dataset.rollo];
    const ultima = rollo.filas.at(-1);
    const alto = ultima.top + ultima.alto;
    const anchoPista = (f) => f.ancho || rollo.anchoPista || rollo.ancho;
    el.style.width = `${Math.max(...rollo.filas.map(anchoPista))}px`;
    el.style.height = `${alto}px`;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      rollo.filas.map((f) => `<div class="pista" style="top:${f.top}px;width:${anchoPista(f)}px;height:${f.alto}px"></div>`).join("") +
      rollo.notas.map((n) => {
        const f = rollo.filas[n.fila];
        return `<div class="nota" style="left:${n.x}px;top:${f.top}px;width:${n.w}px;height:${f.alto}px"></div>`;
      }).join("") +
      `<span class="cabezal" hidden style="height:${alto + 12}px"></span>`;
  });
  document.querySelector(".pistas-estructura .cabezal").style.height = "290px";
}

function armarMezcla() {
  const faders = document.querySelector("#mezcla .faders");
  faders.style.cssText = "left:0;top:0";
  faders.innerHTML = CANALES_MEZCLA.map((c, i) => {
    const [cx, cy, cw, ch] = c.circulo;
    const [ix, iy, iw, ih] = c.ico;
    const [x, y, ancho, alto] = c.riel;
    const [pw, ph] = c.perilla;
    // El área del fader es más alta que el riel, para agarrarlo fácil con el mouse.
    return `
    <button class="canal" data-canal="${i}" aria-pressed="false" aria-label="Silenciar ${c.nombre.toLowerCase()}"
            style="left:${cx}px;top:${cy}px;width:${cw}px;height:${ch}px;--color:${c.color}">
      <img src="assets/${c.icono}" alt="" style="left:${ix}px;top:${iy}px;width:${iw}px;height:${ih}px">
    </button>
    <div class="fader" role="slider" tabindex="0" aria-label="${c.nombre}" aria-valuemin="0" aria-valuemax="100"
         data-canal="${i}" style="left:${x}px;top:${y + alto / 2 - 20}px;width:${ancho}px;--color:${c.color}">
      <div class="riel" style="height:${alto}px;top:${20 - alto / 2}px"><div class="relleno"></div></div>
      <span class="perilla-fader" style="width:${pw}px;height:${ph}px;top:${20 - ph / 2}px"></span>
    </div>`;
  }).join("");

  CANALES_MEZCLA.forEach((_, i) => pintarFader(i));

  // Faders en pantalla: arrastrar en horizontal o usar las flechas.
  faders.querySelectorAll(".fader").forEach((el) => {
    const i = Number(el.dataset.canal);
    const desdePuntero = (e) => {
      const riel = el.getBoundingClientRect();
      moverFaderMezcla(i, (e.clientX - riel.left) / riel.width);
    };
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      desdePuntero(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (el.hasPointerCapture(e.pointerId)) desdePuntero(e);
    });
    el.addEventListener("keydown", (e) => {
      const pasos = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 };
      if (!(e.key in pasos)) return;
      e.preventDefault();
      e.stopPropagation(); // que las flechas no cambien de pantalla
      moverFaderMezcla(i, CANALES_MEZCLA[i].valor + pasos[e.key]);
    });
  });

  // El círculo con el ícono silencia ese canal.
  faders.querySelectorAll(".canal").forEach((el) => {
    el.addEventListener("click", () => {
      el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true");
      aplicarVolumenes();
    });
  });
}

function pintarFader(i) {
  const c = CANALES_MEZCLA[i];
  const el = document.querySelector(`#mezcla .fader[data-canal="${i}"]`);
  const ancho = c.riel[2];
  el.querySelector(".relleno").style.width = `${c.valor * ancho}px`;
  el.querySelector(".perilla-fader").style.left = `${c.valor * ancho - c.perilla[0] / 2}px`;
  el.setAttribute("aria-valuenow", Math.round(c.valor * 100));
}

function aplicarVolumenes() {
  const enMezcla = actual === "mezcla";
  CANALES_MEZCLA.forEach((c, i) => {
    const silenciado = document.querySelector(`#mezcla .canal[data-canal="${i}"]`).getAttribute("aria-pressed") === "true";
    // Fuera de la mezcla todos los canales suenan parejo.
    let valor = 1;
    if (enMezcla) valor = silenciado ? 0 : c.valor * (c.canal === "general" ? 1.1 : 1.5);
    Sonido.volumen(c.canal, valor);
  });
}

// La mezcla ya no tiene perillas de efectos: siempre suenan neutros.
function aplicarEfectos() {
  Sonido.aplicarEfectos(Sonido.efectosNeutros);
}

// ---------- Sonido de cada pantalla ----------

function programarBateria(t, salidas, soloHiHat = false) {
  const paso = Sonido.COMPAS / 12;
  patron.forEach((fila, f) => {
    if (soloHiHat && FILAS_PERCUSION[f] !== "hihat") return;
    fila.forEach((on, i) => {
      if (on) Sonido.instrumentos[FILAS_PERCUSION[f]](t + i * paso, salidas.bateria);
    });
  });
}

function programarRollo(nombre, t, salidas) {
  const rollo = ROLLOS[nombre];
  for (const n of rollo.notas) {
    const inicio = t + (n.x / rollo.ancho) * Sonido.COMPAS;
    const duracion = (n.w / rollo.ancho) * Sonido.COMPAS * 0.95;
    Sonido.instrumentos[rollo.instrumento](inicio, salidas[rollo.canal], rollo.filas[n.fila].frecuencia, duracion);
  }
}

function programarTodo(t, salidas) {
  programarBateria(t, salidas);
  programarRollo("bajo", t, salidas);
  programarRollo("melodia", t, salidas);
}

function seguirRollo(nombre, posicion) {
  const el = document.querySelector(`[data-rollo="${nombre}"]`);
  const rollo = ROLLOS[nombre];
  const cabezal = el.querySelector(".cabezal");
  const x = posicion * rollo.ancho;
  cabezal.hidden = posicion < 0;
  cabezal.style.left = `${x - 1.5}px`;
  el.querySelectorAll(".nota").forEach((nota, i) => {
    const n = rollo.notas[i];
    nota.classList.toggle("sonando", posicion >= 0 && x >= n.x && x < n.x + n.w);
  });
}

function seguirEstructura(posicion, seccion) {
  const cabezal = document.querySelector(".pistas-estructura .cabezal");
  cabezal.hidden = posicion < 0;
  cabezal.style.left = `${posicion * 726.66 - 1.5}px`;
  document.querySelectorAll("#estructura .etiqueta").forEach((el) => {
    el.classList.toggle("sonando", Number(el.dataset.seccion) === seccion);
  });
}

// Intro (1 compás) → estrofa (2 compases) → estribillo (1 compás), igual que las ondas del diseño.
const seccionDeCompas = (n) => [0, 1, 1, 2][n % 4];

const REPRODUCTORES = {
  pulso: {
    alCompas(_, t, salidas) {
      const negra = Sonido.COMPAS / 4;
      for (let i = 0; i < 4; i++) {
        Sonido.instrumentos.kick(t + i * negra, salidas.bateria);
        Sonido.instrumentos.click(t + i * negra, salidas.bateria, i === 0);
      }
    },
  },
  instrumental: { alCompas: (_, t, salidas) => programarTodo(t, salidas) },
  percusion: {
    alCompas: (_, t, salidas) => programarBateria(t, salidas),
    alCuadro: (posicion) => marcarPaso(Math.floor(posicion * 12)),
    limpiar: () => marcarPaso(-1),
  },
  bajo: {
    alCompas: (_, t, salidas) => programarRollo("bajo", t, salidas),
    alCuadro: (posicion) => seguirRollo("bajo", posicion),
    limpiar: () => seguirRollo("bajo", -1),
  },
  melodia: {
    alCompas: (_, t, salidas) => programarRollo("melodia", t, salidas),
    alCuadro: (posicion) => seguirRollo("melodia", posicion),
    limpiar: () => seguirRollo("melodia", -1),
  },
  estructura: {
    alCompas(n, t, salidas) {
      const seccion = seccionDeCompas(n);
      if (seccion === 0) {
        programarBateria(t, salidas, true);
        programarRollo("melodia", t, salidas);
      } else if (seccion === 1) {
        programarBateria(t, salidas);
        programarRollo("bajo", t, salidas);
      } else {
        programarTodo(t, salidas);
      }
    },
    alCuadro: (posicion, n) => seguirEstructura(((n % 4) + posicion) / 4, seccionDeCompas(n)),
    limpiar: () => seguirEstructura(-1, -1),
  },
  mezcla: { alCompas: (_, t, salidas) => programarTodo(t, salidas) },
};

let reproductorActivo = null;

function alternar(nombre, boton) {
  if (Sonido.sonando && reproductorActivo === nombre) {
    Sonido.detener();
    return;
  }
  const r = REPRODUCTORES[nombre];
  Sonido.reproducir({
    alCompas: r.alCompas,
    alCuadro: r.alCuadro,
    alDetener() {
      boton?.setAttribute("aria-pressed", "false");
      r.limpiar?.();
      if (reproductorActivo === nombre) reproductorActivo = null;
    },
  });
  reproductorActivo = nombre;
  boton?.setAttribute("aria-pressed", "true");
  aplicarVolumenes();
  aplicarEfectos();
}

// Qué suena al usar el play de la barra superior o la barra espaciadora.
function reproducirPantalla() {
  const pantalla = document.getElementById(actual);
  if (actual === "cancion") {
    Nucleo2.alternar();
  } else if (Nucleo3.maneja(actual)) {
    Nucleo3.alternar();
  } else if (REPRODUCTORES[actual]) {
    alternar(actual, pantalla.querySelector("[data-play]"));
  } else if (actual === "que-es") {
    alternar("instrumental", pantalla.querySelector('[data-sonido="instrumental"]'));
  }
}

// Botones play y pausa de la consola física: a diferencia del play de cada pantalla, no alternan.
function transporte(accion) {
  if (actual === "cancion") {
    if (accion === "play") Nucleo2.reproducir();
    else Nucleo2.pausar();
  } else if (accion === "play") {
    if (!Sonido.sonando) reproducirPantalla();
  } else if (Nucleo3.maneja(actual)) {
    Nucleo3.pausar();
  } else {
    Sonido.detener();
  }
}

// Fader de la consola física (o de la pantalla) sobre la mezcla del núcleo 1 (i: 0 F1 … 3 F4).
function moverFaderMezcla(i, valor) {
  CANALES_MEZCLA[i].valor = limitar(valor);
  pintarFader(i);
  aplicarVolumenes();
}

// Botones de colores (o teclas 1 a 4) en «Seleccioná una canción»: cada tarjeta tiene el color de un botón.
function elegirCancion(n) {
  const tarjeta = document.querySelectorAll("#selecciona [data-cancion]")[n - 1];
  if (!tarjeta) return false;
  abrirCancion(tarjeta.dataset.cancion);
  return true;
}

// La canción elegida empieza a sonar apenas se abre, sin tocar play.
function abrirCancion(id) {
  Nucleo2.elegir(id);
  ir("cancion");
  Nucleo2.empezar();
}

// ---------- Navegación ----------

function ir(id) {
  if (!PANTALLAS.includes(id)) id = "inicio";
  // Volver al inicio desde el cierre es el turno de otra persona: su beat del núcleo 3 arranca vacío.
  if (actual === "cierre" && id === "inicio") Nucleo3.vaciar();
  Sonido.detener();
  Nucleo2.alSalir();
  Nucleo3.alSalir();
  clearTimeout(timerCarga);
  actual = id;
  document.querySelectorAll(".screen").forEach((s) => {
    const activa = s.id === id;
    s.classList.toggle("activa", activa);
    s.inert = !activa;
  });
  if (id === "cancion") Nucleo2.alEntrar();
  if (Nucleo3.maneja(id)) Nucleo3.alEntrar(id);
  history.replaceState(null, "", `#${id}`);
  aplicarVolumenes();
  aplicarEfectos();
  if (id === "carga") timerCarga = setTimeout(() => ir(TUTORIAL[0]), DURACION_CARGA);
  // Las capas del beat (percusión → mezcla) suenan solas al entrar; el play sigue sirviendo para pausar.
  if (CAPAS.includes(id)) alternar(id, document.getElementById(id).querySelector("[data-play]"));
}

function avanzar(direccion) {
  if (Nucleo3.maneja(actual) && Nucleo3.frenaAvance(direccion)) return;
  // En la bienvenida del tutorial se prueban los botones: «anterior» no saca de vuelta a la portada.
  if (actual === TUTORIAL[0] && direccion < 0) return;
  let destino = PANTALLAS[PANTALLAS.indexOf(actual) + direccion];
  if (destino === "carga" && direccion < 0) destino = "inicio";
  if (!destino && direccion > 0) destino = "inicio"; // después del cierre se vuelve a empezar
  if (destino) ir(destino);
}

function escuchar() {
  stage.addEventListener("click", (e) => {
    const destino = e.target.closest("[data-ir]");
    if (destino && !destino.disabled) {
      ir(destino.dataset.ir);
      return;
    }
    const cancion = e.target.closest("[data-cancion]");
    if (cancion) {
      abrirCancion(cancion.dataset.cancion);
      return;
    }
    const paso = e.target.closest("[data-paso]");
    if (paso) {
      avanzar(Number(paso.dataset.paso));
      return;
    }
    const play = e.target.closest("[data-play]");
    if (play) {
      alternar(actual, play);
      return;
    }
    const opcion = e.target.closest("[data-sonido]");
    if (opcion) {
      alternar(opcion.dataset.sonido, opcion);
      return;
    }
    if (e.target.closest("[data-pausa]")) transporte("pausa");
  });

  // Teclado: flechas para moverse, espacio/enter para reproducir (la consola física va por js/consola.js).
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
    if (e.target.closest?.("input, textarea")) return; // escribir el nombre del beat no navega
    const enControl = e.target.closest?.("button, [role='slider']");
    const activaControl = enControl && (e.key === " " || e.key === "Enter");

    // Atajos: N avanza y 0 (fila de números o teclado numérico) retrocede en cualquier pantalla.
    const retroceder = e.key === "0" || e.code === "Numpad0";
    if (e.key.toLowerCase() === "n" || retroceder) {
      e.preventDefault();
      avanzar(retroceder ? -1 : 1);
      return;
    }

    // Botones de colores: 1 azul, 2 violeta, 3 verde eligen la opción de ese color en los pasos del núcleo 3.
    if (Nucleo3.maneja(actual) && Nucleo3.teclaOpcion(e.key)) {
      e.preventDefault();
      return;
    }
    if (actual === "selecciona" && /^[1-4]$/.test(e.key) && elegirCancion(Number(e.key))) {
      e.preventDefault();
      return;
    }

    // ATAJO TEMPORAL para probar: 3 salta directo al núcleo 3. Borrar este bloque antes de la entrega.
    if (e.key === "3" || e.code === "Numpad3") {
      e.preventDefault();
      ir("crea");
      return;
    }

    if (actual === "inicio" || actual === "cierre") {
      if (activaControl) return;
      e.preventDefault();
      ir(actual === "inicio" ? "carga" : "inicio");
    } else if (actual === "carga") {
      return;
    } else if (TUTORIAL.includes(actual)) {
      // En el tutorial cualquier tecla sigue; la flecha izquierda vuelve.
      if (activaControl) return;
      e.preventDefault();
      avanzar(e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      avanzar(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      avanzar(-1);
    } else if ((e.key === " " || e.key === "Enter") && !enControl) {
      e.preventDefault();
      reproducirPantalla();
    }
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id !== actual) ir(id);
  });
}

// ---------- Escala del lienzo ----------

function escala() {
  return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}

function ajustarEscala() {
  stage.style.setProperty("--escala", escala());
}

function limitar(valor) {
  return Math.min(1, Math.max(0, valor));
}

// ---------- Arranque ----------

montarPlantillas();
Nucleo3.armar();
armarTitulos();
armarOndas();
armarParlantes();
armarSecuenciador();
armarRollos();
armarMezcla();
Nucleo2.armar();
escuchar();
ajustarEscala();
window.addEventListener("resize", ajustarEscala);
ir(location.hash.slice(1) || "inicio");

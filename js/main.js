/* Beatmind · Núcleo 1: navegación entre pantallas e interacción de las capas del beat. */

const PANTALLAS = [
  "inicio", "carga", "que-es",
  "percusion", "bajo", "melodia", "estructura", "mezcla",
  "fl-studio", "bizarrap", "cierre",
];
const DURACION_CARGA = 2800;

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
    instrumento: "bajo",
    canal: "bajo",
    filas: [
      { top: 0, alto: 54, frecuencia: 98.0 },   // Sol
      { top: 59, alto: 54, frecuencia: 77.78 }, // Mi bemol
      { top: 118, alto: 54, frecuencia: 65.41 }, // Do
    ],
    notas: [
      { fila: 0, x: 0, w: 220 },
      { fila: 2, x: 220, w: 220 },
      { fila: 1, x: 440, w: 135 },
      { fila: 0, x: 575, w: 252 },
    ],
  },
  melodia: {
    ancho: 765,
    instrumento: "teclas",
    canal: "melodia",
    filas: [
      { top: 0, alto: 45, frecuencia: 659.25 }, // Mi
      { top: 48, alto: 42, frecuencia: 587.33 }, // Re
      { top: 93, alto: 42, frecuencia: 523.25 }, // Do
      { top: 138, alto: 42, frecuencia: 440.0 }, // La
      { top: 183, alto: 42, frecuencia: 392.0 }, // Sol
    ],
    notas: [
      { fila: 0, x: 0, w: 351 },
      { fila: 2, x: 0, w: 210 },
      { fila: 2, x: 351, w: 210 },
      { fila: 4, x: 351, w: 210 },
      { fila: 1, x: 561, w: 204 },
      { fila: 3, x: 561, w: 204 },
    ],
  },
};

const CANALES_MEZCLA = [
  { canal: "melodia", nombre: "Melodía", icono: "mix-music.png", riel: 985, ancho: 11, valor: 77 / 146, boton: 969, ico: [4, 4, 36, 34] },
  { canal: "general", nombre: "Volumen general", icono: "mix-audio.png", riel: 1097, ancho: 10, valor: 123 / 146, boton: 1080, ico: [7, 7, 30, 29] },
  { canal: "bajo", nombre: "Bajo", icono: "mix-guitar.png", riel: 1209, ancho: 10, valor: 49 / 146, boton: 1192, ico: [5, 4, 35, 34] },
  { canal: "bateria", nombre: "Batería", icono: "mix-drums.png", riel: 1320, ancho: 11, valor: 87 / 146, boton: 1303, ico: [6, 6, 33, 31] },
];

const EFECTOS_MEZCLA = [
  { clave: "reverb", nombre: "Reverb", valor: 0.88, fondo: [525, 91], texto: 525, perilla: 520 },
  { clave: "delay", nombre: "Delay", valor: 0.25, fondo: [578, 72], texto: 577, perilla: 572 },
  { clave: "eq", nombre: "EQ", valor: 0.5, fondo: [629, 43], texto: 629, perilla: 624 },
  { clave: "compresor", nombre: "Compresor", valor: 0, fondo: [681, 123], texto: 680, perilla: 675.5 },
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
};
const COLORES_ONDA = ["#e678eb", "#e678eb", "#e678eb", "#787eeb", "#787eeb", "#787eeb", "#00ff89", "#00ff89", "#00ff89"];

// ---------- Armado del DOM ----------

function montarPlantillas() {
  const capaBase = document.getElementById("tpl-capa-base");
  document.querySelectorAll("[data-capa-base]").forEach((el) => el.replaceWith(capaBase.content.cloneNode(true)));

  const nav = document.getElementById("tpl-nav");
  document.querySelectorAll("[data-nav]").forEach((el) => el.replaceWith(nav.content.cloneNode(true)));

  const pasos = document.getElementById("tpl-pasos");
  document.querySelectorAll("[data-pasos]").forEach((el) => el.append(pasos.content.cloneNode(true)));
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
      celda.dataset.paso = paso;
      celda.setAttribute("aria-label", `${NOMBRES_PERCUSION[f]}, paso ${paso + 1}`);
      grilla.append(celda);
    });
  }
  grilla.addEventListener("click", (e) => {
    const celda = e.target.closest(".celda");
    if (!celda) return;
    const { fila, paso } = celda.dataset;
    patron[fila][paso] = patron[fila][paso] ? 0 : 1;
    if (patron[fila][paso] && !Sonido.sonando) Sonido.tocar(FILAS_PERCUSION[fila], "bateria");
    pintarSecuenciador();
  });
  pintarSecuenciador();
}

function pintarSecuenciador() {
  document.querySelectorAll("#percusion .celda").forEach((celda) => {
    const on = patron[celda.dataset.fila][celda.dataset.paso] === 1;
    celda.classList.toggle("on", on);
    celda.setAttribute("aria-pressed", on);
  });
}

function marcarPaso(paso) {
  document.querySelectorAll("#percusion .celda").forEach((celda) => {
    celda.classList.toggle("paso-actual", Number(celda.dataset.paso) === paso);
  });
}

function armarRollos() {
  document.querySelectorAll("[data-rollo]").forEach((el) => {
    const rollo = ROLLOS[el.dataset.rollo];
    const ultima = rollo.filas.at(-1);
    const alto = ultima.top + ultima.alto;
    el.style.width = `${rollo.ancho}px`;
    el.style.height = `${alto}px`;
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      rollo.filas.map((f) => `<div class="pista" style="top:${f.top}px;width:${rollo.ancho}px;height:${f.alto}px"></div>`).join("") +
      rollo.notas.map((n) => {
        const f = rollo.filas[n.fila];
        return `<div class="nota" style="left:${n.x}px;top:${f.top}px;width:${n.w}px;height:${f.alto}px"></div>`;
      }).join("") +
      `<span class="cabezal" hidden style="height:${alto + 12}px"></span>`;
  });
  document.querySelector(".pistas-estructura .cabezal").style.height = "184px";
}

function armarMezcla() {
  const faders = document.querySelector("#mezcla .faders");
  faders.style.cssText = "left:0;top:0";
  faders.innerHTML = CANALES_MEZCLA.map((c, i) => `
    <div class="fader" role="slider" tabindex="0" aria-label="${c.nombre}" aria-valuemin="0" aria-valuemax="100"
         data-canal="${i}" style="left:${c.riel + c.ancho / 2 - 22}px">
      <div class="riel" style="left:${22 - c.ancho / 2}px;width:${c.ancho}px"><div class="relleno"></div></div>
      <img class="perilla-fader" src="assets/fader.svg" alt="">
    </div>
    <button class="canal" data-canal="${i}" aria-pressed="false" aria-label="Silenciar ${c.nombre.toLowerCase()}" style="left:${c.boton}px">
      <img src="assets/mix-boton.svg" alt="" style="left:0;top:0;width:45px;height:43px">
      <img class="icono" src="assets/${c.icono}" alt="" style="left:${c.ico[0]}px;top:${c.ico[1]}px;width:${c.ico[2]}px;height:${c.ico[3]}px">
    </button>`).join("");

  const efectos = document.querySelector("#mezcla .efectos");
  efectos.style.cssText = "left:0;top:0";
  efectos.innerHTML = EFECTOS_MEZCLA.map((ef, i) => `
    <div class="efecto-fondo" style="top:${ef.fondo[0]}px;width:${ef.fondo[1]}px"></div>
    <p class="texto efecto-nombre" style="left:1436px;top:${ef.texto}px">${ef.nombre}</p>
    <div class="perilla" role="slider" tabindex="0" aria-label="${ef.nombre}" aria-valuemin="0" aria-valuemax="100"
         data-efecto="${i}" style="top:${ef.perilla}px">
      <svg width="26" height="24" viewBox="0 0 26 24" fill="none" aria-hidden="true">
        <ellipse cx="13" cy="12" rx="11" ry="10" stroke="#210A41" stroke-width="4"/>
        <path class="arco" d="M13 2A11 10 0 1 0 13 22A11 10 0 1 0 13 2" stroke="#CC4BFF" stroke-width="4" pathLength="100"/>
      </svg>
    </div>`).join("");

  CANALES_MEZCLA.forEach((_, i) => pintarFader(i));
  EFECTOS_MEZCLA.forEach((_, i) => pintarPerilla(i));

  // Faders: arrastrar en vertical o usar flechas arriba/abajo
  faders.querySelectorAll(".fader").forEach((el) => {
    const i = Number(el.dataset.canal);
    const desdePuntero = (e) => {
      const riel = el.querySelector(".riel").getBoundingClientRect();
      CANALES_MEZCLA[i].valor = limitar(1 - (e.clientY - riel.top) / riel.height);
      pintarFader(i);
      aplicarVolumenes();
    };
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      desdePuntero(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (el.hasPointerCapture(e.pointerId)) desdePuntero(e);
    });
    el.addEventListener("keydown", (e) => ajustarConTeclas(e, CANALES_MEZCLA[i], () => {
      pintarFader(i);
      aplicarVolumenes();
    }));
  });

  faders.querySelectorAll(".canal").forEach((el) => {
    el.addEventListener("click", () => {
      el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true");
      aplicarVolumenes();
    });
  });

  // Perillas: arrastrar hacia arriba/abajo, clic para sumar un cuarto, o flechas
  efectos.querySelectorAll(".perilla").forEach((el) => {
    const efecto = EFECTOS_MEZCLA[Number(el.dataset.efecto)];
    let inicio = null;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      inicio = { y: e.clientY, valor: efecto.valor, movio: false };
    });
    el.addEventListener("pointermove", (e) => {
      if (!inicio) return;
      const delta = (inicio.y - e.clientY) / (150 * escala());
      if (Math.abs(delta) > 0.02) inicio.movio = true;
      efecto.valor = limitar(inicio.valor + delta);
      pintarPerilla(Number(el.dataset.efecto));
      aplicarEfectos();
    });
    el.addEventListener("pointerup", () => {
      if (inicio && !inicio.movio) {
        efecto.valor = efecto.valor >= 1 ? 0 : limitar(Math.round((efecto.valor + 0.25) * 4) / 4);
        pintarPerilla(Number(el.dataset.efecto));
        aplicarEfectos();
      }
      inicio = null;
    });
    el.addEventListener("keydown", (e) => ajustarConTeclas(e, efecto, () => {
      pintarPerilla(Number(el.dataset.efecto));
      aplicarEfectos();
    }));
  });
}

function pintarFader(i) {
  const c = CANALES_MEZCLA[i];
  const el = document.querySelector(`#mezcla .fader[data-canal="${i}"]`);
  el.querySelector(".relleno").style.height = `${c.valor * 146}px`;
  const perilla = el.querySelector(".perilla-fader");
  perilla.style.left = `${22 - 14.37}px`;
  perilla.style.top = `${20 + (1 - c.valor) * 146 - 20.04}px`;
  el.setAttribute("aria-valuenow", Math.round(c.valor * 100));
}

function pintarPerilla(i) {
  const ef = EFECTOS_MEZCLA[i];
  const el = document.querySelector(`#mezcla .perilla[data-efecto="${i}"]`);
  el.querySelector(".arco").setAttribute("stroke-dasharray", `${ef.valor * 100} 100`);
  el.setAttribute("aria-valuenow", Math.round(ef.valor * 100));
}

function ajustarConTeclas(e, objeto, alCambiar) {
  const pasos = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 };
  if (!(e.key in pasos)) return;
  e.preventDefault();
  e.stopPropagation();
  objeto.valor = limitar(objeto.valor + pasos[e.key]);
  alCambiar();
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

function aplicarEfectos() {
  if (actual !== "mezcla") {
    Sonido.aplicarEfectos(Sonido.efectosNeutros);
    return;
  }
  const valores = {};
  EFECTOS_MEZCLA.forEach((ef) => { valores[ef.clave] = ef.valor; });
  Sonido.aplicarEfectos(valores);
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
  cabezal.style.left = `${posicion * 707 - 1.5}px`;
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
  if (REPRODUCTORES[actual]) {
    alternar(actual, pantalla.querySelector("[data-play]"));
  } else if (actual === "que-es") {
    alternar("instrumental", pantalla.querySelector('[data-sonido="instrumental"]'));
  }
}

// ---------- Navegación ----------

function ir(id) {
  if (!PANTALLAS.includes(id)) id = "inicio";
  Sonido.detener();
  clearTimeout(timerCarga);
  actual = id;
  document.querySelectorAll(".screen").forEach((s) => {
    const activa = s.id === id;
    s.classList.toggle("activa", activa);
    s.inert = !activa;
  });
  history.replaceState(null, "", `#${id}`);
  aplicarVolumenes();
  aplicarEfectos();
  if (id === "carga") timerCarga = setTimeout(() => ir("que-es"), DURACION_CARGA);
}

function avanzar(direccion) {
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
    const silencio = e.target.closest("[data-silencio]");
    if (silencio) {
      Sonido.silenciar(!Sonido.silenciado);
      document.querySelectorAll("[data-silencio]").forEach((b) => {
        b.setAttribute("aria-pressed", Sonido.silenciado);
        b.setAttribute("aria-label", Sonido.silenciado ? "Activar sonido" : "Silenciar");
      });
      return;
    }
    const transporte = e.target.closest("[data-transporte]");
    if (transporte) {
      if (transporte.dataset.transporte === "play") {
        if (!Sonido.sonando) reproducirPantalla();
      } else {
        Sonido.detener();
      }
    }
  });

  // La interfaz física envía teclas: flechas para moverse, espacio/enter para reproducir.
  document.addEventListener("keydown", (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
    const enControl = e.target.closest?.("button, [role='slider']");
    const activaControl = enControl && (e.key === " " || e.key === "Enter");

    // Atajos: N avanza y 0 (fila de números o teclado numérico) retrocede en cualquier pantalla.
    const retroceder = e.key === "0" || e.code === "Numpad0";
    if (e.key.toLowerCase() === "n" || retroceder) {
      e.preventDefault();
      avanzar(retroceder ? -1 : 1);
      return;
    }

    if (actual === "inicio" || actual === "cierre") {
      if (activaControl) return;
      e.preventDefault();
      ir(actual === "inicio" ? "carga" : "inicio");
    } else if (actual === "carga") {
      return;
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
armarTitulos();
armarOndas();
armarParlantes();
armarSecuenciador();
armarRollos();
armarMezcla();
escuchar();
ajustarEscala();
window.addEventListener("resize", ajustarEscala);
ir(location.hash.slice(1) || "inicio");

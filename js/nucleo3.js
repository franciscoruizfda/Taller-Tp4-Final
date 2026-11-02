/* Beatmind · Núcleo 3: creá tu propio beat en 7 pasos, acompañado por Byte.
   El sonido del beat vive en motor-beat.js (lo comparte con beat.html, la página que se abre con el QR).

   Cómo se arma el beat: en Ritmo (bombo → caja → hi-hat), Bajo y Melodía Byte propone 3 opciones
   predeterminadas, una por color (azul, violeta, verde), igual que los botones de la interfaz física.
   Elegir una la aplica enseguida y suena con el resto del beat; elegir otra la reemplaza.
   Las opciones dependen del estilo: si cambiás de estilo, cada parte toma la opción del mismo color en el estilo nuevo. */

const Nucleo3 = (() => {
  const { PASOS } = MotorBeat;
  const PANTALLAS_PASOS = ["crea-estilo", "crea-velocidad", "crea-ritmo", "crea-bajo", "crea-melodia", "crea-equilibrio", "crea-tu-beat"];
  const PANTALLAS = ["crea", "crea-tiempo", "crea-base", "crea-etapas", ...PANTALLAS_PASOS];
  const BPM_MIN = 60;
  const BPM_MAX = 160;

  /* Dirección pública del sitio, para el QR cuando la infografía se abre en esta compu (localhost o archivo).
     Si se abre desde una dirección de la red o de internet, el QR usa esa misma dirección. */
  const URL_PUBLICA = "https://franciscoruizfda.github.io/Taller-Tp4-Final/";

  /* Datos de cada estilo para la pantalla y para las opciones.
     opciones: las 3 propuestas (azul, violeta, verde) de cada sonido del ritmo (casillas que suenan) y del bajo (casilla: nota).
     demo: lo que suena al tocar la tarjeta. mezcla: volúmenes con los que arranca el equilibrio. */
  const ESTILOS = {
    trap: {
      nombre: "TRAP", color: "#0084ff", foto: "estilo-trap.png", posicion: "44% center",
      left: 480, top: 588.47,
      opciones: {
        bombo: [[0, 7, 10], [0, 3, 10], [0, 6, 11, 14]],
        caja: [[8], [8, 15], [8, 14]],
        hihat: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 15]],
        bajo: [
          { 0: "Re", 7: "Re", 10: "Fa" },
          { 0: "Re", 3: "Re", 6: "Fa", 8: "Sol", 11: "Fa", 14: "Mi" },
          { 0: "Re", 6: "Re", 8: "La", 10: "Sol", 12: "Fa", 14: "Mi" },
        ],
      },
      demo: {
        bajo: { 0: "Re", 7: "Re", 10: "Fa" },
        melodia: { 0: "La", 3: "Sol", 6: "Fa", 8: "Re", 11: "Mi", 14: "Fa" },
      },
      mezcla: { bombo: 80, caja: 70, hihat: 45, bajo: 90, melodia: 55 },
    },
    pop: {
      nombre: "POP", color: "#675180", foto: "estilo-pop.png", posicion: "54% center",
      left: 809, top: 590.29,
      opciones: {
        bombo: [[0, 8, 10], [0, 4, 8, 12], [0, 3, 8, 11]],
        caja: [[4, 12], [4, 12, 15], [4, 10, 12]],
        hihat: [[0, 2, 4, 6, 8, 10, 12, 14], [2, 6, 10, 14], [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]],
        bajo: [
          { 0: "Re", 4: "Re", 8: "Fa", 12: "Sol" },
          { 0: "Re", 2: "Re", 4: "Fa", 6: "Fa", 8: "Sol", 10: "Sol", 12: "Fa", 14: "Mi" },
          { 0: "Re", 3: "La", 6: "Re", 8: "Fa", 11: "Sol", 14: "La" },
        ],
      },
      demo: {
        bajo: { 0: "Re", 6: "Re", 8: "Fa", 12: "Sol" },
        melodia: { 0: "Re", 2: "Mi", 4: "Fa", 6: "La", 8: "Sol", 12: "Fa", 14: "Mi" },
      },
      mezcla: { bombo: 75, caja: 75, hihat: 55, bajo: 65, melodia: 80 },
    },
    cumbia: {
      nombre: "CUMBIA", color: "#00ff89", foto: "estilo-cumbia.jpg", posicion: "42% center",
      left: 1140.5, top: 591.05,
      opciones: {
        bombo: [[0, 8], [0, 3, 8, 11], [0, 4, 8, 12]],
        caja: [[4, 12], [4, 12, 14], [2, 6, 10, 14]],
        hihat: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], [0, 3, 4, 7, 8, 11, 12, 15]],
        bajo: [
          { 0: "Re", 4: "La", 8: "Re", 12: "La" },
          { 0: "Re", 3: "Re", 4: "La", 8: "Fa", 11: "Fa", 12: "La" },
          { 0: "Re", 4: "La", 6: "Re", 8: "Sol", 12: "Re", 14: "La" },
        ],
      },
      demo: {
        bajo: { 0: "Re", 4: "La", 8: "Re", 12: "La" },
        melodia: { 0: "La", 2: "Sol", 4: "Fa", 6: "Mi", 8: "Fa", 10: "Sol", 12: "La", 14: "Re" },
      },
      mezcla: { bombo: 70, caja: 65, hihat: 75, bajo: 75, melodia: 80 },
    },
    electronica: {
      nombre: "ELECTRÓNICA", color: "#9ec5f4", foto: "estilo-electronica.png", posicion: "57% 37.5%",
      left: 1471, top: 590.47, tamano: 36,
      opciones: {
        bombo: [[0, 4, 8, 12], [0, 4, 8, 12, 14], [0, 4, 7, 8, 12]],
        caja: [[4, 12], [4, 12, 13], [4, 11, 12]],
        hihat: [[2, 6, 10, 14], [0, 2, 4, 6, 8, 10, 12, 14], [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]],
        bajo: [
          { 2: "Re", 6: "Re", 10: "Re", 14: "Re" },
          { 0: "Re", 2: "Re", 4: "Re", 6: "Fa", 8: "Re", 10: "Re", 12: "Sol", 14: "Fa" },
          { 2: "Re", 6: "Fa", 10: "Sol", 14: "La" },
        ],
      },
      demo: {
        bajo: { 2: "Re", 6: "Re", 10: "Re", 14: "Re" },
        melodia: { 0: "Re", 3: "Re", 6: "Fa", 8: "Re", 11: "Mi", 14: "La" },
      },
      mezcla: { bombo: 90, caja: 70, hihat: 55, bajo: 75, melodia: 55 },
    },
  };

  // Las melodías son las mismas en todos los estilos: lo que cambia es el instrumento que las toca.
  const MELODIAS = [
    { nombre: "SUAVE", notas: { 0: "La", 6: "Fa", 8: "Sol", 14: "Re" } },
    { nombre: "PEGADIZA", notas: { 0: "Re", 2: "Fa", 3: "Sol", 6: "Fa", 8: "Re", 10: "Fa", 11: "La", 14: "Sol" } },
    { nombre: "DINÁMICA", notas: { 0: "La", 1: "Sol", 2: "Fa", 4: "Re", 6: "Mi", 7: "Fa", 8: "La", 9: "Sol", 10: "Fa", 12: "Sol", 13: "La", 14: "Re" } },
  ];

  // Una opción por color, en el orden de los botones de la interfaz física.
  const COLORES = ["azul", "violeta", "verde"];

  const PIEZAS_RITMO = [
    { id: "bombo", nombre: "BOMBO", texto: "Suele marcar los apoyos principales del ritmo. Probá un golpe al principio y otro en la mitad." },
    { id: "caja", nombre: "CAJA", texto: "Le responde al bombo y marca acentos. Probá ponerla entre los golpes profundos." },
    { id: "hihat", nombre: "HI-HAT", texto: "Son pequeños golpes que dan movimiento. Pueden sonar más seguido que el bombo y la caja." },
  ];

  // Filas de la pantalla de equilibrio: y = centro de la fila. La caja queda con el volumen del estilo.
  const CANALES = [
    { id: "bombo", nombre: "BOMBO", color: "#00ff89", y: 509 },
    { id: "hihat", nombre: "HI-HAT", color: "#0084ff", y: 618 },
    { id: "bajo", nombre: "BAJO", color: "#675180", y: 727 },
    { id: "melodia", nombre: "MELODÍA", color: "#9ec5f4", y: 836 },
  ];
  const RIEL = { left: 904, ancho: 647, perilla: 19 };

  // Lo que dice la indicación de cada paso cuando querés seguir sin haber elegido.
  const AVISO_ELEGIR = "Primero elegí una opción: tocá la fila del color que más te guste.";

  // ---------- Estado ----------

  const estado = MotorBeat.vacioInicial();
  const elegidas = { bombo: null, caja: null, hihat: null, bajo: null, melodia: null }; // índice de la opción (0 a 2)
  let piezaActiva = "bombo";
  let bpmTocado = false;
  let mezclaTocada = false;
  const aviso = {}; // capa → true mientras se muestra el aviso de que falta elegir

  let alcanzado = -1; // paso más lejano al que se llegó
  let actual = null;
  let modo = null; // "beat" | "pulso" | "demo" mientras suena
  let estiloDemo = null;
  let pasoSonando = -1; // casilla que está sonando ahora
  let pausadoEn = 0; // casilla desde la que retoma el play después de una pausa
  let marcada = -1; // casilla resaltada en pantalla
  let pedido = 0;
  let esperando = false; // se tocó play y se están terminando de cargar los sonidos

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const pantalla = (id) => document.getElementById(id);
  const estiloActual = () => MotorBeat.estiloDe(estado);
  const pasoDe = (id) => id?.replace("crea-", "");
  const filaDe = (casillas) => Array.from({ length: PASOS }, (_, i) => casillas.includes(i));
  const notasDe = (mapa) => Array.from({ length: PASOS }, (_, i) => mapa[i] || null);
  const capaDe = (paso) => (paso === "ritmo" ? piezaActiva : paso);

  // ---------- Opciones ----------

  // Lo que suena con la opción i de una capa, en el estilo actual.
  function opcion(capa, i) {
    if (capa === "melodia") return notasDe(MELODIAS[i].notas);
    const o = ESTILOS[estiloActual()].opciones[capa][i];
    return capa === "bajo" ? notasDe(o) : filaDe(o);
  }

  // Vuelca las opciones elegidas al beat (también al cambiar de estilo).
  function aplicarOpciones() {
    for (const capa of Object.keys(elegidas)) {
      const i = elegidas[capa];
      const valor = i === null ? null : opcion(capa, i);
      if (capa in estado.ritmo) estado.ritmo[capa] = valor || filaDe([]);
      else estado[capa] = valor || notasDe({});
    }
  }

  /* Tocar una fila la elige y hace sonar el beat con ella desde el principio del compás,
     para que se escuche entera aunque otra opción estuviera sonando.
     Tocar la que ya está elegida mientras suena pausa el beat. */
  function elegir(capa, i) {
    if (elegidas[capa] === i && modo === "beat" && activo()) {
      pausar();
      return;
    }
    elegidas[capa] = i;
    delete aviso[capa];
    aplicarOpciones();
    pintarOpciones(pasoDe(actual));
    pausadoEn = 0;
    reproducir("beat");
  }

  // Al llegar a Ritmo (o a cada uno de sus sonidos), Bajo o Melodía suena sola la opción elegida;
  // si todavía no hay ninguna, la primera, para que se escuche enseguida qué sonido se está trabajando.
  function sonarOpcion() {
    const capa = capaDe(pasoDe(actual));
    const i = elegidas[capa] ?? 0;
    elegidas[capa] = null; // así elegir() la hace sonar en vez de pausarla
    elegir(capa, i);
  }

  // ---------- Sonido ----------

  function datosDemo(estilo) {
    const e = ESTILOS[estilo];
    const ritmo = {};
    for (const pieza of ["bombo", "caja", "hihat"]) ritmo[pieza] = filaDe(e.opciones[pieza][0]);
    return { ...estado, estilo, ritmo, bajo: notasDe(e.demo.bajo), melodia: notasDe(e.demo.melodia) };
  }

  /* Play: si los sonidos todavía se están cargando, el botón ya se ve sonando pero se espera
     (como mucho 2,5 s) para no arrancar con los sintetizados y cambiar a los reales en el medio.
     pedido cambia con cada play/pausa: si la carga termina tarde, un play viejo se descarta. */
  function reproducir(nuevoModo, estilo = estiloActual()) {
    const miPedido = ++pedido;
    Sonido.detener();
    modo = nuevoModo;
    estiloDemo = nuevoModo === "demo" ? estilo : null;
    pintarReproduccion();
    if (MotorBeat.muestrasListas) {
      empezar(nuevoModo, estilo);
      return;
    }
    esperando = true;
    MotorBeat.esperarMuestras().then(() => {
      if (miPedido !== pedido) return;
      esperando = false;
      empezar(nuevoModo, estilo);
    });
  }

  // Corta lo que esté sonando o por sonar.
  function cortar() {
    pedido++;
    if (esperando) {
      esperando = false;
      modo = null;
      estiloDemo = null;
      pintarReproduccion();
    }
    Sonido.detener();
  }

  function empezar(nuevoModo, estilo) {
    const demo = nuevoModo === "demo" ? datosDemo(estilo) : null;
    // Tu beat retoma desde la casilla donde lo pausaste; lo demás arranca siempre desde el principio.
    const desde = nuevoModo === "beat" ? pausadoEn : 0;
    pausadoEn = 0;
    pasoSonando = (desde + PASOS - 1) % PASOS;
    Sonido.reproducir({
      // Cada "compás" del reproductor es un paso (o un tiempo, en el pulso): así los cambios se escuchan enseguida.
      compas: () => (nuevoModo === "pulso" ? 60 / estado.bpm : MotorBeat.segundosPorPaso(estado)),
      alCompas(n, t, salidas) {
        if (nuevoModo === "pulso") {
          MotorBeat.disparar(estado, "bombo", t, salidas.bateria);
          Sonido.instrumentos.click(t, salidas.bateria, n % 4 === 0);
        } else {
          MotorBeat.tocarPaso(demo || estado, (desde + n) % PASOS, t, salidas);
        }
      },
      alCuadro: (_, n) => {
        if (nuevoModo === "pulso") return;
        pasoSonando = (desde + n) % PASOS;
        marcarPaso(pasoSonando);
      },
      alDetener() {
        modo = null;
        estiloDemo = null;
        marcarPaso(-1);
        pintarReproduccion();
      },
    });
    modo = nuevoModo;
    estiloDemo = nuevoModo === "demo" ? estilo : null;
    pintarReproduccion();
  }

  const activo = () => Sonido.sonando || esperando;

  function alternar(nuevoModo = "beat") {
    if (activo() && modo === nuevoModo) {
      if (nuevoModo === "beat") pausar();
      else cortar();
    } else {
      reproducir(nuevoModo);
    }
  }

  // Pausa: frena y recuerda la casilla siguiente para retomar desde ahí con el próximo play.
  function pausar() {
    if (!esperando) pausadoEn = (pasoSonando + 1) % PASOS;
    cortar();
  }

  function alternarDemo(estilo) {
    if (activo() && modo === "demo" && estiloDemo === estilo) cortar();
    else reproducir("demo", estilo);
  }

  // Lo que hace el play de cada pantalla (y el de la barra superior o la barra espaciadora):
  // en Estilo, la demo del estilo elegido; en Velocidad, el pulso; en los demás pasos, tu beat.
  function alternarPantalla() {
    if (actual === "crea-velocidad") {
      alternar("pulso");
    } else if (actual === "crea-estilo") {
      if (estado.estilo) alternarDemo(estado.estilo);
      else $("[data-estilo-texto]").textContent = "Tocá una tarjeta para escuchar ese estilo. Después, con play lo volvés a escuchar.";
    } else {
      alternar("beat");
    }
  }

  // ---------- QR y reinicio ----------

  function direccionCompartir() {
    const { protocol, hostname } = location;
    const local = protocol === "file:" || ["localhost", "127.0.0.1", "::1", ""].includes(hostname);
    const base = local ? URL_PUBLICA : location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    return `${base}beat.html#${MotorBeat.codificar(estado)}`;
  }

  function pintarQr() {
    const caja = $("[data-qr]");
    const texto = $("[data-qr-texto]");
    if (MotorBeat.beatVacio(estado) || typeof qrcode !== "function") {
      caja.innerHTML = "";
      caja.classList.add("vacio");
      texto.textContent = "TODAVÍA SIN SONIDOS";
      return;
    }
    const qr = qrcode(0, "M");
    qr.addData(direccionCompartir());
    qr.make();
    caja.classList.remove("vacio");
    caja.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    caja.dataset.url = direccionCompartir();
    texto.textContent = "ESCANEÁ Y DESCARGÁ";
  }

  // Deja el núcleo 3 vacío, como lo encuentra una persona nueva (al volver al inicio desde el cierre).
  function vaciar() {
    cortar();
    Object.assign(estado, MotorBeat.vacioInicial());
    Object.keys(elegidas).forEach((capa) => { elegidas[capa] = null; delete aviso[capa]; });
    alcanzado = -1;
    piezaActiva = "bombo";
    bpmTocado = false;
    mezclaTocada = false;
    pausadoEn = 0;
    pintarTodo();
  }

  // ---------- Avance entre pasos ----------

  /* Se llama al tocar «siguiente» o «anterior». Devuelve true si el paso frena el cambio de pantalla:
     si falta elegir el estilo o una opción, o al recorrer bombo → caja → hi-hat. */
  function frenaAvance(direccion) {
    if (actual === "crea-estilo" && direccion > 0 && !estado.estilo) {
      $("[data-estilo-texto]").textContent = "Primero elegí un estilo tocando una tarjeta.";
      return true;
    }
    const paso = pasoDe(actual);
    if (!["ritmo", "bajo", "melodia"].includes(paso)) return false;
    const capa = capaDe(paso);
    if (direccion > 0 && elegidas[capa] === null) {
      aviso[capa] = true;
      pintarOpciones(paso);
      return true;
    }
    if (paso === "ritmo") {
      const destino = PIEZAS_RITMO[PIEZAS_RITMO.findIndex((x) => x.id === piezaActiva) + direccion];
      if (destino) {
        piezaActiva = destino.id;
        pintarRitmo();
        sonarOpcion();
        return true;
      }
    }
    return false;
  }

  // Los botones de colores (o las teclas 1, 2 y 3; del 1 al 4 en Estilo) eligen la opción de ese color.
  function teclaOpcion(tecla) {
    const n = Number(tecla) - 1;
    if (actual === "crea-estilo" && n >= 0 && n < 4) {
      const id = Object.keys(ESTILOS)[n];
      elegirEstilo(id);
      alternarDemo(id);
      return true;
    }
    const paso = pasoDe(actual);
    if (!["ritmo", "bajo", "melodia"].includes(paso) || !(n >= 0 && n < COLORES.length)) return false;
    elegir(capaDe(paso), n);
    return true;
  }

  // ---------- Armado ----------

  function armar() {
    armarLaterales();
    armarEstilos();
    armarVelocidad();
    ["ritmo", "bajo", "melodia"].forEach(armarOpciones);
    armarEquilibrio();
    $$("[data-escuchar]").forEach((b) => b.addEventListener("click", alternarPantalla));
    pintarTodo();
  }

  function armarLaterales() {
    const lateral = document.getElementById("tpl-crea-lateral");
    $$("[data-crea-lateral]").forEach((el) => el.replaceWith(lateral.content.cloneNode(true)));
    const flecha = document.getElementById("tpl-flecha-siguiente");
    $$("[data-flecha-siguiente]").forEach((el) => el.replaceWith(flecha.content.cloneNode(true)));
  }

  function armarEstilos() {
    const contenedor = $("#crea-estilo .estilos");
    contenedor.outerHTML = Object.entries(ESTILOS).map(([id, e]) => `
      <button class="a estilo" data-estilo="${id}" aria-pressed="false" aria-label="Estilo ${e.nombre.toLowerCase()}"
              style="left:${e.left}px;top:${e.top}px;--color:${e.color};--posicion:${e.posicion}">
        <img src="assets/${e.foto}" alt="">
        <span class="franja"></span>
        <span class="nombre" style="font-size:${e.tamano || 48}px">${e.nombre}</span>
      </button>`).join("");
    $$("#crea-estilo [data-estilo]").forEach((el) => {
      el.addEventListener("click", () => {
        elegirEstilo(el.dataset.estilo);
        alternarDemo(el.dataset.estilo);
      });
    });
  }

  function elegirEstilo(id) {
    if (estado.estilo === id) return;
    estado.estilo = id;
    estado.bpm = MotorBeat.SONIDOS[id].bpm;
    if (!mezclaTocada) Object.assign(estado.volumen, ESTILOS[id].mezcla);
    aplicarOpciones();
    pintarTodo();
  }

  function armarVelocidad() {
    const perilla = $("#crea-velocidad .perilla-bpm");
    let inicio = null;
    perilla.addEventListener("pointerdown", (e) => {
      perilla.setPointerCapture(e.pointerId);
      inicio = { x: e.clientX, y: e.clientY, bpm: estado.bpm };
    });
    perilla.addEventListener("pointermove", (e) => {
      if (!inicio) return;
      // Arrastrar a la derecha o hacia arriba acelera.
      const delta = (e.clientX - inicio.x - (e.clientY - inicio.y)) / (3 * escalaLienzo());
      cambiarBpm(inicio.bpm + delta);
    });
    const soltar = () => { inicio = null; };
    perilla.addEventListener("pointerup", soltar);
    perilla.addEventListener("pointercancel", soltar);
    perilla.addEventListener("keydown", (e) => {
      const cambios = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
      if (!(e.key in cambios)) return;
      e.preventDefault();
      e.stopPropagation(); // que las flechas no cambien de pantalla
      cambiarBpm(estado.bpm + cambios[e.key]);
    });
    $$("#crea-velocidad [data-bpm]").forEach((b) => {
      b.addEventListener("click", () => cambiarBpm(estado.bpm + Number(b.dataset.bpm)));
    });
  }

  function cambiarBpm(valor) {
    estado.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(valor)));
    bpmTocado = true;
    pintarBpm();
  }

  // Las 3 filas de colores. En Ritmo y Bajo muestran sus casillas; en Melodía, el nombre de cada una.
  function armarOpciones(paso) {
    const contenedor = $(`[data-opciones="${paso}"]`);
    const textoIndicacion = $("[data-opciones-texto]", pantalla(`crea-${paso}`));
    textoIndicacion.dataset.original = textoIndicacion.textContent;
    contenedor.innerHTML = COLORES.map((color, i) => {
      const contenido = paso === "melodia"
        ? `<span class="nombre-opcion">${MELODIAS[i].nombre}</span>`
        : Array.from({ length: PASOS }, (_, c) => `<span class="celda-crea" data-celda="${c}"></span>`).join("");
      return `<button class="opcion-crea ${paso}" data-color="${color}" data-opcion="${i}" aria-pressed="false">${contenido}</button>`;
    }).join("");
    contenedor.addEventListener("click", (e) => {
      const boton = e.target.closest("[data-opcion]");
      if (boton) elegir(capaDe(paso), Number(boton.dataset.opcion));
    });
  }

  function armarEquilibrio() {
    const p = pantalla("crea-equilibrio");
    const separadores = CANALES.slice(1).map((c, i) =>
      `<span class="a separador-crea" style="left:563.5px;top:${(CANALES[i].y + c.y) / 2}px;width:1245.5px"></span>`).join("");
    $(".mezcla-crea", p).outerHTML = separadores + CANALES.map((c) => `
      <p class="texto semi texto-degradado" style="left:617px;top:${c.y - 25}px;font-size:40px">${c.nombre}</p>
      <p class="texto medio violeta" style="left:794px;top:${c.y - 17}px;font-size:25px">Suave</p>
      <div class="a riel-crea" data-canal="${c.id}" role="slider" tabindex="0" aria-label="Volumen de ${c.nombre.toLowerCase()}"
           aria-valuemin="0" aria-valuemax="100" style="left:${RIEL.left}px;top:${c.y - 17.5}px;width:${RIEL.ancho}px;--c:${c.color}">
        <span class="linea"></span><span class="relleno"></span><span class="perilla"></span>
      </div>
      <p class="texto medio violeta" style="left:1583px;top:${c.y - 17}px;font-size:25px">Fuerte</p>
      <p class="texto semi texto-degradado" data-valor="${c.id}" style="left:1693.5px;top:${c.y - 30}px;font-size:40px"></p>
      <button class="a silencio-crea" data-silenciar="${c.id}" aria-pressed="false" aria-label="Silenciar ${c.nombre.toLowerCase()}"
              style="left:1754px;top:${c.y - 15.8}px"><img src="assets/icono-volumen-chico.svg" alt=""></button>`).join("");

    $$(".riel-crea", p).forEach((el) => {
      const canal = el.dataset.canal;
      const desdePuntero = (e) => {
        const r = el.getBoundingClientRect();
        const fraccion = (e.clientX - r.left - (RIEL.perilla / 2) * escalaLienzo()) / (r.width - RIEL.perilla * escalaLienzo());
        estado.volumen[canal] = Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
        mezclaTocada = true;
        pintarEquilibrio();
      };
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture(e.pointerId);
        desdePuntero(e);
      });
      el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) desdePuntero(e); });
      el.addEventListener("keydown", (e) => {
        const cambios = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 };
        if (!(e.key in cambios)) return;
        e.preventDefault();
        e.stopPropagation();
        estado.volumen[canal] = Math.min(100, Math.max(0, estado.volumen[canal] + cambios[e.key]));
        mezclaTocada = true;
        pintarEquilibrio();
      });
    });

    $$("[data-silenciar]", p).forEach((b) => b.addEventListener("click", () => {
      estado.silencio[b.dataset.silenciar] = !estado.silencio[b.dataset.silenciar];
      pintarEquilibrio();
    }));
  }

  // ---------- Dibujo ----------

  function pintarTodo() {
    pintarEstilos();
    pintarBpm();
    pintarRitmo();
    pintarOpciones("bajo");
    pintarOpciones("melodia");
    pintarEquilibrio();
  }

  function pintarLateral(id) {
    const indice = PANTALLAS_PASOS.indexOf(id);
    const p = pantalla(id);
    $("[data-paso-texto]", p).textContent = `Paso ${indice + 1} de 7`;
    $$(".lateral-item", p).forEach((item, i) => {
      item.classList.toggle("actual", i === indice);
      item.classList.toggle("hecho", i < alcanzado && i !== indice);
      item.classList.toggle("pendiente", i > alcanzado);
      if (i === indice) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    $(".anterior-crea", p).hidden = indice === 0;
  }

  function pintarEstilos() {
    $$("#crea-estilo [data-estilo]").forEach((el) => {
      el.setAttribute("aria-pressed", el.dataset.estilo === estado.estilo);
      el.classList.toggle("sonando", modo === "demo" && estiloDemo === el.dataset.estilo);
    });
    $("[data-estilo-texto]").textContent = estado.estilo
      ? `¡Buena elección! Con ${ESTILOS[estado.estilo].nombre.toLowerCase()} voy a usar sus sonidos y arrancar a ${MotorBeat.SONIDOS[estado.estilo].bpm} BPM.`
      : "Escuchalos tranquilo. Con el que elijas, yo ajusto la velocidad y las notas. Tu ritmo se conserva.";
  }

  // Lo que comenta Byte sobre la velocidad elegida.
  function comentarioBpm(bpm) {
    if (bpm < 80) return "tranquilo, ideal para algo relajado, como un lo-fi.";
    if (bpm < 100) return "un pulso para mover la cabeza, como en el hip hop o la cumbia.";
    if (bpm < 120) return "con energía: así late mucho del pop.";
    if (bpm < 135) return "para bailar: es la velocidad típica de la electrónica.";
    return "¡rápido! El trap suele ir por acá, con hi-hats bien seguidos.";
  }

  function pintarBpm() {
    const p = pantalla("crea-velocidad");
    $("[data-bpm-texto]", p).textContent = `${estado.bpm} BPM`;
    const perilla = $(".perilla-bpm", p);
    perilla.setAttribute("aria-valuenow", estado.bpm);
    perilla.setAttribute("aria-valuetext", `${estado.bpm} pulsos por minuto`);
    const angulo = -135 + ((estado.bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 270;
    perilla.style.setProperty("--angulo", `${angulo}deg`);
    perilla.style.setProperty("--pulso", `${60 / estado.bpm}s`);
    $("[data-velocidad-texto]", p).textContent = bpmTocado
      ? `${estado.bpm} BPM: ${comentarioBpm(estado.bpm)}`
      : "¿Tranquilo o más rápido? Movelo y escuchá hasta que te guste.";
  }

  function pintarRitmo() {
    const p = pantalla("crea-ritmo");
    const pieza = PIEZAS_RITMO.find((x) => x.id === piezaActiva);
    $("[data-pieza-nombre]", p).textContent = pieza.nombre;
    $("[data-pieza-texto]", p).textContent = pieza.texto;
    pintarOpciones("ritmo");
  }

  function pintarOpciones(paso) {
    const capa = capaDe(paso);
    const p = pantalla(`crea-${paso}`);
    const indicacion = $("[data-opciones-texto]", p);
    indicacion.textContent = aviso[capa] ? AVISO_ELEGIR : indicacion.dataset.original;
    indicacion.classList.toggle("aviso", Boolean(aviso[capa]));
    const nombre = paso === "ritmo" ? PIEZAS_RITMO.find((x) => x.id === piezaActiva).nombre.toLowerCase() : paso === "bajo" ? "bajo" : "melodía";
    $$("[data-opcion]", p).forEach((boton) => {
      const i = Number(boton.dataset.opcion);
      const elegida = elegidas[capa] === i;
      boton.setAttribute("aria-pressed", elegida);
      boton.setAttribute("aria-label", `Opción ${COLORES[i]} de ${nombre}${paso === "melodia" ? `: ${MELODIAS[i].nombre.toLowerCase()}` : ""}`);
      if (paso === "melodia") return;
      const valores = opcion(capa, i);
      $$("[data-celda]", boton).forEach((celda, c) => {
        const nota = paso === "bajo" ? valores[c] || "" : "";
        celda.classList.toggle("on", Boolean(valores[c]));
        celda.classList.toggle("con-nota", Boolean(nota));
        celda.dataset.nota = nota;
      });
    });
  }

  function pintarEquilibrio() {
    const p = pantalla("crea-equilibrio");
    CANALES.forEach((c) => {
      const v = estado.volumen[c.id];
      const riel = $(`.riel-crea[data-canal="${c.id}"]`, p);
      riel.style.setProperty("--v", v / 100);
      riel.classList.toggle("apagado", estado.silencio[c.id]);
      riel.setAttribute("aria-valuenow", v);
      $(`[data-valor="${c.id}"]`, p).textContent = v;
      const boton = $(`[data-silenciar="${c.id}"]`, p);
      boton.setAttribute("aria-pressed", estado.silencio[c.id]);
      boton.setAttribute("aria-label", `${estado.silencio[c.id] ? "Activar" : "Silenciar"} ${c.nombre.toLowerCase()}`);
    });
  }

  // Qué controla el play de cada pantalla y cómo se llama en cada estado.
  const MODO_PANTALLA = { "crea-estilo": "demo", "crea-velocidad": "pulso" };
  const ETIQUETAS_PLAY = {
    demo: ["Escuchar el estilo elegido", "Detener el estilo"],
    pulso: ["Escuchar el pulso", "Detener el pulso"],
    beat: ["Escuchar tu beat", "Pausar tu beat"],
  };

  function pintarReproduccion() {
    $$("[data-escuchar]").forEach((b) => {
      const suyo = MODO_PANTALLA[b.closest(".screen")?.id] || "beat";
      const sonando = modo === suyo;
      b.setAttribute("aria-pressed", sonando);
      b.style.setProperty("--pulso", `${60 / estado.bpm}s`);
      const texto = $("[data-escuchar-texto]", b);
      if (texto) texto.textContent = ETIQUETAS_PLAY[suyo][sonando ? 1 : 0];
      else b.setAttribute("aria-label", ETIQUETAS_PLAY[suyo][sonando ? 1 : 0]);
    });
    $(".perilla-bpm").classList.toggle("latiendo", modo === "pulso");
    pintarEstilos();
  }

  // Solo toca las casillas cuando cambia el paso (no en cada cuadro de animación). Se marca la fila elegida.
  function marcarPaso(paso) {
    if (paso === marcada) return;
    marcada = paso;
    const p = actual && pantalla(actual);
    if (!p) return;
    $$("[data-celda]", p).forEach((c) => c.classList.toggle("actual", Number(c.dataset.celda) === paso && c.closest('[aria-pressed="true"]') !== null));
  }

  const escalaLienzo = () => Math.min(window.innerWidth / 1920, window.innerHeight / 1080);

  // ---------- Entrada y salida de pantallas ----------

  function alEntrar(id) {
    actual = id;
    pausadoEn = 0; // en cada pantalla nueva, el beat arranca desde el principio
    MotorBeat.cargarMuestras();
    const indice = PANTALLAS_PASOS.indexOf(id);
    if (indice < 0) return;
    alcanzado = Math.max(alcanzado, indice);
    pintarLateral(id);
    Object.keys(aviso).forEach((capa) => delete aviso[capa]);
    const paso = pasoDe(id);
    if (paso === "ritmo") pintarRitmo();
    else if (paso === "bajo" || paso === "melodia") pintarOpciones(paso);
    if (["ritmo", "bajo", "melodia"].includes(paso)) sonarOpcion();
    if (id === "crea-tu-beat") pintarQr();
  }

  function alSalir() {
    cortar(); // también cancela un play que estaba esperando a los sonidos
    marcarPaso(-1);
    actual = null;
  }

  return {
    PANTALLAS,
    armar,
    alEntrar,
    alSalir,
    alternar: alternarPantalla,
    // La pausa de la barra superior: en tu beat recuerda la casilla; el pulso y las demos solo se detienen.
    pausar: () => (modo === "beat" ? pausar() : cortar()),
    frenaAvance,
    // Consola física: el joystick mueve la perilla de velocidad y los faders, los volúmenes del equilibrio.
    sumarBpm: (n) => cambiarBpm(estado.bpm + n),
    ajustarVolumen(canales, valor) {
      canales.forEach((c) => { estado.volumen[c] = Math.round(Math.min(100, Math.max(0, valor))); });
      mezclaTocada = true;
      pintarEquilibrio();
    },
    teclaOpcion: (tecla) => Boolean(actual) && teclaOpcion(tecla),
    vaciar,
    maneja: (id) => PANTALLAS.includes(id),
  };
})();

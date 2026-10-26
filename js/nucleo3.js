/* Beatmind · Núcleo 3: creá tu propio beat en 7 pasos, acompañado por Byte.
   El sonido del beat vive en motor-beat.js (lo comparte con beat.html, la página que se abre con el QR).

   Cómo propone Byte (regla central, igual que en la app BeatMind):
   1. Pregunta si querés una idea.  2. La prepara sin aplicarla.  3. La podés escuchar y comparar con tu versión.
   4. Solo «Sí, usar esta idea» la aplica, y reemplaza únicamente esa parte. «No, seguir con mi versión» la descarta.
   Un cambio manual invalida la propuesta abierta, no se avanza mientras estás decidiendo y todo se puede deshacer.
   Las propuestas salen de un motor local que combina al azar ritmos, recorridos de notas y variaciones
   (melodías con cadenas de Markov). No es una IA entrenada ni está conectado a un servicio externo. */

const Nucleo3 = (() => {
  const { PASOS, NOTAS, VOLUMEN_INICIAL } = MotorBeat;
  const PANTALLAS_PASOS = ["crea-estilo", "crea-velocidad", "crea-ritmo", "crea-bajo", "crea-melodia", "crea-equilibrio", "crea-tu-beat"];
  const PANTALLAS = ["crea", "crea-tiempo", "crea-base", "crea-etapas", ...PANTALLAS_PASOS];
  const BPM_MIN = 60;
  const BPM_MAX = 160;
  const NOMBRE_BEAT = "Mi primer beat"; // la instalación no tiene teclado: todos los beats se llaman igual

  /* Dirección pública del sitio, para el QR cuando la infografía se abre en esta compu (localhost o archivo).
     Si se abre desde una dirección de la red o de internet, el QR usa esa misma dirección. */
  const URL_PUBLICA = "https://franciscoruizfda.github.io/Taller-Tp4-Final/";

  /* Datos de cada estilo para la pantalla y para Byte.
     ideasRitmo: patrones base que Byte varía. ritmosBajo: qué ritmos de bajo le quedan bien.
     quinta: qué tanto el bajo alterna con la quinta (en la cumbia, mucho). */
  const ESTILOS = {
    trap: {
      nombre: "TRAP", color: "#00ff89", foto: "estilo-trap.png", posicion: "44% center",
      left: 480, top: 285.11,
      ideasRitmo: {
        bombo: [[0, 7, 10], [0, 3, 10], [0, 6, 11, 14], [0, 10], [0, 7, 9, 14]],
        caja: [[8], [8, 15], [4, 12], [8, 14]],
        hihat: [[0, 2, 4, 6, 8, 10, 12, 13, 14, 15], [0, 2, 4, 6, 8, 10, 12, 14], [0, 1, 2, 4, 6, 7, 8, 10, 12, 14, 15], [0, 2, 3, 4, 6, 8, 9, 10, 12, 14]],
      },
      demo: {
        bajo: { 0: "Re", 7: "Re", 10: "Fa" },
        melodia: { 0: "La", 3: "Sol", 6: "Fa", 8: "Re", 11: "Mi", 14: "Fa" },
      },
      ritmosBajo: ["bombo", "bomboYPaso", "largas", "sincopa"],
      quinta: 0.2,
      mezcla: { bombo: 80, caja: 70, hihat: 45, bajo: 90, melodia: 55 },
      mezclaTexto: "En el trap manda el 808: subo el bajo y bajo un poco los hi-hats y la melodía.",
    },
    pop: {
      nombre: "POP", color: "#0084ff", foto: "estilo-pop.png", posicion: "54% center",
      left: 809, top: 286.93,
      ideasRitmo: {
        bombo: [[0, 8, 10], [0, 6, 8], [0, 3, 8, 11], [0, 4, 8, 12], [0, 7, 8]],
        caja: [[4, 12], [4, 12, 15], [4, 10, 12], [4, 12, 14]],
        hihat: [[0, 2, 4, 6, 8, 10, 12, 14], [2, 6, 10, 14], [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]],
      },
      demo: {
        bajo: { 0: "Re", 6: "Re", 8: "Fa", 12: "Sol" },
        melodia: { 0: "Re", 2: "Mi", 4: "Fa", 6: "La", 8: "Sol", 12: "Fa", 14: "Mi" },
      },
      ritmosBajo: ["bombo", "negras", "corcheas", "sincopa", "bomboYPaso"],
      quinta: 0.25,
      mezcla: { bombo: 75, caja: 75, hihat: 55, bajo: 65, melodia: 80 },
      mezclaTexto: "En el pop la melodía tiene que destacarse: la subo y dejo el bajo de apoyo.",
    },
    cumbia: {
      nombre: "CUMBIA", color: "#675180", foto: "estilo-cumbia.jpg", posicion: "42% center",
      left: 1140.5, top: 287.69,
      ideasRitmo: {
        bombo: [[0, 3, 8, 11], [0, 8], [0, 4, 8, 12], [0, 3, 4, 8, 11, 12]],
        caja: [[4, 12, 14], [4, 12], [2, 6, 10, 14], [4, 7, 12, 15]],
        hihat: [[0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], [0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 7, 8, 11, 12, 15], [2, 3, 6, 7, 10, 11, 14, 15]],
      },
      demo: {
        bajo: { 0: "Re", 4: "La", 8: "Re", 12: "La" },
        melodia: { 0: "La", 2: "Sol", 4: "Fa", 6: "Mi", 8: "Fa", 10: "Sol", 12: "La", 14: "Re" },
      },
      ritmosBajo: ["cumbia", "negras", "galope", "sincopa"],
      quinta: 0.65,
      mezcla: { bombo: 70, caja: 65, hihat: 75, bajo: 75, melodia: 80 },
      mezclaTexto: "En la cumbia el güiro y el acordeón son protagonistas: les doy más presencia.",
    },
    electronica: {
      nombre: "ELECTRÓNICA", color: "#9ec5f4", foto: "estilo-electronica.png", posicion: "57% 37.5%",
      left: 1471, top: 286.93, tamano: 36,
      ideasRitmo: {
        bombo: [[0, 4, 8, 12], [0, 4, 8, 12, 14], [0, 4, 7, 8, 12], [0, 4, 8, 11, 12]],
        caja: [[4, 12], [4, 12, 13], [4, 11, 12], [4, 12, 15]],
        hihat: [[2, 6, 10, 14], [0, 2, 4, 6, 8, 10, 12, 14], [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], [2, 3, 6, 7, 10, 11, 14, 15]],
      },
      demo: {
        bajo: { 2: "Re", 6: "Re", 10: "Re", 14: "Re" },
        melodia: { 0: "Re", 3: "Re", 6: "Fa", 8: "Re", 11: "Mi", 14: "La" },
      },
      ritmosBajo: ["contratiempo", "corcheas", "galope", "negras"],
      quinta: 0.3,
      mezcla: { bombo: 90, caja: 70, hihat: 55, bajo: 75, melodia: 55 },
      mezclaTexto: "En la electrónica el bombo empuja la pista: lo pongo al frente.",
    },
  };

  const PIEZAS_RITMO = [
    { id: "bombo", nombre: "BOMBO", articulo: "el bombo", color: "#cc4bff", left: 528.1, texto: "Suele marcar los apoyos principales del ritmo. Probá un golpe al principio y otro en la mitad." },
    { id: "caja", nombre: "CAJA", articulo: "la caja", color: "#0084ff", left: 941.56, texto: "Le responde al bombo y marca acentos. Probá ponerla entre los golpes profundos." },
    { id: "hihat", nombre: "HI-HAT", articulo: "el hi-hat", color: "#00ff89", left: 1355.37, texto: "Son pequeños golpes que dan movimiento. Pueden sonar más seguido que el bombo y la caja." },
  ];

  // Filas de la pantalla de equilibrio: y = centro de la fila.
  const CANALES = [
    { id: "bombo", nombre: "BOMBO", color: "#00ff89", y: 425 },
    { id: "caja", nombre: "CAJA", color: "#e678eb", y: 488 },
    { id: "hihat", nombre: "HI-HAT", color: "#0084ff", y: 551 },
    { id: "bajo", nombre: "BAJO", color: "#675180", y: 614 },
    { id: "melodia", nombre: "MELODÍA", color: "#9ec5f4", y: 677 },
  ];
  const RIEL = { left: 907.88, ancho: 647, perilla: 19 };

  // ---------- Material del motor de ideas ----------

  // Ritmos de bajo. pasos(): en qué casillas suena (algunos siguen al bombo).
  const RITMOS_BAJO = {
    bombo: { texto: "Sigue a tu bombo", conBombo: true, pasos: (bombo) => bombo },
    bomboYPaso: { texto: "Sigue a tu bombo y suma notas de paso", conBombo: true, pasos: (bombo) => [...new Set([...bombo, ...bombo.map((p) => (p + 14) % PASOS).filter((p) => azar() < 0.6)])] },
    negras: { texto: "Toca una nota en cada tiempo", pasos: () => [0, 4, 8, 12] },
    corcheas: { texto: "Camina con notas parejas", pasos: () => [0, 2, 4, 6, 8, 10, 12, 14].filter((p) => p % 4 === 0 || azar() < 0.8) },
    contratiempo: { texto: "Suena a contratiempo, entre los golpes", pasos: () => [2, 6, 10, 14] },
    sincopa: { texto: "Va sincopado, con golpes corridos", pasos: () => [0, 3, 6, 8, 11, 14] },
    largas: { texto: "Sostiene todo con pocas notas largas", pasos: () => elegir([[0, 8], [0, 6, 8], [0, 10]]) },
    galope: { texto: "Galopa y empuja hacia adelante", pasos: () => [0, 3, 4, 7, 8, 11, 12, 15] },
    cumbia: { texto: "Rebota como en la cumbia", pasos: () => elegir([[0, 4, 6, 8, 12, 14], [0, 4, 8, 12], [0, 3, 4, 8, 11, 12]]) },
  };

  // Recorridos de notas: una nota base por cada tiempo del compás.
  const PROGRESIONES = [
    { notas: ["Re", "Re", "Fa", "Sol"], texto: "sube de a poco" },
    { notas: ["Re", "Fa", "Sol", "Fa"], texto: "sube y vuelve" },
    { notas: ["Re", "La", "Sol", "Fa"], texto: "salta y después baja" },
    { notas: ["La", "Sol", "Fa", "Mi"], texto: "baja escalón por escalón" },
    { notas: ["Re", "Sol", "Fa", "Mi"], texto: "sube de golpe y vuelve despacio" },
    { notas: ["Fa", "Sol", "La", "Re"], texto: "sube hasta arriba y cae" },
    { notas: ["Re", "Re", "La", "La"], texto: "se queda firme en dos notas" },
    { notas: ["Re", "Mi", "Fa", "Sol"], texto: "sube escalón por escalón" },
    { notas: ["Sol", "Fa", "Re", "Re"], texto: "baja y descansa" },
    { notas: ["Re", "Fa", "La", "Sol"], texto: "trepa y se asoma" },
    { notas: ["Mi", "Fa", "Sol", "Re"], texto: "sube y vuelve a casa" },
  ];
  const QUINTA = { Re: "La", Mi: "Sol", Fa: "La", Sol: "Re", La: "Mi" };

  // Melodías: un motivo de 8 pasos (en qué casillas suena) que se repite con variación.
  const RITMOS_MELODIA = [
    { pasos: [0, 6], texto: "Pocas notas largas, con aire.", aire: true },
    { pasos: [0, 4], texto: "Dos notas por frase, tranquila.", aire: true },
    { pasos: [0, 2, 3, 6], texto: "Una frase saltarina." },
    { pasos: [0, 1, 2, 4, 6], texto: "Notas cortas, con mucho movimiento." },
    { pasos: [1, 3, 6], texto: "Acentos a contratiempo que sorprenden." },
    { pasos: [0, 2, 4, 6], texto: "Un ritmo parejo, fácil de tararear." },
    { pasos: [0, 3, 6, 7], texto: "Una síncopa pegadiza." },
    { pasos: [0, 3, 5], texto: "Un motivo corto que se repite." },
  ];
  const CONTORNOS = [
    { id: "sube", texto: "La frase sube." },
    { id: "baja", texto: "La frase baja." },
    { id: "arco", texto: "Sube y vuelve a bajar." },
    { id: "respuesta", texto: "La segunda mitad le responde a la primera." },
    { id: "secuencia", texto: "La segunda mitad repite la idea un escalón más arriba." },
  ];
  // Cadena de Markov entre las 5 notas (0 = Re … 4 = La), con más peso en las que combinan.
  const TRANSICIONES = [[0, 2, 2, 4, 1], [0, 2, 2], [1, 3, 4, 0, 2], [2, 4, 2, 1], [3, 2, 0, 4]];

  // Byte: pose de cada paso cuando pregunta y de cada momento.
  const POSE_PASO = { ritmo: "byte-festeja.webp", bajo: "byte-agachado.webp", melodia: "byte-idea.webp", equilibrio: "byte-equilibrio.png" };
  const POSE = { propuesta: "byte-presenta.webp", rechazada: "byte-tranqui.webp", libre: "byte-tranqui.webp", aceptada: "byte-aplaude.webp", invalidada: "byte-idea.webp" };

  // ---------- Estado ----------

  const estado = MotorBeat.vacioInicial();
  let piezaActiva = "bombo";
  const notaActiva = { bajo: "Re", melodia: "Re" };
  let bpmTocado = false;

  /* propuesta = { paso, cambios, origen, explicacion }: vive aparte de estado hasta que la aceptás.
     origen es una foto del beat al prepararla; si el beat cambió, ya no se puede aceptar. */
  let propuesta = null;
  const byte = { ritmo: "pregunta", bajo: "pregunta", melodia: "pregunta", equilibrio: "pregunta" };
  const aviso = {}; // texto especial para un paso (por ejemplo, al intentar avanzar mientras decidís)
  const ideasRecientes = {}; // para que una idea nueva no repita las últimas que mostró Byte
  let semilla = Date.now() >>> 0;
  let historial = []; // deshacer: fotos del beat antes de cada cambio

  let alcanzado = -1; // paso más lejano al que se llegó
  let actual = null;
  let modo = null; // "beat" | "propuesta" | "pulso" | "demo" mientras suena
  let estiloDemo = null;
  let pasoSonando = -1; // casilla que está sonando ahora
  let pausadoEn = 0; // casilla desde la que retoma el play después de una pausa
  let marcada = -1; // casilla resaltada en pantalla
  let pedido = 0;
  let esperando = false; // se tocó play y se están terminando de cargar los sonidos
  let timerReinicio = 0;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const pantalla = (id) => document.getElementById(id);
  const estiloActual = () => MotorBeat.estiloDe(estado);
  const pasoDe = (id) => id?.replace("crea-", "");
  const vacio = () => Array(PASOS).fill(null);

  // ---------- Datos del beat ----------

  const foto = () => JSON.stringify({ ritmo: estado.ritmo, bajo: estado.bajo, melodia: estado.melodia, volumen: estado.volumen, silencio: estado.silencio });

  function restaurar(texto) {
    const datos = JSON.parse(texto);
    Object.assign(estado, { ritmo: datos.ritmo, bajo: datos.bajo, melodia: datos.melodia });
    Object.assign(estado.volumen, datos.volumen);
    Object.assign(estado.silencio, datos.silencio);
  }

  // Antes de cualquier cambio: se guarda para deshacer y se invalida la propuesta abierta.
  function antesDeCambiar({ manual = true } = {}) {
    historial.push(foto());
    if (historial.length > 60) historial.shift();
    if (manual && propuesta) invalidarPropuesta();
  }

  function deshacer() {
    const anterior = historial.pop();
    if (!anterior) return;
    if (propuesta) invalidarPropuesta();
    restaurar(anterior);
    pintarTodo();
  }

  // El beat con la propuesta encima, para escucharla sin tocar lo tuyo.
  function conPropuesta() {
    if (!propuesta) return estado;
    const { cambios } = propuesta;
    return {
      ...estado,
      ritmo: cambios.ritmo ? { ...estado.ritmo, ...cambios.ritmo } : estado.ritmo,
      bajo: cambios.bajo || estado.bajo,
      melodia: cambios.melodia || estado.melodia,
      volumen: cambios.volumen ? { ...estado.volumen, ...cambios.volumen } : estado.volumen,
      silencio: cambios.silencio ? { ...estado.silencio, ...cambios.silencio } : estado.silencio,
    };
  }

  const golpesRitmo = () => Object.values(estado.ritmo).reduce((n, f) => n + f.filter(Boolean).length, 0);
  const golpesBombo = () => estado.ritmo.bombo.flatMap((on, i) => (on ? [i] : []));

  // ---------- Sonido ----------

  function datosDemo(estilo) {
    const e = ESTILOS[estilo];
    const ritmo = {};
    for (const pieza of ["bombo", "caja", "hihat"]) {
      ritmo[pieza] = Array.from({ length: PASOS }, (_, i) => e.ideasRitmo[pieza][0].includes(i));
    }
    const notas = (mapa) => Array.from({ length: PASOS }, (_, i) => mapa[i] || null);
    return { ...estado, estilo, ritmo, bajo: notas(e.demo.bajo), melodia: notas(e.demo.melodia) };
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
          const datos = demo || (nuevoModo === "propuesta" ? conPropuesta() : estado);
          MotorBeat.tocarPaso(datos, (desde + n) % PASOS, t, salidas);
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

  // Lo que hace el play de abajo (y el de la barra superior o la barra espaciadora) en cada pantalla:
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

  function previsualizar(pieza, nota) {
    MotorBeat.cargarMuestras();
    const canal = pieza === "bajo" ? "bajo" : pieza === "melodia" ? "melodia" : "bateria";
    Sonido.alInstante(canal, (t, destino) => MotorBeat.disparar(estado, pieza, t, destino, nota, MotorBeat.segundosPorPaso(estado) * 2));
  }

  async function guardar(boton) {
    const texto = $("[data-guardar-texto]", boton);
    if (MotorBeat.beatVacio(estado)) {
      pintarTuBeat();
      return;
    }
    boton.disabled = true;
    texto.textContent = "Preparando el audio…";
    try {
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(await MotorBeat.aWav(estado));
      enlace.download = `${NOMBRE_BEAT}.wav`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
      texto.textContent = "¡Listo! Tu beat se descargó";
      $("[data-tu-beat-texto]").textContent = "¡Lo hiciste vos! Yo solo te acompañé.";
    } catch (e) {
      console.error(e);
      texto.textContent = "No se pudo guardar. Probá de nuevo";
    }
    boton.disabled = false;
    setTimeout(() => { texto.textContent = "Guardar mi beat como audio"; }, 3500);
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
      texto.textContent = "Cuando tu beat tenga sonidos, acá aparece el código para llevártelo.";
      return;
    }
    const qr = qrcode(0, "M");
    qr.addData(direccionCompartir());
    qr.make();
    caja.classList.remove("vacio");
    caja.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    caja.dataset.url = direccionCompartir();
    texto.textContent = "Escaneá con tu celular para escuchar y descargar tu beat";
  }

  // Deja todo como al principio para la próxima persona y vuelve a la portada.
  function reiniciar(boton) {
    const texto = $("[data-reiniciar-texto]", boton);
    if (!boton.classList.contains("confirmar")) {
      boton.classList.add("confirmar");
      texto.textContent = "¿Seguro? Tocá de nuevo para empezar de cero";
      clearTimeout(timerReinicio);
      timerReinicio = setTimeout(() => {
        boton.classList.remove("confirmar");
        texto.textContent = "Empezar un beat nuevo";
      }, 4000);
      return;
    }
    clearTimeout(timerReinicio);
    boton.classList.remove("confirmar");
    texto.textContent = "Empezar un beat nuevo";
    vaciar();
    location.hash = "#inicio";
  }

  // Deja el núcleo 3 vacío, como lo encuentra una persona nueva (también al volver al inicio desde el cierre).
  function vaciar() {
    cortar();
    Object.assign(estado, MotorBeat.vacioInicial());
    propuesta = null;
    historial = [];
    alcanzado = -1;
    piezaActiva = "bombo";
    notaActiva.bajo = notaActiva.melodia = "Re";
    bpmTocado = false;
    pausadoEn = 0;
    Object.keys(byte).forEach((paso) => { byte[paso] = "pregunta"; delete aviso[paso]; });
    pintarTodo();
  }

  // ---------- Motor de ideas de Byte ----------

  function azar() {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0;
    return semilla / 4294967296;
  }
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const vecina = (nota, salto) => NOTAS[Math.min(NOTAS.length - 1, Math.max(0, NOTAS.indexOf(nota) + salto))];

  function ideaRitmo(pieza, e) {
    const base = elegir(e.ideasRitmo[pieza]);
    const fila = Array.from({ length: PASOS }, (_, i) => base.includes(i));
    const extras = [];
    if (pieza === "hihat") {
      if (azar() < 0.5) {
        const inicio = elegir([5, 11, 13, 14]);
        for (let k = 0; k < elegir([2, 3]); k++) fila[(inicio + k) % PASOS] = true;
        extras.push("un redoble");
      }
      if (azar() < 0.3) {
        const golpes = fila.flatMap((on, i) => (on && i % 4 ? [i] : []));
        if (golpes.length > 3) fila[elegir(golpes)] = false;
      }
    } else if (pieza === "bombo") {
      if (azar() < 0.5) { fila[elegir([3, 6, 11, 13, 15])] = true; extras.push("un golpe de más"); }
      if (azar() < 0.25) {
        const golpes = fila.flatMap((on, i) => (on && i ? [i] : []));
        if (golpes.length > 1) fila[elegir(golpes)] = false;
      }
    } else if (azar() < 0.45) {
      fila[elegir([7, 11, 14, 15])] = true;
      extras.push("un golpe fantasma");
    }
    const golpes = fila.filter(Boolean).length;
    const descripcion = `${golpes} ${golpes === 1 ? "golpe" : "golpes"}${extras.length ? `, con ${extras.join(" y ")}` : ""}`;
    return { fila, descripcion };
  }

  function ideaBajo(e) {
    const bombo = golpesBombo();
    const ritmos = e.ritmosBajo.filter((id) => !RITMOS_BAJO[id].conBombo || bombo.length);
    const ritmo = RITMOS_BAJO[elegir(ritmos.length ? ritmos : ["negras"])];
    const progresion = elegir(PROGRESIONES);
    const pasos = ritmo.pasos(bombo).sort((a, b) => a - b);
    const notas = vacio();
    pasos.forEach((paso, k) => {
      const tiempo = Math.floor(paso / 4);
      const raiz = progresion.notas[tiempo];
      let nota = raiz;
      const primeraDelTiempo = k === 0 || Math.floor(pasos[k - 1] / 4) !== tiempo;
      if (!primeraDelTiempo && azar() < e.quinta) nota = QUINTA[raiz];
      // Nota de paso: justo antes de cambiar de tiempo, se acerca a la nota que viene.
      const siguiente = progresion.notas[(tiempo + 1) % 4];
      if (paso % 4 === 3 && siguiente !== raiz && azar() < 0.4) nota = vecina(siguiente, NOTAS.indexOf(siguiente) > NOTAS.indexOf(raiz) ? -1 : 1);
      notas[paso] = nota;
    });
    return { notas, descripcion: `${ritmo.texto} y su recorrido ${progresion.texto}.` };
  }

  function ideaMelodia() {
    // Un ritmo cargado pide pocas notas; uno con aire admite una frase más movida.
    const cargado = golpesRitmo() > 16;
    const ritmo = elegir(RITMOS_MELODIA.filter((r) => !cargado || r.aire || azar() < 0.3));
    const contorno = elegir(CONTORNOS);
    const motivo = [];
    let grado = contorno.id === "baja" ? elegir([3, 4]) : contorno.id === "sube" ? elegir([0, 1]) : elegir([0, 1, 2]);
    ritmo.pasos.forEach((_, k) => {
      motivo.push(grado);
      const siguientes = TRANSICIONES[grado];
      let proximo = siguientes[Math.floor(azar() * siguientes.length)];
      const subir = contorno.id === "sube" || (contorno.id === "arco" && k < ritmo.pasos.length / 2);
      const bajar = contorno.id === "baja" || (contorno.id === "arco" && k >= ritmo.pasos.length / 2);
      if (subir && proximo < grado && azar() < 0.7) proximo = Math.min(4, grado + 1);
      if (bajar && proximo > grado && azar() < 0.7) proximo = Math.max(0, grado - 1);
      grado = proximo;
    });
    // La segunda mitad repite el ritmo: igual, contestando (termina en Re) o un escalón más arriba.
    const segunda = motivo.map((g, k) => {
      if (contorno.id === "secuencia") return Math.min(4, g + 1);
      if (k === motivo.length - 1) return contorno.id === "respuesta" ? 0 : elegir([0, g, Math.max(0, g - 1)]);
      return contorno.id === "respuesta" && azar() < 0.4 ? TRANSICIONES[g][0] : g;
    });
    const notas = vacio();
    ritmo.pasos.forEach((p, k) => {
      notas[p] = NOTAS[motivo[k]];
      notas[p + 8] = NOTAS[segunda[k]];
    });
    return { notas, descripcion: `${ritmo.texto} ${contorno.texto}` };
  }

  // Genera hasta encontrar una idea distinta de las últimas que mostró y de lo que ya tenés.
  function sinRepetir(clave, actualTexto, generar) {
    const recientes = (ideasRecientes[clave] ||= []);
    let idea, texto;
    for (let intento = 0; intento < 25; intento++) {
      idea = generar();
      texto = JSON.stringify(idea.valor);
      if (!recientes.includes(texto) && texto !== actualTexto) break;
    }
    recientes.push(texto);
    if (recientes.length > 6) recientes.shift();
    return idea;
  }

  function prepararPropuesta(paso) {
    const e = ESTILOS[estiloActual()];
    let cambios, explicacion;
    if (paso === "ritmo") {
      const pieza = PIEZAS_RITMO.find((x) => x.id === piezaActiva);
      const idea = sinRepetir(pieza.id, JSON.stringify(estado.ritmo[pieza.id]), () => {
        const r = ideaRitmo(pieza.id, e);
        return { valor: r.fila, descripcion: r.descripcion };
      });
      cambios = { ritmo: { [pieza.id]: idea.valor } };
      explicacion = `Un patrón de ${pieza.nombre.toLowerCase()} de ${idea.descripcion}. Cambia solo ${pieza.articulo}.`;
    } else if (paso === "bajo") {
      const idea = sinRepetir("bajo", JSON.stringify(estado.bajo), () => {
        const b = ideaBajo(e);
        return { valor: b.notas, descripcion: b.descripcion };
      });
      cambios = { bajo: idea.valor };
      explicacion = `${idea.descripcion} Cambia solo tu bajo.`;
    } else if (paso === "melodia") {
      const idea = sinRepetir("melodia", JSON.stringify(estado.melodia), () => {
        const m = ideaMelodia();
        return { valor: m.notas, descripcion: m.descripcion };
      });
      cambios = { melodia: idea.valor };
      explicacion = `${idea.descripcion} Cambia solo tu melodía.`;
    } else {
      cambios = { volumen: { ...e.mezcla }, silencio: Object.fromEntries(CANALES.map((c) => [c.id, false])) };
      explicacion = `${e.mezclaTexto} Cambia solo los volúmenes.`;
    }
    return { paso, cambios, explicacion, origen: foto() };
  }

  function pedirIdea(paso = pasoDe(actual)) {
    if (!(paso in byte)) return false;
    if (Sonido.sonando) Sonido.detener();
    propuesta = prepararPropuesta(paso);
    byte[paso] = "propuesta";
    delete aviso[paso];
    pintarPaso(paso);
    return true;
  }

  function usarIdea() {
    if (!propuesta) return;
    const { paso, cambios, origen } = propuesta;
    if (origen !== foto()) {
      invalidarPropuesta();
      return;
    }
    Sonido.detener();
    delete aviso[paso];
    antesDeCambiar({ manual: false });
    if (cambios.ritmo) Object.assign(estado.ritmo, cambios.ritmo);
    if (cambios.bajo) estado.bajo = cambios.bajo;
    if (cambios.melodia) estado.melodia = cambios.melodia;
    if (cambios.volumen) Object.assign(estado.volumen, cambios.volumen);
    if (cambios.silencio) Object.assign(estado.silencio, cambios.silencio);
    propuesta = null;
    byte[paso] = "aceptada";
    pintarTodo();
  }

  function rechazarIdea() {
    if (!propuesta) return;
    const { paso } = propuesta;
    if (modo === "propuesta") Sonido.detener();
    propuesta = null;
    delete aviso[paso];
    byte[paso] = "rechazada";
    pintarPaso(paso);
  }

  function invalidarPropuesta() {
    const { paso } = propuesta;
    if (modo === "propuesta") Sonido.detener();
    propuesta = null;
    delete aviso[paso];
    byte[paso] = "invalidada";
    pintarPaso(paso);
  }

  function descartarPropuesta() {
    if (!propuesta) return;
    const { paso } = propuesta;
    propuesta = null;
    byte[paso] = "pregunta";
  }

  // Lo que dice Byte en cada momento: { titulo, texto, respuestas: [[accion, etiqueta, clase]] }.
  function mensajeByte(paso) {
    const pieza = PIEZAS_RITMO.find((x) => x.id === piezaActiva);
    const pregunta = {
      ritmo: `¿Querés que te proponga unas casillas para ${pieza.articulo}?`,
      bajo: golpesBombo().length ? "¿Querés que prepare un bajo que acompañe a tu bombo?" : "¿Querés que prepare un bajo para tu beat?",
      melodia: "¿Querés que prepare una melodía para tu beat?",
      equilibrio: "¿Querés escuchar una propuesta para equilibrar tu beat?",
    }[paso];
    const base = mensajeBase(paso, pregunta);
    return aviso[paso] ? { ...base, ...aviso[paso] } : base;
  }

  function mensajeBase(paso, pregunta) {
    const mostrame = ["idea", "Sí, mostrame una idea", ""];
    const otra = ["idea", "Ver otra propuesta", ""];
    switch (byte[paso]) {
      case "propuesta":
        return {
          titulo: "Te preparé una idea. ¿La usamos?",
          texto: `${propuesta.explicacion} Tu beat no cambia hasta que digas que sí.`,
          respuestas: [
            ["escuchar", modo === "propuesta" ? "Detener propuesta" : "Escuchar propuesta", "oscuro"],
            ["usar", "Sí, usar esta idea", ""],
            ["rechazar", "No, seguir con mi versión", "verde"],
          ],
        };
      case "rechazada":
        return { titulo: "Seguimos con tu idea.", texto: "No cambié nada de tu beat. Si querés, te muestro otra distinta.", respuestas: [otra] };
      case "aceptada":
        return { titulo: "¡Listo, la sumé!", texto: "Podés editarla, deshacerla o pedirme otra distinta.", respuestas: [otra] };
      case "invalidada":
        return { titulo: "Tu beat cambió.", texto: "Guardé tu versión. Pedime una nueva idea para trabajar sobre lo que hiciste.", respuestas: [mostrame] };
      case "libre":
        return { titulo: "¡Dale, probá vos!", texto: paso === "equilibrio" ? "Mové los controles y escuchá cómo cambia. Si te trabás, pedime una idea." : "Tocá casillas y escuchá cómo cambia. Si te trabás, pedime una idea.", respuestas: [["idea", "Mostrame una idea", ""]] };
      default:
        return { titulo: pregunta, texto: "La escuchás con tu beat y vos elegís si la usamos.", respuestas: [mostrame, ["libre", "Prefiero probar por mi cuenta", "verde"]] };
    }
  }

  function responderByte(paso, accion) {
    if (accion === "idea") pedirIdea(paso);
    else if (accion === "escuchar") alternar("propuesta");
    else if (accion === "usar") usarIdea();
    else if (accion === "rechazar") rechazarIdea();
    else if (accion === "libre") {
      byte[paso] = "libre";
      pintarPaso(paso);
    }
  }

  // ---------- Avance entre pasos ----------

  /* Se llama al tocar «siguiente» o «anterior». Devuelve true si Byte frena el cambio de pantalla:
     mientras decidís una propuesta, si falta elegir el estilo o al recorrer bombo → caja → hi-hat. */
  function frenaAvance(direccion) {
    const paso = pasoDe(actual);
    if (direccion > 0 && propuesta && propuesta.paso === paso) {
      aviso[paso] = { titulo: "Antes de seguir, decidí:", texto: "¿Usamos la idea o seguimos con tu versión?" };
      pintarByte(paso);
      return true;
    }
    if (actual === "crea-estilo" && direccion > 0 && !estado.estilo) {
      $("[data-estilo-texto]").textContent = "Primero elegí un estilo tocando una tarjeta. Escuchar no lo agrega: se elige al tocarla.";
      return true;
    }
    if (actual === "crea-ritmo") {
      const i = PIEZAS_RITMO.findIndex((x) => x.id === piezaActiva);
      const destino = PIEZAS_RITMO[i + direccion];
      if (destino) {
        cambiarPieza(destino.id);
        return true;
      }
      if (direccion > 0 && !golpesRitmo()) {
        aviso.ritmo = { titulo: "Tu ritmo todavía está vacío.", texto: "Encendé al menos una casilla, o pedime una idea para empezar.", respuestas: [["idea", "Sí, mostrame una idea", ""]] };
        pintarByte("ritmo");
        return true;
      }
    }
    return false;
  }

  // ---------- Armado ----------

  function armar() {
    armarLaterales();
    armarEstilos();
    armarVelocidad();
    armarRitmo();
    ["bajo", "melodia"].forEach(armarNotas);
    armarEquilibrio();
    armarTuBeat();
    $$("[data-escuchar]").forEach((b) => b.addEventListener("click", alternarPantalla));
    $$("[data-deshacer]").forEach((b) => b.addEventListener("click", deshacer));
    $$("[data-byte]").forEach((card) => {
      card.innerHTML = `
        <img class="byte-pose" alt="">
        <div class="byte-globo" role="status">
          <p class="byte-mensaje"><strong class="byte-titulo"></strong> <span class="byte-texto"></span></p>
          <div class="byte-respuestas"></div>
        </div>`;
      card.addEventListener("click", (e) => {
        const boton = e.target.closest("[data-responder]");
        if (boton) responderByte(card.dataset.byte, boton.dataset.responder);
      });
    });
    pintarTodo();
  }

  function armarLaterales() {
    const plantilla = document.getElementById("tpl-crea-lateral");
    $$("[data-crea-lateral]").forEach((el) => el.replaceWith(plantilla.content.cloneNode(true)));
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
    pintarEstilos();
    pintarBpm();
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
    });  }

  function cambiarBpm(valor) {
    estado.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(valor)));
    bpmTocado = true;
    pintarBpm();
  }

  function armarRitmo() {
    const p = pantalla("crea-ritmo");
    $(".pestanas", p).outerHTML = PIEZAS_RITMO.map((pieza) => `
      <button class="a pestana" data-pieza="${pieza.id}" aria-pressed="false"
              style="left:${pieza.left}px;top:347.29px;--c:${pieza.color}">
        <span class="texto-degradado">${pieza.nombre}</span>
      </button>`).join("");
    $$("[data-pieza]", p).forEach((b) => b.addEventListener("click", () => {
      cambiarPieza(b.dataset.pieza);
      previsualizar(piezaActiva);
    }));
    armarCeldas("ritmo");
  }

  // Cada sonido tiene su propia conversación con Byte: al cambiar de sonido se descarta la propuesta abierta.
  function cambiarPieza(id) {
    if (id === piezaActiva) return;
    if (propuesta?.paso === "ritmo" && modo === "propuesta") Sonido.detener();
    if (propuesta?.paso === "ritmo") propuesta = null;
    piezaActiva = id;
    byte.ritmo = "pregunta";
    delete aviso.ritmo;
    pintarRitmo();
  }

  function armarCeldas(capa) {
    const contenedor = $(`[data-celdas="${capa}"]`);
    contenedor.innerHTML = Array.from({ length: PASOS }, (_, i) =>
      `<button class="celda-crea" data-celda="${i}" aria-pressed="false"></button>`).join("");
    contenedor.addEventListener("click", (e) => {
      const celda = e.target.closest("[data-celda]");
      if (!celda) return;
      const i = Number(celda.dataset.celda);
      antesDeCambiar();
      if (capa === "ritmo") {
        const fila = estado.ritmo[piezaActiva];
        fila[i] = !fila[i];
        if (fila[i] && !Sonido.sonando) previsualizar(piezaActiva);
        if (aviso.ritmo && golpesRitmo()) delete aviso.ritmo;
      } else {
        const nota = notaActiva[capa];
        estado[capa][i] = estado[capa][i] === nota ? null : nota;
        if (estado[capa][i] && !Sonido.sonando) previsualizar(capa, nota);
      }
      pintarCeldas(capa);
      pintarByte(capa);
      pintarDeshacer();
    });
  }

  function armarNotas(capa) {
    const contenedor = $(`[data-notas="${capa}"]`);
    contenedor.innerHTML = NOTAS.map((nota, i) => `
      <button class="nota-boton" data-nota="${nota}" aria-pressed="false" aria-label="Nota ${nota}"
              style="left:${[0, 248.5, 492, 735.6, 980.2][i]}px">
        <span class="texto-degradado">${nota}</span><img src="assets/nota-musical.svg" alt="">
      </button>`).join("");
    contenedor.addEventListener("click", (e) => {
      const boton = e.target.closest("[data-nota]");
      if (!boton) return;
      notaActiva[capa] = boton.dataset.nota;
      pintarNotas(capa);
      previsualizar(capa, notaActiva[capa]);
    });
    armarCeldas(capa);
  }

  function armarEquilibrio() {
    const p = pantalla("crea-equilibrio");
    const separadores = CANALES.slice(1).map((c, i) =>
      `<span class="a separador-crea" style="left:563.5px;top:${(CANALES[i].y + c.y) / 2}px;width:1245.5px"></span>`).join("");
    $(".mezcla-crea", p).outerHTML = separadores + CANALES.map((c) => `
      <p class="texto semi texto-degradado" style="left:617px;top:${c.y - 22}px;font-size:36px">${c.nombre}</p>
      <p class="texto medio violeta" style="left:794px;top:${c.y - 15}px;font-size:25px">Suave</p>
      <div class="a riel-crea" data-canal="${c.id}" role="slider" tabindex="0" aria-label="Volumen de ${c.nombre.toLowerCase()}"
           aria-valuemin="0" aria-valuemax="100" style="left:${RIEL.left}px;top:${c.y - 17.5}px;width:${RIEL.ancho}px;--c:${c.color}">
        <span class="linea"></span><span class="relleno"></span><span class="perilla"></span>
      </div>
      <p class="texto medio violeta" style="left:1583px;top:${c.y - 15}px;font-size:25px">Fuerte</p>
      <p class="texto semi texto-degradado" data-valor="${c.id}" style="left:1693.5px;top:${c.y - 24}px;font-size:40px"></p>
      <button class="a silencio-crea" data-silenciar="${c.id}" aria-pressed="false" aria-label="Silenciar ${c.nombre.toLowerCase()}"
              style="left:1757px;top:${c.y - 13}px"><img src="assets/icono-volumen-chico.svg" alt=""></button>`).join("");

    $$(".riel-crea", p).forEach((el) => {
      const canal = el.dataset.canal;
      const desdePuntero = (e) => {
        const r = el.getBoundingClientRect();
        const fraccion = (e.clientX - r.left - (RIEL.perilla / 2) * escalaLienzo()) / (r.width - RIEL.perilla * escalaLienzo());
        estado.volumen[canal] = Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
        pintarEquilibrio();
      };
      el.addEventListener("pointerdown", (e) => {
        antesDeCambiar();
        el.setPointerCapture(e.pointerId);
        desdePuntero(e);
        pintarDeshacer();
      });
      el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) desdePuntero(e); });
      el.addEventListener("keydown", (e) => {
        const cambios = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 };
        if (!(e.key in cambios)) return;
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) antesDeCambiar();
        estado.volumen[canal] = Math.min(100, Math.max(0, estado.volumen[canal] + cambios[e.key]));
        pintarEquilibrio();
        pintarDeshacer();
      });
    });

    $$("[data-silenciar]", p).forEach((b) => b.addEventListener("click", () => {
      antesDeCambiar();
      estado.silencio[b.dataset.silenciar] = !estado.silencio[b.dataset.silenciar];
      pintarEquilibrio();
      pintarDeshacer();
    }));
  }

  function armarTuBeat() {
    const p = pantalla("crea-tu-beat");
    $("[data-guardar]", p).addEventListener("click", (e) => guardar(e.currentTarget));
    $("[data-reiniciar]", p).addEventListener("click", (e) => reiniciar(e.currentTarget));
  }

  // ---------- Dibujo ----------

  function pintarTodo() {
    pintarEstilos();
    pintarBpm();
    pintarRitmo();
    ["bajo", "melodia"].forEach((capa) => { pintarNotas(capa); pintarCeldas(capa); pintarByte(capa); });
    pintarEquilibrio();
    pintarByte("equilibrio");
    pintarDeshacer();
  }

  function pintarPaso(paso) {
    if (paso === "ritmo") pintarRitmo();
    else if (paso === "equilibrio") pintarEquilibrio();
    else pintarCeldas(paso);
    pintarByte(paso);
  }

  function pintarByte(paso) {
    const card = $(`[data-byte="${paso}"]`);
    if (!card) return;
    const m = mensajeByte(paso);
    const pose = aviso[paso] ? POSE.propuesta : POSE[byte[paso]] || POSE_PASO[paso];
    const img = $(".byte-pose", card);
    if (!img.src.endsWith(pose)) img.src = `assets/${pose}`;
    $(".byte-titulo", card).textContent = m.titulo;
    $(".byte-texto", card).textContent = m.texto;
    $(".byte-respuestas", card).innerHTML = m.respuestas.map(([accion, etiqueta, clase]) => {
      const icono = accion === "idea" ? "✦ " : accion === "usar" ? "✓ " : accion === "rechazar" ? "✕ " : accion === "escuchar" ? (modo === "propuesta" ? "❚❚ " : "▶ ") : "";
      return `<button class="byte-respuesta ${clase}" data-responder="${accion}">${icono}${etiqueta}</button>`;
    }).join("");
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
  }

  function pintarEstilos() {
    $$("#crea-estilo [data-estilo]").forEach((el) => {
      el.setAttribute("aria-pressed", el.dataset.estilo === estado.estilo);
      el.classList.toggle("sonando", modo === "demo" && estiloDemo === el.dataset.estilo);
    });
    const texto = $("[data-estilo-texto]");
    texto.textContent = estado.estilo
      ? `¡Buena elección! Con ${ESTILOS[estado.estilo].nombre.toLowerCase()} voy a usar sus sonidos y arrancar a ${MotorBeat.SONIDOS[estado.estilo].bpm} BPM. Tu ritmo se conserva.`
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
      : "¿Tranquilo o más rápido? Tocá play, mové la perilla y escuchá hasta que te guste.";
  }

  function pintarRitmo() {
    const p = pantalla("crea-ritmo");
    const pieza = PIEZAS_RITMO.find((x) => x.id === piezaActiva);
    $$("[data-pieza]", p).forEach((b) => b.setAttribute("aria-pressed", b.dataset.pieza === piezaActiva));
    $("[data-pieza-nombre]", p).textContent = pieza.nombre;
    $("[data-pieza-texto]", p).textContent = pieza.texto;
    $("[data-celdas]", p).style.setProperty("--c", pieza.color);
    pintarCeldas("ritmo");
    pintarByte("ritmo");
  }

  function pintarCeldas(capa) {
    const contenedor = $(`[data-celdas="${capa}"]`);
    const enPropuesta = propuesta?.paso === capa;
    const datos = enPropuesta ? conPropuesta() : estado;
    $$("[data-celda]", contenedor).forEach((celda, i) => {
      let on, nota = "";
      if (capa === "ritmo") {
        on = datos.ritmo[piezaActiva][i];
      } else {
        nota = datos[capa][i] || "";
        on = Boolean(nota);
      }
      celda.classList.toggle("on", on);
      celda.classList.toggle("idea", enPropuesta && on);
      celda.classList.toggle("con-nota", Boolean(nota));
      celda.dataset.nota = nota;
      celda.setAttribute("aria-pressed", on);
      const nombre = capa === "ritmo" ? PIEZAS_RITMO.find((x) => x.id === piezaActiva).nombre.toLowerCase() : capa === "bajo" ? "bajo" : "melodía";
      celda.setAttribute("aria-label", `${nombre}, paso ${i + 1}${nota ? `: ${nota}` : ""}${enPropuesta && on ? " (idea de Byte)" : ""}`);
    });
  }

  function pintarNotas(capa) {
    $$(`[data-notas="${capa}"] [data-nota]`).forEach((b) => b.setAttribute("aria-pressed", b.dataset.nota === notaActiva[capa]));
  }

  // Los faders muestran la propuesta de Byte mientras la estás decidiendo.
  function pintarEquilibrio() {
    const p = pantalla("crea-equilibrio");
    const datos = propuesta?.paso === "equilibrio" ? conPropuesta() : estado;
    CANALES.forEach((c) => {
      const v = datos.volumen[c.id];
      const riel = $(`.riel-crea[data-canal="${c.id}"]`, p);
      riel.style.setProperty("--v", v / 100);
      riel.classList.toggle("apagado", datos.silencio[c.id]);
      riel.classList.toggle("idea", propuesta?.paso === "equilibrio");
      riel.setAttribute("aria-valuenow", v);
      $(`[data-valor="${c.id}"]`, p).textContent = v;
      const boton = $(`[data-silenciar="${c.id}"]`, p);
      boton.setAttribute("aria-pressed", datos.silencio[c.id]);
      boton.setAttribute("aria-label", `${datos.silencio[c.id] ? "Activar" : "Silenciar"} ${c.nombre.toLowerCase()}`);
    });
  }

  function pintarDeshacer() {
    $$("[data-deshacer]").forEach((b) => { b.disabled = historial.length === 0; });
  }

  function pintarTuBeat() {
    $("[data-tu-beat-texto]").textContent = MotorBeat.beatVacio(estado)
      ? "Tu beat todavía está en silencio: volvé a Ritmo y encendé algunas casillas."
      : "Este beat lleva tus decisiones.";
    pintarQr();
  }

  // Qué controla el play de cada pantalla y cómo se llama en cada estado.
  const MODO_PANTALLA = { "crea-estilo": "demo", "crea-velocidad": "pulso" };
  const ETIQUETAS_PLAY = {
    demo: ["Escuchar el estilo elegido", "Detener el estilo"],
    pulso: ["Escuchar el pulso", "Detener el pulso"],
    beat: ["Reproducir mi beat", "Pausar mi beat"],
  };

  function pintarReproduccion() {
    $$("[data-escuchar]").forEach((b) => {
      const suyo = MODO_PANTALLA[b.closest(".screen")?.id] || "beat";
      const sonando = modo === suyo;
      b.setAttribute("aria-pressed", sonando);
      if (b.classList.contains("play-pausa")) {
        b.setAttribute("aria-label", ETIQUETAS_PLAY[suyo][sonando ? 1 : 0]);
        b.style.setProperty("--pulso", `${60 / estado.bpm}s`);
      }
    });
    $(".perilla-bpm").classList.toggle("latiendo", modo === "pulso");
    pintarEstilos();
    if (propuesta) pintarByte(propuesta.paso);
  }

  // Solo toca las casillas cuando cambia el paso (no en cada cuadro de animación).
  function marcarPaso(paso) {
    if (paso === marcada) return;
    marcada = paso;
    const p = actual && pantalla(actual);
    if (!p) return;
    $$("[data-celda]", p).forEach((c, i) => c.classList.toggle("actual", i === paso));
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
    const paso = pasoDe(id);
    if (paso in byte) {
      // Al volver a un paso, Byte vuelve a preguntar (salvo que hayas elegido probar por tu cuenta).
      if (byte[paso] !== "libre") byte[paso] = "pregunta";
      delete aviso[paso];
      pintarPaso(paso);
    }
    if (id === "crea-tu-beat") pintarTuBeat();
  }

  // Salir de un paso descarta la propuesta sin aplicar nada.
  function alSalir() {
    cortar(); // también cancela un play que estaba esperando a los sonidos
    marcarPaso(-1);
    const paso = propuesta?.paso;
    descartarPropuesta();
    if (paso) pintarPaso(paso);
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
    vaciar,
    pedirIdea: () => Boolean(actual) && pedirIdea(),
    maneja: (id) => PANTALLAS.includes(id),
  };
})();

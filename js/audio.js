/* Motor de sonido de Beatmind.
   Los núcleos 1 y 2 sintetizan todo con Web Audio; el núcleo 3 suma samples reales (assets/sonidos/). */

const Sonido = (() => {
  const BPM = 92;
  const COMPAS = (60 / BPM) * 4; // duración de un compás en segundos

  let ctx = null;
  let salida, ecualizador, compresor, envioReverb, envioDelay, ruido;
  const canales = {}; // melodia, bajo, bateria (+ general = bus de mezcla)
  let sesion = null;
  let silenciado = false;

  // ---------- Inicialización ----------

  function iniciar() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    salida = ctx.createGain();
    salida.gain.value = silenciado ? 0 : 0.8;
    salida.connect(ctx.destination);

    canales.general = ctx.createGain();
    ecualizador = ctx.createBiquadFilter();
    ecualizador.type = "highshelf";
    ecualizador.frequency.value = 2500;
    compresor = ctx.createDynamicsCompressor();
    canales.general.connect(ecualizador).connect(compresor).connect(salida);

    const reverb = ctx.createConvolver();
    reverb.buffer = respuestaImpulso(2.4);
    envioReverb = ctx.createGain();
    compresor.connect(envioReverb).connect(reverb).connect(salida);

    const delay = ctx.createDelay(1);
    delay.delayTime.value = COMPAS / 8 * 3; // corchea con puntillo
    const realimentacion = ctx.createGain();
    realimentacion.gain.value = 0.38;
    envioDelay = ctx.createGain();
    compresor.connect(envioDelay).connect(delay);
    delay.connect(realimentacion).connect(delay);
    delay.connect(salida);

    for (const nombre of ["melodia", "bajo", "bateria"]) {
      canales[nombre] = ctx.createGain();
      canales[nombre].connect(canales.general);
    }

    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const datos = ruido.getChannelData(0);
    for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;

    aplicarEfectos(efectosNeutros);
  }

  function respuestaImpulso(segundos) {
    const largo = Math.floor(ctx.sampleRate * segundos);
    const buffer = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    }
    return buffer;
  }

  // ---------- Efectos y volúmenes (pantalla de mezcla) ----------

  const efectosNeutros = { reverb: 0.15, delay: 0, eq: 0.5, compresor: 0.3 };

  function aplicarEfectos({ reverb, delay, eq, compresor: comp }) {
    if (!ctx) return;
    const t = ctx.currentTime;
    envioReverb.gain.setTargetAtTime(reverb * 0.7, t, 0.05);
    envioDelay.gain.setTargetAtTime(delay * 0.55, t, 0.05);
    ecualizador.gain.setTargetAtTime((eq - 0.5) * 24, t, 0.05);
    compresor.threshold.setTargetAtTime(-comp * 40, t, 0.05);
    compresor.ratio.setTargetAtTime(1 + comp * 11, t, 0.05);
  }

  function volumen(canal, valor) {
    if (!ctx) return;
    canales[canal].gain.setTargetAtTime(valor, ctx.currentTime, 0.03);
  }

  function silenciar(valor) {
    silenciado = valor;
    if (ctx) salida.gain.setTargetAtTime(valor ? 0 : 0.8, ctx.currentTime, 0.03);
  }

  // ---------- Instrumentos ----------

  function envolvente(nodo, t, pico, ataque, caida) {
    nodo.gain.setValueAtTime(0.0001, t);
    nodo.gain.exponentialRampToValueAtTime(pico, t + ataque);
    nodo.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  }

  function fuenteRuido(t, duracion) {
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido;
    fuente.start(t, Math.random() * 0.5);
    fuente.stop(t + duracion);
    return fuente;
  }

  const instrumentos = {
    kick(t, destino) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      envolvente(g, t, 1, 0.004, 0.38);
      osc.connect(g).connect(destino);
      osc.start(t);
      osc.stop(t + 0.45);
    },
    snare(t, destino) {
      const filtro = ctx.createBiquadFilter();
      filtro.type = "highpass";
      filtro.frequency.value = 1400;
      const g = ctx.createGain();
      envolvente(g, t, 0.55, 0.002, 0.18);
      fuenteRuido(t, 0.22).connect(filtro).connect(g).connect(destino);

      const tono = ctx.createOscillator();
      const gt = ctx.createGain();
      tono.type = "triangle";
      tono.frequency.setValueAtTime(220, t);
      tono.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      envolvente(gt, t, 0.35, 0.002, 0.1);
      tono.connect(gt).connect(destino);
      tono.start(t);
      tono.stop(t + 0.14);
    },
    hihat(t, destino) {
      const filtro = ctx.createBiquadFilter();
      filtro.type = "highpass";
      filtro.frequency.value = 7500;
      const g = ctx.createGain();
      envolvente(g, t, 0.22, 0.001, 0.05);
      fuenteRuido(t, 0.08).connect(filtro).connect(g).connect(destino);
    },
    clap(t, destino) {
      const filtro = ctx.createBiquadFilter();
      filtro.type = "bandpass";
      filtro.frequency.value = 1300;
      filtro.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      for (const d of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(0.7, t + d);
        g.gain.exponentialRampToValueAtTime(0.1, t + d + 0.009);
      }
      g.gain.setValueAtTime(0.6, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      fuenteRuido(t, 0.25).connect(filtro).connect(g).connect(destino);
    },
    click(t, destino, acento) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = acento ? 1760 : 1320;
      envolvente(g, t, 0.18, 0.001, 0.04);
      osc.connect(g).connect(destino);
      osc.start(t);
      osc.stop(t + 0.06);
    },
    bajo(t, destino, frecuencia, duracion) {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filtro = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      sub.type = "sine";
      osc.frequency.value = frecuencia;
      sub.frequency.value = frecuencia / 2;
      filtro.type = "lowpass";
      filtro.Q.value = 6;
      filtro.frequency.setValueAtTime(900, t);
      filtro.frequency.exponentialRampToValueAtTime(180, t + duracion);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
      g.gain.setValueAtTime(0.45, t + duracion - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
      osc.connect(filtro);
      sub.connect(filtro);
      filtro.connect(g).connect(destino);
      osc.start(t);
      sub.start(t);
      osc.stop(t + duracion);
      sub.stop(t + duracion);
    },
    teclas(t, destino, frecuencia, duracion) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
      g.gain.setTargetAtTime(0.09, t + 0.015, 0.2);
      g.gain.setTargetAtTime(0.0001, t + duracion, 0.12);
      g.connect(destino);
      for (const [tipo, mult, nivel] of [["triangle", 1, 1], ["sine", 2, 0.35], ["sine", 1.003, 0.6]]) {
        const osc = ctx.createOscillator();
        const go = ctx.createGain();
        osc.type = tipo;
        osc.frequency.value = frecuencia * mult;
        go.gain.value = nivel;
        osc.connect(go).connect(g);
        osc.start(t);
        osc.stop(t + duracion + 0.6);
      }
    },
    // Reproduce un sample. velocidad cambia la altura (2 = una octava arriba); duracion lo corta con un fundido.
    muestra(t, destino, buffer, { velocidad = 1, ganancia = 1, duracion = 0, desde = 0 } = {}) {
      const fuente = ctx.createBufferSource();
      const g = ctx.createGain();
      fuente.buffer = buffer;
      fuente.playbackRate.value = velocidad;
      g.gain.value = ganancia;
      fuente.connect(g).connect(destino);
      fuente.start(t, desde);
      if (duracion) {
        g.gain.setValueAtTime(ganancia, t + duracion);
        g.gain.setTargetAtTime(0.0001, t + duracion, 0.04);
        fuente.stop(t + duracion + 0.3);
      }
    },
  };

  // ---------- Samples ----------

  function cargarMuestra(url) {
    iniciar();
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`No se encontró ${url}`);
        return r.arrayBuffer();
      })
      .then((datos) => ctx.decodeAudioData(datos));
  }

  // Nodo de volumen intermedio, creado en el contexto activo (también sirve al renderizar).
  function ganancia(destino, valor) {
    const g = ctx.createGain();
    g.gain.value = valor;
    g.connect(destino);
    return g;
  }

  // Sonido inmediato con una función propia: fn(tiempo, destino).
  function alInstante(canal, fn) {
    iniciar();
    fn(ctx.currentTime + 0.01, canales[canal]);
  }

  // ---------- Exportar a WAV ----------

  /* Renderiza fuera de tiempo real. programar(tiempo, salidas) usa los mismos instrumentos:
     mientras programa, ctx apunta al contexto offline. */
  function renderizar(segundos, programar) {
    iniciar();
    const real = ctx;
    const offline = new OfflineAudioContext(2, Math.ceil(segundos * real.sampleRate), real.sampleRate);
    ctx = offline;
    try {
      const bus = offline.createGain();
      const comp = offline.createDynamicsCompressor();
      bus.gain.value = 0.8;
      bus.connect(comp).connect(offline.destination);
      programar(0.02, { melodia: bus, bajo: bus, bateria: bus });
    } finally {
      ctx = real;
    }
    return offline.startRendering();
  }

  function aWav(buffer) {
    const canalesWav = buffer.numberOfChannels;
    const largo = buffer.length;
    const vista = new DataView(new ArrayBuffer(44 + largo * canalesWav * 2));
    const texto = (pos, s) => { for (let i = 0; i < s.length; i++) vista.setUint8(pos + i, s.charCodeAt(i)); };
    texto(0, "RIFF");
    vista.setUint32(4, 36 + largo * canalesWav * 2, true);
    texto(8, "WAVE");
    texto(12, "fmt ");
    vista.setUint32(16, 16, true);
    vista.setUint16(20, 1, true);
    vista.setUint16(22, canalesWav, true);
    vista.setUint32(24, buffer.sampleRate, true);
    vista.setUint32(28, buffer.sampleRate * canalesWav * 2, true);
    vista.setUint16(32, canalesWav * 2, true);
    vista.setUint16(34, 16, true);
    texto(36, "data");
    vista.setUint32(40, largo * canalesWav * 2, true);
    const datos = Array.from({ length: canalesWav }, (_, c) => buffer.getChannelData(c));
    let pos = 44;
    for (let i = 0; i < largo; i++) {
      for (let c = 0; c < canalesWav; c++) {
        const v = Math.max(-1, Math.min(1, datos[c][i]));
        vista.setInt16(pos, v < 0 ? v * 0x8000 : v * 0x7fff, true);
        pos += 2;
      }
    }
    return new Blob([vista], { type: "audio/wav" });
  }

  // ---------- Reproducción ----------

  const ANTICIPO = 0.2; // segundos que se programan por adelantado

  /* Reloj de programación. Corre en un Worker porque los temporizadores de la página se frenan
     cuando el navegador está ocupado o la pestaña queda de fondo; si no hay Worker, usa setInterval. */
  const latido = (() => {
    const oyentes = new Map();
    let proximoId = 1;
    let worker = null;
    let intervalo = 0;
    const tic = () => oyentes.forEach((fn) => fn());
    try {
      const codigo = "let t=0;onmessage=(e)=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),25);};";
      worker = new Worker(URL.createObjectURL(new Blob([codigo], { type: "text/javascript" })));
      worker.onmessage = tic;
    } catch {
      worker = null;
    }
    const encender = (on) => {
      if (worker) worker.postMessage(on);
      else if (on) intervalo = setInterval(tic, 25);
      else clearInterval(intervalo);
    };
    return {
      suscribir(fn) {
        const id = proximoId++;
        oyentes.set(id, fn);
        if (oyentes.size === 1) encender(true);
        return id;
      },
      desuscribir(id) {
        if (!oyentes.delete(id)) return;
        if (oyentes.size === 0) encender(false);
      },
    };
  })();

  /* El navegador solo deja arrancar el audio después de un clic o una tecla. Se aprovecha el primer
     gesto en cualquier parte de la página para dejarlo andando, así el primer play suena entero. */
  const alPrimerGesto = [];
  function desbloquear() {
    iniciar();
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    while (alPrimerGesto.length) alPrimerGesto.shift()();
  }
  for (const evento of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(evento, desbloquear, { capture: true, passive: true });
  }

  /* Reproduce compás por compás.
     op.alCompas(numero, tiempo, sesion) programa las notas de cada compás.
     op.alCuadro(posicion, numero) se llama en cada cuadro de animación (posicion 0..1 dentro del compás).
     op.compases limita cuántos compases suenan (por defecto, en bucle).
     op.compas es la duración de cada compás: un número o una función (se consulta compás a compás,
     así el tempo puede cambiar mientras suena). */
  function reproducir(op) {
    detener();
    iniciar();

    const actual = {
      salidas: {},
      timer: 0,
      raf: 0,
      alDetener: op.alDetener,
    };
    for (const nombre of ["melodia", "bajo", "bateria"]) {
      actual.salidas[nombre] = ctx.createGain();
      actual.salidas[nombre].connect(canales[nombre]);
    }
    sesion = actual;

    const largoDe = () => (typeof op.compas === "function" ? op.compas() : op.compas) || COMPAS;
    const total = op.compases ?? Infinity;
    const programados = []; // { numero, inicio, largo } de los compases ya programados
    let proximo = 0;
    let siguiente = 0;

    const programar = () => {
      if (sesion !== actual) return;
      const ahora = ctx.currentTime;
      // Si la página se trabó y quedamos atrasados, se saltean los compases perdidos
      // en lugar de tocarlos todos juntos (eso era lo que se escuchaba cortado).
      while (siguiente < total && proximo < ahora - 0.02) {
        proximo += largoDe();
        siguiente++;
      }
      while (siguiente < total && proximo < ahora + ANTICIPO) {
        const largo = largoDe();
        op.alCompas(siguiente, proximo, actual.salidas, largo);
        programados.push({ numero: siguiente, inicio: proximo, largo });
        proximo += largo;
        siguiente++;
      }
      if (siguiente >= total && ahora > proximo) detener();
    };

    // El reloj arranca recién cuando el audio está andando: si el navegador lo tenía en pausa,
    // programar con el reloj congelado hacía que el principio sonara amontonado.
    const arrancar = () => {
      if (sesion !== actual) return;
      proximo = ctx.currentTime + 0.05;
      actual.timer = latido.suscribir(programar);
      programar();
    };
    if (ctx.state === "running") arrancar();
    else ctx.resume().then(arrancar, arrancar);

    const cuadro = () => {
      if (sesion !== actual) return;
      const ahora = ctx.currentTime;
      while (programados.length > 1 && programados[1].inicio <= ahora) programados.shift();
      const c = programados[0];
      if (c && ahora >= c.inicio && op.alCuadro) {
        op.alCuadro(Math.min(1, (ahora - c.inicio) / c.largo), c.numero);
      }
      actual.raf = requestAnimationFrame(cuadro);
    };
    actual.raf = requestAnimationFrame(cuadro);
  }

  // Sonido suelto e inmediato (por ejemplo, al encender una celda del secuenciador).
  function tocar(nombre, canal, ...args) {
    iniciar();
    instrumentos[nombre](ctx.currentTime + 0.01, canales[canal], ...args);
  }

  function detener() {
    if (!sesion) return;
    const terminada = sesion;
    sesion = null;
    latido.desuscribir(terminada.timer);
    cancelAnimationFrame(terminada.raf);
    const t = ctx.currentTime;
    for (const g of Object.values(terminada.salidas)) {
      g.gain.setTargetAtTime(0, t, 0.03);
      setTimeout(() => g.disconnect(), 400);
    }
    terminada.alDetener?.();
  }

  return {
    COMPAS,
    instrumentos,
    reproducir,
    tocar,
    alInstante,
    cargarMuestra,
    // fn se ejecuta en el primer clic o tecla (por ejemplo, para precargar sonidos con el audio ya habilitado).
    alPrimerGesto: (fn) => alPrimerGesto.push(fn),
    ganancia,
    renderizar,
    aWav,
    detener,
    iniciar,
    volumen,
    aplicarEfectos,
    efectosNeutros,
    silenciar,
    get silenciado() { return silenciado; },
    get sonando() { return sesion !== null; },
  };
})();

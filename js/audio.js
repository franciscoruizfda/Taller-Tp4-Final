/* Motor de sonido de Beatmind.
   Todo se sintetiza con Web Audio: no hace falta ningún archivo de audio. */

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
  };

  // ---------- Reproducción ----------

  /* Reproduce compás por compás.
     op.alCompas(numero, tiempo, sesion) programa las notas de cada compás.
     op.alCuadro(posicion, numero) se llama en cada cuadro de animación (posicion 0..1 dentro del compás).
     op.compases limita cuántos compases suenan (por defecto, en bucle). */
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

    const largo = op.compas || COMPAS;
    const total = op.compases ?? Infinity;
    const inicio = ctx.currentTime + 0.06;
    let siguiente = 0;

    const programar = () => {
      while (siguiente < total && inicio + siguiente * largo < ctx.currentTime + 0.3) {
        op.alCompas(siguiente, inicio + siguiente * largo, actual.salidas);
        siguiente++;
      }
      if (siguiente >= total && ctx.currentTime > inicio + total * largo) detener();
    };
    actual.timer = setInterval(programar, 40);
    programar();

    const cuadro = () => {
      if (sesion !== actual) return;
      const transcurrido = ctx.currentTime - inicio;
      if (transcurrido >= 0 && op.alCuadro) {
        const numero = Math.floor(transcurrido / largo);
        op.alCuadro((transcurrido % largo) / largo, numero);
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
    clearInterval(terminada.timer);
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

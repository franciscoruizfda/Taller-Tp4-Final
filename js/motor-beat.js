/* Beatmind · motor del beat del núcleo 3. Lo usan la infografía (nucleo3.js) y la página del celular (beat.html),
   así el beat suena igual en los dos lados.

   Un beat ("datos") es: { estilo, bpm, ritmo: { bombo, caja, hihat } (16 booleanos cada uno),
   bajo y melodia (16 notas o null), volumen y silencio por canal }.
   Cada estilo usa 5 samples CC0 de Freesound en assets/sonidos/<estilo>/{bombo,caja,hihat,bajo,melodia}.mp3.
   Si no se pueden cargar (por ejemplo, abriendo el HTML sin servidor), suenan los instrumentos sintetizados. */

const MotorBeat = (() => {
  const PASOS = 16; // semicorcheas de un compás
  const NOTAS = ["Re", "Mi", "Fa", "Sol", "La"];
  const CANALES = ["bombo", "caja", "hihat", "bajo", "melodia"];
  const ESTILOS = ["trap", "pop", "cumbia", "electronica"];
  const VOLUMEN_INICIAL = 70;
  const FRECUENCIA = { Re: 293.66, Mi: 329.63, Fa: 349.23, Sol: 392.0, La: 440.0 }; // octava 4
  const frecuencia = (nota, octava) => FRECUENCIA[nota] * 2 ** (octava - 4);
  // Semitonos hasta la tercera de abajo dentro de Re menor (La→Fa, Sol→Mi, Fa→Re, Mi→Do, Re→Si bemol).
  const TERCERA_ABAJO = { Re: 4, Mi: 4, Fa: 3, Sol: 3, La: 4 };

  /* raiz: frecuencia medida de cada sample (en Hz), para afinarlo a la nota pedida.
     desde: segundos de silencio al comienzo del archivo. max: corte de los golpes largos.
     acento: golpe fuerte en cada tiempo y suaves entre medio ({ debil, velocidadFuerte }; el güiro "chi-ki-chi").
     terceras: ganancia de una segunda voz una tercera abajo (el acordeón de la cumbia).
     largo: cuántos pasos puede durar como mucho una nota (notas cortas = más rebote). */
  const SONIDOS = {
    trap: {
      nombre: "Trap", bpm: 140,
      bombo: { ganancia: 1 },
      caja: { ganancia: 0.75 },
      hihat: { ganancia: 0.4 },
      bajo: { ganancia: 0.85, raiz: 32.7, octava: 1 },
      melodia: { ganancia: 1, raiz: 1111, octava: 5 },
    },
    pop: {
      nombre: "Pop", bpm: 110,
      bombo: { ganancia: 0.95 },
      caja: { ganancia: 0.7, max: 0.45 },
      hihat: { ganancia: 0.52 },
      bajo: { ganancia: 0.9, raiz: 55.0, octava: 2, desde: 0.115 },
      melodia: { ganancia: 1.45, raiz: 261.2, octava: 4 },
    },
    cumbia: {
      nombre: "Cumbia", bpm: 96,
      bombo: { ganancia: 0.9 },
      caja: { ganancia: 0.8 },
      // Güiro grabado muy bajo: se compensa con la ganancia. En cada tiempo va el raspado largo y fuerte.
      hihat: { ganancia: 9, desde: 0.025, acento: { debil: 0.5, velocidadFuerte: 0.82 } },
      bajo: { ganancia: 0.9, raiz: 55.2, octava: 2, largo: 2 },
      melodia: { ganancia: 0.36, raiz: 788.4, octava: 5, terceras: 0.7, largo: 2 },
    },
    electronica: {
      nombre: "Electrónica", bpm: 124,
      bombo: { ganancia: 1 },
      caja: { ganancia: 0.65, max: 0.5 },
      hihat: { ganancia: 0.4 },
      bajo: { ganancia: 1.1, raiz: 129.6, octava: 2 },
      melodia: { ganancia: 0.35, raiz: 130.8, octava: 4 },
    },
  };

  const estiloDe = (datos) => datos.estilo || "trap";
  const segundosPorPaso = (datos) => 60 / datos.bpm / 4;

  function beatVacio(datos) {
    const vacio = vacioInicial();
    return JSON.stringify([datos.ritmo, datos.bajo, datos.melodia]) === JSON.stringify([vacio.ritmo, vacio.bajo, vacio.melodia]);
  }

  function vacioInicial() {
    const fila = () => Array(PASOS).fill(false);
    return {
      estilo: null,
      bpm: 90,
      ritmo: { bombo: fila(), caja: fila(), hihat: fila() },
      bajo: Array(PASOS).fill(null),
      melodia: Array(PASOS).fill(null),
      volumen: Object.fromEntries(CANALES.map((c) => [c, VOLUMEN_INICIAL])),
      silencio: Object.fromEntries(CANALES.map((c) => [c, false])),
    };
  }

  // ---------- Samples ----------

  const muestras = {}; // muestras[estilo][pieza] = AudioBuffer
  let cargando = null;
  let listas = false;

  function cargarMuestras() {
    if (cargando) return cargando;
    cargando = Promise.all(ESTILOS.flatMap((estilo) => {
      muestras[estilo] = {};
      return CANALES.map((pieza) =>
        Sonido.cargarMuestra(`assets/sonidos/${estilo}/${pieza}.mp3`)
          .then((buffer) => { muestras[estilo][pieza] = buffer; })
          .catch(() => {}));
    })).then(() => {
      listas = true;
      const faltan = Object.values(muestras).some((m) => Object.keys(m).length < CANALES.length);
      if (faltan) console.warn("Beatmind: faltan samples, se usan los sonidos sintetizados. Abrí el proyecto con un servidor (por ejemplo, Live Server).");
    });
    return cargando;
  }

  // Espera a que estén los samples (como mucho `maximo` ms), para no arrancar con sonidos sintetizados
  // y cambiar a los reales en el medio.
  function esperarMuestras(maximo = 2500) {
    if (listas) return Promise.resolve();
    return Promise.race([cargarMuestras(), new Promise((r) => setTimeout(r, maximo))]);
  }

  // Los sonidos se precargan con el primer clic o tecla en la página, mucho antes de llegar al núcleo 3.
  Sonido.alPrimerGesto(cargarMuestras);

  // ---------- Sonido ----------

  // Volumen de 0 a 100 → ganancia (70 = 1).
  const nivel = (datos, canal) => (datos.silencio[canal] ? 0 : (datos.volumen[canal] / VOLUMEN_INICIAL) ** 1.5);

  const SINTE = {
    bombo: (t, d) => Sonido.instrumentos.kick(t, d),
    caja: (t, d) => Sonido.instrumentos.snare(t, d),
    hihat: (t, d) => Sonido.instrumentos.hihat(t, d),
    bajo: (t, d, nota, dur) => Sonido.instrumentos.bajo(t, d, frecuencia(nota, 2), Math.max(dur, 0.12)),
    melodia: (t, d, nota, dur) => Sonido.instrumentos.teclas(t, d, frecuencia(nota, 4), dur),
  };

  // paso: casilla del compás (para los acentos); sin paso suena como golpe fuerte.
  function disparar(datos, pieza, t, destino, nota, duracion = 0, paso = 0) {
    const ganancia = nivel(datos, pieza);
    if (!ganancia) return;
    const estilo = estiloDe(datos);
    const salida = Sonido.ganancia(destino, ganancia);
    const buffer = muestras[estilo]?.[pieza];
    if (!buffer) {
      SINTE[pieza](t, salida, nota, duracion);
      return;
    }
    const m = SONIDOS[estilo][pieza];
    const fuerte = paso % 4 === 0;
    const velocidad = nota ? frecuencia(nota, m.octava) / m.raiz : (m.acento && fuerte ? m.acento.velocidadFuerte : 1);
    const opciones = {
      velocidad,
      ganancia: m.ganancia * (m.acento && !fuerte ? m.acento.debil : 1),
      duracion: nota ? duracion : m.max || 0,
      desde: m.desde || 0,
    };
    Sonido.instrumentos.muestra(t, salida, buffer, opciones);
    if (nota && m.terceras) {
      Sonido.instrumentos.muestra(t, salida, buffer, {
        ...opciones,
        velocidad: velocidad * 2 ** (-TERCERA_ABAJO[nota] / 12),
        ganancia: m.ganancia * m.terceras,
      });
    }
  }

  // Cuántos pasos dura una nota: hasta la siguiente, con un máximo.
  function largoNota(notas, paso, maximo) {
    let n = 1;
    while (n < maximo && !notas[(paso + n) % PASOS]) n++;
    return n;
  }

  // Lo que suena en un paso del compás.
  function tocarPaso(datos, paso, t, salidas) {
    const seg = segundosPorPaso(datos);
    const sonidos = SONIDOS[estiloDe(datos)];
    for (const pieza of ["bombo", "caja", "hihat"]) {
      if (datos.ritmo[pieza][paso]) disparar(datos, pieza, t, salidas.bateria, null, 0, paso);
    }
    const bajo = datos.bajo[paso];
    if (bajo) disparar(datos, "bajo", t, salidas.bajo, bajo, largoNota(datos.bajo, paso, sonidos.bajo.largo || 4) * seg * 0.95, paso);
    const melodia = datos.melodia[paso];
    if (melodia) disparar(datos, "melodia", t, salidas.melodia, melodia, largoNota(datos.melodia, paso, sonidos.melodia.largo || 2) * seg * 0.95, paso);
  }

  // El beat repetido en un WAV.
  async function aWav(datos, compases = 4) {
    await cargarMuestras();
    const seg = segundosPorPaso(datos);
    const buffer = await Sonido.renderizar(compases * PASOS * seg + 2, (t, salidas) => {
      for (let i = 0; i < compases * PASOS; i++) tocarPaso(datos, i % PASOS, t + i * seg, salidas);
    });
    return Sonido.aWav(buffer);
  }

  // ---------- Código para el QR ----------

  /* El QR no lleva el audio (no entra): lleva el beat en unos 60 caracteres y el celular lo vuelve a armar.
     Formato v1: estilo · bpm (2) · bombo, caja, hihat (4 hex c/u) · bajo (16) · melodía (16) · volúmenes (2 c/u) · silencios (2 hex). */
  function codificar(datos) {
    const fila = (f) => parseInt(f.map((on) => (on ? 1 : 0)).join(""), 2).toString(16).padStart(4, "0");
    const notas = (n) => n.map((x) => (x ? NOTAS.indexOf(x) + 1 : 0)).join("");
    return [
      "1",
      ESTILOS.indexOf(estiloDe(datos)),
      datos.bpm.toString(36).padStart(2, "0"),
      fila(datos.ritmo.bombo), fila(datos.ritmo.caja), fila(datos.ritmo.hihat),
      notas(datos.bajo), notas(datos.melodia),
      CANALES.map((c) => datos.volumen[c].toString(36).padStart(2, "0")).join(""),
      parseInt(CANALES.map((c) => (datos.silencio[c] ? 1 : 0)).join(""), 2).toString(16).padStart(2, "0"),
    ].join("");
  }

  function decodificar(texto) {
    if (!/^1[0-3][0-9a-z]{2}[0-9a-f]{12}[0-5]{32}[0-9a-z]{10}[0-9a-f]{2}$/.test(texto)) return null;
    let pos = 1;
    const leer = (n) => texto.slice(pos, (pos += n));
    const fila = (hex) => parseInt(hex, 16).toString(2).padStart(PASOS, "0").split("").map((b) => b === "1");
    const notas = (s) => s.split("").map((d) => (d === "0" ? null : NOTAS[Number(d) - 1]));
    const estilo = ESTILOS[Number(leer(1))];
    const bpm = parseInt(leer(2), 36);
    const ritmo = { bombo: fila(leer(4)), caja: fila(leer(4)), hihat: fila(leer(4)) };
    const bajo = notas(leer(16));
    const melodia = notas(leer(16));
    const volumen = Object.fromEntries(CANALES.map((c) => [c, Math.min(100, parseInt(leer(2), 36))]));
    const bits = parseInt(leer(2), 16).toString(2).padStart(CANALES.length, "0");
    const silencio = Object.fromEntries(CANALES.map((c, i) => [c, bits[i] === "1"]));
    if (!(bpm >= 60 && bpm <= 160)) return null;
    return { estilo, bpm, ritmo, bajo, melodia, volumen, silencio };
  }

  return {
    PASOS,
    NOTAS,
    CANALES,
    VOLUMEN_INICIAL,
    SONIDOS,
    estiloDe,
    segundosPorPaso,
    vacioInicial,
    beatVacio,
    cargarMuestras,
    esperarMuestras,
    get muestrasListas() { return listas; },
    disparar,
    tocarPaso,
    aWav,
    codificar,
    decodificar,
  };
})();

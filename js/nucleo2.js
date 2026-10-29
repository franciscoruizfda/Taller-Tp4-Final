/* DM-BEAT · Núcleo 2: mezclador de stems de canciones reales.
   Cada canción se separa en 4 archivos: assets/canciones/<id>/{voz,bajo,melodia,bateria}.mp3
   La canción arranca sola al entrar a #cancion y se mezcla con los faders (mouse o consola física). */

const Nucleo2 = (() => {
  const CANCIONES = {
    redondos: { titulo: "Ñam Fri Fruli Fali Fru", artista: "Patricio Rey y Sus Redonditos de Ricota", portada: "portada-redondos.png" },
    duki: { titulo: "Givenchy", artista: "Duki", portada: "portada-duki.png" },
    miranda: { titulo: "Yo te diré", artista: "Miranda!", portada: "portada-miranda.png" },
    mattioli: { titulo: "Tramposa Y Mentirosa", artista: "Leo Mattioli", portada: "portada-mattioli.png" },
  };

  // Posiciones del Figma: caja del fader, ícono [left, top, ancho, alto] y comienzo del riel (relativo a la caja).
  // Mismo orden que los faders de la consola. Los colores están en css/nucleo2.css.
  const STEMS = [
    { id: "voz", nombre: "la voz", caja: [162, 554.47], ico: [20, 17, 80.5, 93], riel: 97 },
    { id: "bajo", nombre: "el bajo", caja: [970, 554.47], ico: [19.5, 21, 82, 82], riel: 110 },
    { id: "melodia", nombre: "la melodía", caja: [162, 707.47], ico: [20, 16, 74.5, 88], riel: 97 },
    { id: "bateria", nombre: "la batería", caja: [970, 707.47], ico: [19.5, 16, 78, 83], riel: 110 },
  ];
  const DESFASE_MAXIMO = 0.08; // segundos que se tolera entre pistas antes de resincronizar

  const niveles = { voz: 1, bajo: 1, melodia: 1, bateria: 1 };
  let solo = null;
  let actual = null;
  let pistas = {};
  let faltan = [];
  let cargada = false; // las 4 pistas ya respondieron (cargaron o fallaron)
  let quiereSonar = false; // se entró a la pantalla y hay que arrancar apenas cargue
  let sonando = false;
  let raf = 0;

  const pantalla = () => document.getElementById("cancion");
  const enPantalla = () => pantalla().classList.contains("activa");

  // ---------- Armado ----------

  function armar() {
    const contenedor = pantalla().querySelector("[data-stems]");
    contenedor.outerHTML = STEMS.map((s) => `
      <div class="n2-fader-caja" data-stem="${s.id}" style="left:${s.caja[0]}px;top:${s.caja[1]}px">
        <button class="n2-fader-icono" data-solo="${s.id}" aria-pressed="false" aria-label="Escuchar solo ${s.nombre}"
                style="left:${s.ico[0]}px;top:${s.ico[1]}px;width:${s.ico[2]}px;height:${s.ico[3]}px">
          <img src="assets/n2-icono-${s.id}.png" alt=""></button>
        <div class="n2-fader" role="slider" tabindex="0" aria-label="Volumen de ${s.nombre}"
             aria-valuemin="0" aria-valuemax="100" style="left:${s.riel}px">
          <div class="riel"></div><div class="relleno"></div><div class="perilla"></div>
        </div>
      </div>`).join("");

    const p = pantalla();
    p.querySelectorAll(".n2-fader-caja").forEach((caja) => {
      const id = caja.dataset.stem;
      const fader = caja.querySelector(".n2-fader");
      arrastrable(fader, (fraccion) => nivel(id, fraccion));
      fader.addEventListener("keydown", (e) => {
        const valor = conTeclas(e, niveles[id], 0.05, 1);
        if (valor !== null) nivel(id, valor);
      });
      pintarStem(id);
    });

    // Faders físicos de la consola: solo mueven la mezcla mientras se ve el mezclador.
    Consola.alMoverFader((nombre, valor) => {
      if (enPantalla() && nombre in niveles) nivel(nombre, valor);
    });

    p.querySelectorAll("[data-solo]").forEach((el) => {
      el.addEventListener("click", () => {
        solo = solo === el.dataset.solo ? null : el.dataset.solo;
        pintarSolo();
        aplicarVolumenes();
      });
    });

    const progreso = p.querySelector(".progreso");
    arrastrable(progreso, (fraccion) => buscar(fraccion * duracion()));
    progreso.addEventListener("keydown", (e) => {
      const valor = conTeclas(e, maestro()?.currentTime ?? 0, 5, duracion());
      if (valor !== null) buscar(valor);
    });
  }

  function nivel(id, valor) {
    niveles[id] = valor;
    pintarStem(id);
    aplicarVolumenes();
  }

  // Arrastre horizontal con el mouse (o el dedo) sobre un riel.
  function arrastrable(el, alCambiar) {
    const desdePuntero = (e) => {
      const r = el.getBoundingClientRect();
      alCambiar(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    };
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); desdePuntero(e); });
    el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) desdePuntero(e); });
  }

  // Flechas suman o restan un paso; Inicio/Fin van a los extremos. Devuelve null si la tecla no aplica.
  function conTeclas(e, valor, paso, maximo) {
    const cambios = {
      ArrowRight: valor + paso, ArrowUp: valor + paso,
      ArrowLeft: valor - paso, ArrowDown: valor - paso,
      Home: 0, End: maximo,
    };
    if (!(e.key in cambios)) return null;
    e.preventDefault();
    e.stopPropagation(); // que las flechas no muevan el analógico
    return Math.min(maximo, Math.max(0, cambios[e.key]));
  }

  // ---------- Dibujo ----------

  function pintarStem(id) {
    const caja = pantalla().querySelector(`.n2-fader-caja[data-stem="${id}"]`);
    caja.style.setProperty("--v", niveles[id]);
    caja.querySelector(".n2-fader").setAttribute("aria-valuenow", Math.round(niveles[id] * 100));
  }

  function pintarSolo() {
    pantalla().querySelectorAll(".n2-fader-caja").forEach((caja) => {
      const id = caja.dataset.stem;
      caja.querySelector("[data-solo]").setAttribute("aria-pressed", solo === id);
      caja.classList.toggle("apagado", solo !== null && solo !== id);
    });
  }

  function pintarCabecera() {
    const c = CANCIONES[actual];
    const p = pantalla();
    p.querySelectorAll(".portada-grande img").forEach((img) => { img.src = `assets/${c.portada}`; });
    p.querySelector(".portada-grande .tapa").alt = `Portada de ${c.titulo}`;
    p.querySelector("[data-cancion-titulo]").textContent = c.titulo;
    p.querySelector("[data-cancion-artista]").textContent = c.artista;
    document.querySelectorAll("#selecciona [data-cancion]").forEach((el) => {
      el.classList.toggle("elegida", el.dataset.cancion === actual);
    });
  }

  function pintarProgreso() {
    const m = maestro();
    const t = m?.currentTime ?? 0;
    const total = duracion();
    const el = pantalla().querySelector(".progreso");
    el.style.setProperty("--p", total ? t / total : 0);
    el.setAttribute("aria-valuenow", Math.round(t));
    el.setAttribute("aria-valuemax", Math.round(total));
    el.setAttribute("aria-valuetext", `${minutos(t)} de ${minutos(total)}`);
  }

  function estado(texto) {
    pantalla().querySelector(".estado-cancion").textContent = texto;
  }

  const minutos = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ---------- Carga de stems ----------

  function elegir(id) {
    if (id === actual || !CANCIONES[id]) return;
    detener();
    Object.values(pistas).forEach((a) => { a.removeAttribute("src"); a.load(); });
    actual = id;
    pistas = {};
    faltan = [];
    cargada = false;
    pintarCabecera();
    pintarProgreso();
    estado("Cargando la canción…");

    let pendientes = STEMS.length;
    const terminado = () => {
      if (--pendientes > 0 || actual !== id) return;
      if (faltan.length === STEMS.length) {
        estado(`Falta el audio: agregá voz.mp3, bajo.mp3, melodia.mp3 y bateria.mp3 en assets/canciones/${id}/`);
      } else if (faltan.length) {
        estado(`No se encontró ${faltan.map((f) => `${f}.mp3`).join(", ")} en assets/canciones/${id}/`);
      } else {
        estado("");
      }
      cargada = true;
      aplicarVolumenes();
      pintarProgreso();
      if (quiereSonar && enPantalla()) reproducir();
    };

    STEMS.forEach((s) => {
      const audio = new Audio();
      audio.preload = "auto";
      let contado = false;
      const contar = () => { if (!contado) { contado = true; terminado(); } };
      audio.addEventListener("canplay", contar, { once: true });
      audio.addEventListener("loadedmetadata", pintarProgreso, { once: true });
      audio.addEventListener("error", () => {
        if (actual !== id) return;
        faltan.push(s.id);
        delete pistas[s.id];
        contar();
      }, { once: true });
      audio.src = `assets/canciones/${id}/${s.id}.mp3`;
      pistas[s.id] = audio;
    });
  }

  // La primera pista disponible marca el tiempo; las demás la siguen.
  const maestro = () => STEMS.map((s) => pistas[s.id]).find(Boolean);
  const duracion = () => {
    const d = maestro()?.duration;
    return Number.isFinite(d) ? d : 0;
  };

  // ---------- Reproducción ----------

  function aplicarVolumenes() {
    for (const s of STEMS) {
      const audio = pistas[s.id];
      if (audio) audio.volume = solo && solo !== s.id ? 0 : niveles[s.id];
    }
  }

  function reproducir() {
    const m = maestro();
    if (!m || sonando) return;
    if (m.ended || m.currentTime >= duracion() - 0.05) buscar(0);
    Sonido.detener();
    const t = m.currentTime;
    Object.values(pistas).forEach((a) => {
      a.currentTime = t;
      a.play().catch(() => {});
    });
    // Al terminar vuelve a empezar: la canción sigue sonando mientras se mezcla.
    m.onended = () => { pausar(); buscar(0); reproducir(); };
    sonando = true;
    const cuadro = () => {
      const tm = m.currentTime;
      Object.values(pistas).forEach((a) => {
        if (a !== m && Math.abs(a.currentTime - tm) > DESFASE_MAXIMO) a.currentTime = tm;
      });
      pintarProgreso();
      raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
  }

  function pausar() {
    Object.values(pistas).forEach((a) => a.pause());
    cancelAnimationFrame(raf);
    sonando = false;
  }

  function detener() {
    pausar();
    buscar(0);
  }

  function alternar() {
    if (sonando) pausar();
    else reproducir();
  }

  function buscar(segundos) {
    Object.values(pistas).forEach((a) => {
      if (a.readyState > 0) a.currentTime = segundos;
    });
    pintarProgreso();
  }

  // Al entrar suena sola desde el principio (si todavía está cargando, arranca cuando termine).
  function alEntrar() {
    if (!actual) elegir("redondos");
    quiereSonar = true;
    detener();
    if (cargada) reproducir();
  }

  function alSalir() {
    quiereSonar = false;
    pausar();
  }

  return {
    armar,
    elegir,
    reproducir,
    pausar,
    detener,
    alternar,
    alEntrar,
    alSalir,
    get sonando() { return sonando; },
    get niveles() { return { ...niveles }; },
  };
})();

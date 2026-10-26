/* Beatmind · Núcleo 2: mezclador de stems de canciones reales.
   Cada canción se separa en 4 archivos: assets/canciones/<id>/{voz,bajo,melodia,bateria}.mp3 */

const Nucleo2 = (() => {
  const CANCIONES = {
    redondos: { titulo: "Ñam Fri Fruli Fali Fru", artista: "Patricio Rey y Sus Redonditos de Ricota", portada: "portada-redondos.png" },
    duki: { titulo: "Givenchy", artista: "Duki", portada: "portada-duki.png" },
    miranda: { titulo: "Yo te diré", artista: "Miranda!", portada: "portada-miranda.png" },
    mattioli: { titulo: "Tramposa Y Mentirosa", artista: "Leo Mattioli", portada: "portada-mattioli.png" },
  };

  // Posiciones tomadas del Figma (caja, ícono y comienzo del riel).
  const STEMS = [
    { id: "voz", nombre: "la voz", icono: "stem-voz.png", color: "#00ff89", caja: [154, 581.47], ico: [160.5, 610.47], riel: 251.5 },
    { id: "bajo", nombre: "el bajo", icono: "stem-guitarra.png", color: "#0084ff", caja: [962.5, 581.47], ico: [983.5, 610.47], riel: 1072.5 },
    { id: "melodia", nombre: "la melodía", icono: "stem-melodia.png", color: "#675180", caja: [154, 721.47], ico: [159.5, 750.47], riel: 251.5 },
    { id: "bateria", nombre: "la batería", icono: "stem-bateria.png", color: "#9ec5f4", caja: [962.5, 721.47], ico: [983.5, 750.47], riel: 1072.5 },
  ];
  const ANCHO_RIEL = 653;
  const DESFASE_MAXIMO = 0.08; // segundos que se tolera entre pistas antes de resincronizar

  const niveles = { voz: 1, bajo: 1, melodia: 1, bateria: 1 };
  let solo = null;
  let actual = null;
  let pistas = {};
  let faltan = [];
  let sonando = false;
  let raf = 0;

  const pantalla = () => document.getElementById("cancion");

  // ---------- Armado ----------

  function armar() {
    const contenedor = pantalla().querySelector("[data-stems]");
    contenedor.outerHTML = STEMS.map((s) => `
      <div class="stem-caja" style="left:${s.caja[0]}px;top:${s.caja[1]}px"></div>
      <button class="stem-icono" data-solo="${s.id}" aria-pressed="false" aria-label="Escuchar solo ${s.nombre}"
              style="left:${s.ico[0]}px;top:${s.ico[1]}px"><img src="assets/${s.icono}" alt=""></button>
      <div class="stem-fader" data-stem="${s.id}" role="slider" tabindex="0" aria-label="Volumen de ${s.nombre}"
           aria-valuemin="0" aria-valuemax="100"
           style="left:${s.riel}px;top:${s.caja[1] + 36.5}px;width:${ANCHO_RIEL}px;--color:${s.color}">
        <div class="riel"></div><div class="relleno"></div><div class="perilla"></div>
      </div>`).join("");

    const p = pantalla();
    p.querySelectorAll(".stem-fader").forEach((el) => {
      const id = el.dataset.stem;
      arrastrable(el, (fraccion) => { niveles[id] = fraccion; pintarStem(id); aplicarVolumenes(); });
      el.addEventListener("keydown", (e) => {
        const valor = conTeclas(e, niveles[id], 0.05, 1);
        if (valor === null) return;
        niveles[id] = valor;
        pintarStem(id);
        aplicarVolumenes();
      });
      pintarStem(id);
    });

    p.querySelectorAll("[data-solo]").forEach((el) => {
      el.addEventListener("click", () => {
        solo = solo === el.dataset.solo ? null : el.dataset.solo;
        pintarSolo();
        aplicarVolumenes();
      });
    });

    p.querySelector(".play-cancion").addEventListener("click", alternar);

    const progreso = p.querySelector(".progreso");
    arrastrable(progreso, (fraccion) => buscar(fraccion * duracion()));
    progreso.addEventListener("keydown", (e) => {
      const valor = conTeclas(e, maestro()?.currentTime ?? 0, 5, duracion());
      if (valor !== null) buscar(valor);
    });
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
    e.stopPropagation(); // que las flechas no cambien de pantalla
    return Math.min(maximo, Math.max(0, cambios[e.key]));
  }

  // ---------- Dibujo ----------

  function pintarStem(id) {
    const el = pantalla().querySelector(`.stem-fader[data-stem="${id}"]`);
    el.style.setProperty("--v", niveles[id]);
    el.setAttribute("aria-valuenow", Math.round(niveles[id] * 100));
  }

  function pintarSolo() {
    pantalla().querySelectorAll("[data-solo]").forEach((el) => {
      const id = el.dataset.solo;
      el.setAttribute("aria-pressed", solo === id);
      el.classList.toggle("apagado", solo !== null && solo !== id);
      pantalla().querySelector(`.stem-fader[data-stem="${id}"]`).classList.toggle("apagado", solo !== null && solo !== id);
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

  function pintarBoton() {
    const boton = pantalla().querySelector(".play-cancion");
    boton.setAttribute("aria-pressed", sonando);
    boton.setAttribute("aria-label", sonando ? "Pausar canción" : "Reproducir canción");
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
      aplicarVolumenes();
      pintarProgreso();
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
    m.onended = detener;
    sonando = true;
    pintarBoton();
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
    pintarBoton();
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

  return {
    armar,
    elegir,
    reproducir,
    pausar,
    detener,
    alternar,
    alEntrar: () => { if (!actual) elegir("redondos"); },
    alSalir: pausar,
    get sonando() { return sonando; },
  };
})();

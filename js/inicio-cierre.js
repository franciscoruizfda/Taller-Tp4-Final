/* DM-BEAT · Inicio, tutorial de la consola y cierre.
   Arma los dibujos de la consola del tutorial (posiciones copiadas del Figma; el analógico también se usa
   como guía en las casillas del núcleo 3), las rayitas de progreso
   y lo que hace el analógico en el tutorial y en el cierre. Se carga antes de main.js. */

(() => {
  // ---------- Faders dibujados ----------
  // Valor inicial de cada fader (0 a 1), como aparecen en el Figma.
  const VALOR_INICIAL = { voz: 0.88, bajo: 0.48, melodia: 0, bateria: 0.99 };
  // Lugar de cada fader dentro de la consola chica (izquierda a derecha, arriba abajo).
  const LUGAR_FADER = { voz: [48, 322], bajo: [272, 322], melodia: [48, 382], bateria: [272, 382] };

  function fader(nombre, [left, top] = [0, 0]) {
    return `<div class="tut-fader" data-fader="${nombre}" style="left:${left}px;top:${top}px;--valor:${VALOR_INICIAL[nombre]}">` +
      `<i class="brillo"></i><i class="pista"></i><i class="linea"></i><i class="relleno"></i><i class="perilla"></i>` +
      `<img class="icono" src="assets/tut-fader-${nombre}.png" alt=""></div>`;
  }

  // ---------- Analógico dibujado ----------
  // marcas: "4" (consola chica) u "8" (pantalla del analógico). horizontal: solo las flechas ← → (guía de las casillas).
  function palanca(marcas, estilo, horizontal = false) {
    const flecha = (left, top, giro, lado = 17.4) =>
      `<img class="flecha" src="assets/tut-palanca-flecha.png" alt="" style="left:${left}px;top:${top}px;width:${lado}px;height:${lado}px;transform:rotate(${giro}deg)">`;
    return `<div class="tut-palanca${horizontal ? " horizontal" : ""}" style="${estilo}" aria-hidden="true">` +
      `<img src="assets/tut-palanca-base.svg" alt="" style="left:31.31px;top:34.62px;width:69.06px;height:69.06px">` +
      `<div class="cabeza">` +
        `<img src="assets/tut-palanca-cuello.svg" alt="" style="left:47.14px;top:50.45px;width:37.4px;height:37.4px">` +
        `<img src="assets/tut-palanca-cabeza.svg" alt="" style="left:43.31px;top:30.27px;width:45.05px;height:45.05px">` +
        `<img src="assets/tut-palanca-tope.svg" alt="" style="left:49.4px;top:36.36px;width:32.88px;height:32.88px">` +
        `<img src="assets/tut-palanca-tope-brillo.svg" alt="" style="left:46.3px;top:33.26px;width:39.08px;height:39.08px">` +
        `<img src="assets/tut-palanca-cabeza-brillo.svg" alt="" style="left:36.31px;top:23.27px;width:59.05px;height:59.05px">` +
      `</div>` +
      `<img src="assets/tut-palanca-marcas-${marcas}.png" alt="" style="left:11.65px;top:13.57px;width:108.54px;height:108.54px">` +
      `<img src="assets/tut-palanca-marcas-${marcas}-brillo.png" alt="" style="left:2.85px;top:4.77px;width:126.14px;height:126.14px">` +
      (horizontal
        ? flecha(124, 51, 0, 34) + flecha(-26, 51, 180, 34) // flechas grandes, como en la guía del Figma
        : flecha(114.28, 59.14, 0) + flecha(0, 59.14, 180) + flecha(57.23, 116.55, 90) + flecha(57.23, 0, -90)) +
      `</div>`;
  }

  // ---------- Consola chica (bienvenida y colores) ----------
  const TECLAS_COLOR = [["azul", 42], ["violeta", 161], ["verde", 281], ["gris", 400]];

  function consola() {
    const lateral = (lado, left) =>
      `<img class="lateral" src="assets/skip-${lado}-verde.svg" alt="" style="left:${left}px">` +
      `<img class="lateral encima" src="assets/skip-${lado}-celeste.svg" alt="" style="left:${left}px">`;
    return `<span class="marco-consola"></span>` +
      lateral("previous", 97) + lateral("next", 352) +
      palanca("4", "left:205px;top:20px") +
      TECLAS_COLOR.map(([color, left]) => `<i class="tecla" data-tecla="${color}" style="left:${left}px"></i>`).join("") +
      Object.keys(LUGAR_FADER).map((nombre) => fader(nombre, LUGAR_FADER[nombre])).join("") +
      `<img class="a" src="assets/tut-play-pausa.svg" alt="" style="left:168px;top:463px;width:187px;height:33px">`;
  }

  document.querySelectorAll("[data-tut-consola]").forEach((el) => {
    el.classList.add("tut-consola");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = consola();
  });
  document.querySelectorAll("[data-tut-palanca]").forEach((el) => {
    el.outerHTML = palanca(el.dataset.tutPalanca, el.style.cssText, el.hasAttribute("data-horizontal"));
  });
  document.querySelectorAll("[data-tut-fader]").forEach((el) => {
    const nuevo = document.createElement("div");
    nuevo.innerHTML = fader(el.dataset.tutFader);
    nuevo.firstElementChild.style.left = el.style.left;
    nuevo.firstElementChild.style.top = el.style.top;
    nuevo.firstElementChild.classList.add("grande");
    el.replaceWith(nuevo.firstElementChild);
  });

  // ---------- Rayitas de progreso del tutorial ----------
  document.querySelectorAll("[data-progreso-tutorial]").forEach((el) => {
    const hecho = Number(el.dataset.progresoTutorial);
    el.classList.add("tut-progreso");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `Paso ${hecho} de 5`);
    el.innerHTML = [0, 1, 2, 3, 4].map((i) => `<i${i < hecho ? ' class="hecho"' : ""}></i>`).join("");
  });

  // ---------- Los dibujos copian a la consola real ----------

  // Los faders dibujados siguen a los faders físicos.
  Consola.alMoverFader((nombre, valor) => {
    document.querySelectorAll(`.tut-fader[data-fader="${nombre}"]`).forEach((el) => el.style.setProperty("--valor", valor));
  });

  // En la pantalla de los faders también se pueden arrastrar con el mouse (hasta que llegue el Web Serial).
  document.querySelectorAll(".tut-fader.grande").forEach((el) => {
    const mover = (e) => {
      const linea = el.querySelector(".linea").getBoundingClientRect();
      Consola.moverFader(el.dataset.fader, (e.clientX - linea.left) / linea.width);
    };
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      mover(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (el.hasPointerCapture(e.pointerId)) mover(e);
    });
  });

  // En "Usá el análogo" moverlo inclina el dibujo (y no avanza); presionarlo o cualquier otro botón sí avanza.
  let timerInclinar = 0;
  Consola.registrarAnalogo("tutorial-analogo", {
    mover(direccion) {
      const palancas = document.querySelectorAll("#tutorial-analogo .tut-palanca");
      palancas.forEach((p) => (p.dataset.inclina = direccion));
      clearTimeout(timerInclinar);
      timerInclinar = setTimeout(() => palancas.forEach((p) => delete p.dataset.inclina), 350);
      return true;
    },
  });

  // ---------- Cierre ----------
  // El analógico elige el núcleo hacia donde apunta su flecha; arriba no hace nada.
  // Cualquier otro botón vuelve al inicio (lo hace main.js con el [data-continuar]).
  const NUCLEO_DEL_CIERRE = { izquierda: "que-es", derecha: "modifica", abajo: "crea" };
  Consola.registrarAnalogo("cierre", {
    mover(direccion) {
      const destino = NUCLEO_DEL_CIERRE[direccion];
      if (destino) document.querySelector(`#cierre [data-ir="${destino}"]`).click();
      return true;
    },
  });
})();

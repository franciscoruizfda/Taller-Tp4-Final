// ===== DM-BEAT · Consola: 8 botones + faders, conectada a la web por Web Serial =====
// Botones: entre su pin y GND (INPUT_PULLUP), apretado = LOW.
// Faders:  pata 1 -> GND, pata 3 -> 5V, pata 2 -> A0, A1 (y A2, A3 cuando se conecten F3 y F4).
//
// Qué manda (una línea por evento, a 115200 baudios; la web lo lee en js/consola.js):
//   "B3"      se apretó el botón B3 (B1 a B8)
//   "F1:57"   el fader F1 está en 57 % (0 a 100)
//   "# ..."   comentarios para el Monitor Serie: la web los ignora
// En el Monitor Serie (115200) escribí "e" + Enter para ver el estado de todo.
//
// Qué hace cada botón en la experiencia:
//   B1 retroceder · B2 azul (trap) · B3 avanzar · B4 verde (cumbia)
//   B5 violeta (pop) · B6 pausa · B7 celeste claro (electrónica) · B8 reproducir

// ---------- BOTONES ----------
const int NB = 8;
// Pin de cada botón, en orden B1 a B8.
const int pinesB[NB] = {3, 8, 2, 5, 6, 9, 4, 7};
const char* funcionesB[NB] = {
  "retroceder", "azul", "avanzar", "verde",
  "violeta", "pausa", "celeste", "reproducir"
};

const unsigned long REBOTE = 30;   // ms para filtrar rebotes

bool estadoB[NB];
bool lecturaB[NB];
unsigned long cambioB[NB];

// ---------- FADERS ----------
// Cuando se conecten F3 y F4: NF = 4 y sumar A2, A3.
const int NF = 2;
const int pinesF[NF] = {A0, A1};

// Valor crudo con el fader en la MITAD del recorrido (ajustalo)
const int MEDIO = 150;
// Cuánto tiene que cambiar (en %) para mandar la posición nueva: filtra el temblor del fader.
const int UMBRAL = 2;

int posF[NF];     // última posición mandada (0 a 100 %)
int crudoF[NF];   // último valor crudo leído (0 a 1023)

// ==========================================

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < NB; i++) {
    pinMode(pinesB[i], INPUT_PULLUP);
    lecturaB[i] = (digitalRead(pinesB[i]) == LOW);
    estadoB[i] = lecturaB[i];
    cambioB[i] = 0;
  }

  Serial.println(F("# DM-BEAT consola lista. Escribi 'e' + Enter para ver el estado."));
  for (int i = 0; i < NB; i++) {
    if (estadoB[i]) {
      Serial.print(F("# OJO: B"));
      Serial.print(i + 1);
      Serial.print(F(" (D"));
      Serial.print(pinesB[i]);
      Serial.println(F(") figura APRETADO sin tocarlo. Revisa que su cable no toque GND."));
    }
  }

  // Manda dónde arrancan los faders, para que la pantalla los acomode.
  for (int i = 0; i < NF; i++) {
    crudoF[i] = leerSuave(pinesF[i]);
    posF[i] = corregir(crudoF[i]);
    mandarFader(i);
  }
}

void loop() {
  revisarBotones();
  revisarFaders();

  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'e' || c == 'E') mostrarEstado();
  }
  delay(5);
}

// ---------- BOTONES ----------

void revisarBotones() {
  unsigned long ahora = millis();
  for (int i = 0; i < NB; i++) {
    bool l = (digitalRead(pinesB[i]) == LOW);
    if (l != lecturaB[i]) {
      lecturaB[i] = l;
      cambioB[i] = ahora;
    }
    if (ahora - cambioB[i] > REBOTE && estadoB[i] != lecturaB[i]) {
      estadoB[i] = lecturaB[i];
      // Solo se avisa al apretar: soltar no hace nada en la experiencia.
      if (estadoB[i]) {
        Serial.print('B');
        Serial.println(i + 1);
      }
    }
  }
}

// ---------- FADERS ----------

int leerSuave(int pin) {
  long suma = 0;
  for (int k = 0; k < 8; k++) suma += analogRead(pin);
  return suma / 8;
}

int corregir(int crudo) {
  // Convierte la curva logaritmica (A10K) en una mas pareja: 0 a 100 %
  int pos;
  if (crudo <= MEDIO) pos = map(crudo, 0, MEDIO, 0, 50);
  else pos = map(crudo, MEDIO, 1023, 50, 100);
  return constrain(pos, 0, 100);
}

void revisarFaders() {
  for (int i = 0; i < NF; i++) {
    int crudo = leerSuave(pinesF[i]);
    int pos = corregir(crudo);
    crudoF[i] = crudo;
    // Los extremos siempre se mandan, para que el fader llegue a 0 y a 100 aunque el umbral sea mayor a 1.
    bool extremo = (pos == 0 || pos == 100) && pos != posF[i];
    if (abs(pos - posF[i]) >= UMBRAL || extremo) {
      posF[i] = pos;
      mandarFader(i);
    }
  }
}

void mandarFader(int i) {
  Serial.print('F');
  Serial.print(i + 1);
  Serial.print(':');
  Serial.println(posF[i]);
}

// ---------- ESTADO COMPLETO (para revisar el cableado) ----------

void mostrarEstado() {
  Serial.println(F("# ----------------------------------------"));
  Serial.println(F("# Boton  Pin  Funcion      Estado"));
  for (int i = 0; i < NB; i++) {
    Serial.print(F("# B"));
    Serial.print(i + 1);
    Serial.print(F("     D"));
    Serial.print(pinesB[i]);
    Serial.print(pinesB[i] < 10 ? F("   ") : F("  "));
    Serial.print(funcionesB[i]);
    for (int k = strlen(funcionesB[i]); k < 13; k++) Serial.print(' ');
    Serial.println(estadoB[i] ? F("APRETADO") : F("suelto"));
  }
  Serial.println(F("# Fader  Pin  Crudo  Posicion"));
  for (int i = 0; i < NF; i++) {
    Serial.print(F("# F"));
    Serial.print(i + 1);
    Serial.print(F("     A"));
    Serial.print(i);
    Serial.print(F("   "));
    Serial.print(crudoF[i]);
    Serial.print(F("    "));
    Serial.print(posF[i]);
    Serial.println(F(" %"));
  }
  Serial.println(F("# ----------------------------------------"));
}

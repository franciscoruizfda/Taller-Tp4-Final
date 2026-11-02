// ===== Beatmind · Consola: 8 botones + 3 faders + joystick → página web =====
// Mismo cableado que consola_debug.ino. En vez de texto para leer, manda una línea corta
// por cada cosa que pasa, y la página (js/consola.js) la recibe por USB con Web Serial:
//   B1 ... B8   se apretó ese botón          BJ      se apretó el joystick
//   F1:57       un fader, de 0 a 100 %       J:x,y   el joystick, de -100 a 100 por eje
// IMPORTANTE: cerrá el Monitor Serie antes de conectar la página (el puerto no se puede compartir).

// ---------- BOTONES ----------
const int NB = 9;
const int pinesB[NB] = {3, 8, 2, 5, 6, 9, 4, 7, 10};
const char* mensajesB[NB] = {"B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "BJ"};

const unsigned long REBOTE = 30;   // ms para filtrar rebotes

bool estadoB[NB];
bool lecturaB[NB];
unsigned long cambioB[NB];

// ---------- FADERS ----------
// F1 arriba izquierda, F2 arriba derecha, F3 abajo izquierda, F4 abajo derecha.
// F4 va en A5 (A3 y A4 son del joystick). Mientras no esté cableado queda en false:
// un pin suelto lee valores al azar y movería el fader en pantalla solo.
const int NF = 4;
const int pinesF[NF] = {A0, A1, A2, A5};
const bool conectadoF[NF] = {true, true, true, false};   // cuando conectes F4, pasalo a true

// Valor crudo con el fader en la MITAD del recorrido (el mismo que en consola_debug.ino)
const int MEDIO = 150;
const int SALTO_FADER = 2;   // % mínimo de cambio para mandar (evita el temblor)

int posF[NF];

// ---------- JOYSTICK ----------
const int PIN_X = A3;
const int PIN_Y = A4;
const int ZONA_MUERTA = 8;   // % alrededor del centro que se toma como 0

int centroX, centroY;  // se miden al arrancar (no toques el joystick)
int joyX = 0, joyY = 0;

// ==========================================

void setup() {
  Serial.begin(115200);   // tiene que coincidir con BAUDIOS de js/consola.js

  for (int i = 0; i < NB; i++) {
    pinMode(pinesB[i], INPUT_PULLUP);
    lecturaB[i] = (digitalRead(pinesB[i]) == LOW);
    estadoB[i] = lecturaB[i];
    cambioB[i] = 0;
  }
  for (int i = 0; i < NF; i++) posF[i] = corregir(leerSuave(pinesF[i]));

  centroX = leerSuave(PIN_X);
  centroY = leerSuave(PIN_Y);
}

void loop() {
  revisarBotones();
  revisarFaders();
  revisarJoystick();
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
      if (estadoB[i]) Serial.println(mensajesB[i]);   // solo al apretar, no al soltar
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
    if (!conectadoF[i]) continue;
    int pos = corregir(leerSuave(pinesF[i]));
    // Los extremos se mandan siempre, para poder llegar a 0 y a 100 justos.
    bool extremo = (pos == 0 || pos == 100) && pos != posF[i];
    if (abs(pos - posF[i]) >= SALTO_FADER || extremo) {
      posF[i] = pos;
      Serial.print('F');
      Serial.print(i + 1);
      Serial.print(':');
      Serial.println(pos);
    }
  }
}

// ---------- JOYSTICK ----------

int ejeJoy(int crudo, int centro) {
  int v;
  if (crudo >= centro) v = map(crudo, centro, 1023, 0, 100);
  else v = map(crudo, 0, centro, -100, 0);
  if (abs(v) < ZONA_MUERTA) v = 0;
  return constrain(v, -100, 100);
}

void revisarJoystick() {
  int x = ejeJoy(leerSuave(PIN_X), centroX);
  int y = ejeJoy(leerSuave(PIN_Y), centroY);
  if (abs(x - joyX) >= 5 || abs(y - joyY) >= 5 ||
      (x == 0 && joyX != 0) || (y == 0 && joyY != 0)) {
    joyX = x;
    joyY = y;
    Serial.print(F("J:"));
    Serial.print(joyX);
    Serial.print(',');
    Serial.println(joyY);
  }
}

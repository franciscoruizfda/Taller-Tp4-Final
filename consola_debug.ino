// ===== Consola: 8 botones + 3 faders + joystick (debug) =====
// Botones: entre su pin y GND (INPUT_PULLUP), apretado = LOW.
// Faders:  pata 1 -> GND, pata 3 -> 5V, pata 2 -> A0 / A1 / A2.
// Joystick: GND -> GND, +5V -> 5V, VRx -> A3, VRy -> A4, SW -> D10.
// Monitor Serie a 9600. Escribí "e" + Enter para ver el estado de todo.

// ---------- BOTONES ----------
const int NB = 9;
const int pinesB[NB] = {3, 8, 2, 5, 6, 9, 4, 7, 10};
const char* nombresB[NB] = {
  "B1 anterior", "B2 siguiente", "B3", "B4",
  "B5", "B6", "B7 pausa", "B8 play", "Joy clic"
};
const char* gruposB[NB] = {"G1", "G1", "G2", "G2", "G3", "G3", "G4", "G4", "J"};

const unsigned long REBOTE = 30;   // ms para filtrar rebotes

bool estadoB[NB];
bool lecturaB[NB];
unsigned long cambioB[NB];
unsigned long vecesB[NB];

// ---------- FADERS ----------
const int NF = 3;
const int pinesF[NF] = {A0, A1, A2};
const char* nombresF[NF] = {"F1", "F2", "F3"};

// Valor crudo con el fader en la MITAD del recorrido (ajustalo)
const int MEDIO = 150;

int posF[NF];     // última posición mostrada (0 a 100 %)
int crudoF[NF];   // último valor crudo leído (0 a 1023)

// ---------- JOYSTICK ----------
const int PIN_X = A3;
const int PIN_Y = A4;
const int ZONA_MUERTA = 8;   // % alrededor del centro que se toma como 0

int centroX, centroY;  // se miden al arrancar (no toques el joystick)
int joyX = 0, joyY = 0; // -100 (izq/abajo) a 100 (der/arriba)

// ==========================================

void setup() {
  Serial.begin(9600);

  for (int i = 0; i < NB; i++) {
    pinMode(pinesB[i], INPUT_PULLUP);
    lecturaB[i] = (digitalRead(pinesB[i]) == LOW);
    estadoB[i] = lecturaB[i];
    cambioB[i] = 0;
    vecesB[i] = 0;
  }
  for (int i = 0; i < NF; i++) {
    crudoF[i] = leerSuave(pinesF[i]);
    posF[i] = corregir(crudoF[i]);
  }

  centroX = leerSuave(PIN_X);
  centroY = leerSuave(PIN_Y);

  Serial.println(F("=== Consola: 8 botones + 3 faders + joystick ==="));
  Serial.println(F("Escribi 'e' + Enter para ver el estado de todo."));
  mostrarEstado();

  for (int i = 0; i < NB; i++) {
    if (estadoB[i]) {
      Serial.print(F("OJO: "));
      Serial.print(nombresB[i]);
      Serial.print(F(" (D"));
      Serial.print(pinesB[i]);
      Serial.println(F(") figura APRETADO sin tocarlo. Revisa que su cable no toque GND."));
    }
  }
}

void loop() {
  revisarBotones();
  revisarFaders();
  revisarJoystick();

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
      if (estadoB[i]) vecesB[i]++;
      mostrarBoton(i);
    }
  }
}

void mostrarBoton(int i) {
  Serial.print(nombresB[i]);
  Serial.print(F("  (D"));
  Serial.print(pinesB[i]);
  Serial.print(F(", "));
  Serial.print(gruposB[i]);
  if (estadoB[i]) {
    Serial.print(F(")  -> APRETADO   [vez "));
    Serial.print(vecesB[i]);
    Serial.println(F("]"));
  } else {
    Serial.println(F(")  -> suelto"));
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
    if (abs(pos - posF[i]) >= 1) {
      posF[i] = pos;
      mostrarFader(i);
    }
  }
}

void mostrarFader(int i) {
  Serial.print(nombresF[i]);
  Serial.print(F("  (A"));
  Serial.print(i);
  Serial.print(F(")  crudo: "));
  Serial.print(crudoF[i]);
  Serial.print(F("   posicion: "));
  Serial.print(posF[i]);
  Serial.println(F(" %"));
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
  if (abs(x - joyX) >= 3 || abs(y - joyY) >= 3 ||
      (x == 0 && joyX != 0) || (y == 0 && joyY != 0)) {
    joyX = x;
    joyY = y;
    mostrarJoystick();
  }
}

void mostrarJoystick() {
  Serial.print(F("Joystick  X: "));
  Serial.print(joyX);
  Serial.print(F("   Y: "));
  Serial.println(joyY);
}

// ---------- ESTADO COMPLETO ----------

void mostrarEstado() {
  Serial.println(F("----------------------------------------"));
  Serial.println(F("Boton          Pin  GND  Estado    Veces"));
  for (int i = 0; i < NB; i++) {
    Serial.print(nombresB[i]);
    for (int k = strlen(nombresB[i]); k < 15; k++) Serial.print(' ');
    Serial.print(F("D"));
    Serial.print(pinesB[i]);
    Serial.print(F("   "));
    Serial.print(gruposB[i]);
    Serial.print(F("   "));
    Serial.print(estadoB[i] ? F("APRETADO  ") : F("suelto    "));
    Serial.println(vecesB[i]);
  }
  Serial.println(F("Fader  Pin  Crudo  Posicion"));
  for (int i = 0; i < NF; i++) {
    Serial.print(nombresF[i]);
    Serial.print(F("     A"));
    Serial.print(i);
    Serial.print(F("   "));
    Serial.print(crudoF[i]);
    Serial.print(F("    "));
    Serial.print(posF[i]);
    Serial.println(F(" %"));
  }
  Serial.print(F("Joystick  X: "));
  Serial.print(joyX);
  Serial.print(F("   Y: "));
  Serial.print(joyY);
  Serial.print(F("   (centro medido: "));
  Serial.print(centroX);
  Serial.print(F(", "));
  Serial.print(centroY);
  Serial.println(F(")"));
  Serial.println(F("----------------------------------------"));
}

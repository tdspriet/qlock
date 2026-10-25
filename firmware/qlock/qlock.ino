// QLOCK - Dutch word clock, 110 x WS2812B on an ESP32.
//
// Board:   ESP32 Dev Module   (Boards Manager -> "esp32" by Espressif, 3.x)
// Tested versions: esp32 core 3.3.12, FastLED 3.10.5.
// Wiring:  see ../../README.md. Data on GPIO16 through the 74AHCT125.
//
// First boot: the logical top-left pixel blinks red three times: H of HET,
// top-left, seen from the FRONT - judge it through the faceplate, not from
// behind. If it's wrong, flip one of the two SERPENTINE_ flags below rather
// than resoldering anything.

#include <ArduinoOTA.h>
#include <FastLED.h>
#include <WiFi.h>
#include <esp_sntp.h>
#include <time.h>

// ---------------------------------------------------------------- settings
#define WIFI_SSID "your-network"
#define WIFI_PASS "your-password"

#define DATA_PIN   16   // free on WROOM-32. On a WROVER, GPIO16/17 are PSRAM - use 13.
#define NUM_LEDS   110
#define COLS       11
#define ROWS       10

// Amsterdam/Brussels, DST switch included.
#define TIMEZONE   "CET-1CEST,M3.5.0,M10.5.0/3"

const CRGB COLOUR      = CRGB(255, 190, 120);  // warm white
const CRGB STALE       = CRGB(120, 60, 160);   // HET IS turn violet if the
                                               // time hasn't synced in a day
const uint8_t DAY_BRIGHTNESS   = 140;
const uint8_t NIGHT_BRIGHTNESS = 25;
const int NIGHT_FROM = 23;   // dim from 23:00
const int NIGHT_TO   = 7;    // back up at 07:00

// Where LED 0 sits, seen from the FRONT. Defaults: top row, left end.
const bool SERPENTINE_STARTS_LEFT = true;
const bool SERPENTINE_STARTS_TOP  = true;

// ---------------------------------------------------------------- the grid
// row0 HETKISAVIJF  row1 TIENATZVOOR  row2 OVERMEKWART  row3 HALFSPMOVER
// row4 VOORTHGEENS  row5 TWEEAMCDRIE  row6 VIERVIJFZES  row7 ZEVENONEGEN
// row8 ACHTTIENELF  row9 TWAALFPMUUR
//
// {first letter in reading order, how many letters}
struct WordSpan { uint8_t at, len; };

const WordSpan HET      = {  0, 3};
const WordSpan IS       = {  4, 2};
const WordSpan M_VIJF   = {  7, 4};   // VIJF, the minutes one   row 0
const WordSpan M_TIEN   = { 11, 4};   // TIEN, the minutes one   row 1
const WordSpan VOOR_U   = { 18, 4};   // ".. voor <uur>"         row 1
const WordSpan OVER_U   = { 22, 4};   // ".. over <uur>"         row 2
const WordSpan KWART    = { 28, 5};   //                         row 2
const WordSpan HALF     = { 33, 4};   //                         row 3
const WordSpan OVER_K   = { 40, 4};   // "kwart over .."         row 3
const WordSpan VOOR_H   = { 44, 4};   // "kwart voor .."         row 4
const WordSpan UUR      = {107, 3};   //                         row 9

// index 1..12
const WordSpan HOURS[13] = {
  {0,0}, {51,3}, {55,4}, {62,4}, {66,4}, {70,4}, {74,3},
  {77,5}, {88,4}, {83,5}, {92,4}, {96,3}, {99,6}
};
// EEN TWEE DRIE VIER VIJF ZES ZEVEN ACHT NEGEN TIEN ELF TWAALF

CRGB leds[NUM_LEDS];
volatile time_t lastSync = 0;

uint8_t pixel(uint8_t idx);
void light(WordSpan w, CRGB c);
bool isNight(int hour);
void render(int hour24, int minute);
void waiting();
void orientationCheck();
void onNtpSync(struct timeval *tv);

// ------------------------------------------------------------------- setup
void setup() {
  Serial.begin(115200);

  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 3000);  // LED estimate; 4 A PSU also powers ESP32
  FastLED.clear(true);

  orientationCheck();

  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  sntp_set_time_sync_notification_cb(onNtpSync);
  configTzTime(TIMEZONE, "pool.ntp.org", "time.nist.gov");

  ArduinoOTA.setHostname("qlock");
}

void loop() {
  static int lastShown = -1;
  static bool otaUp = false;

  if (WiFi.status() == WL_CONNECTED) {
    if (!otaUp) { ArduinoOTA.begin(); otaUp = true; }
    ArduinoOTA.handle();
  }

  struct tm t;
  if (!getLocalTime(&t, 0)) {     // no wifi yet, or ntp hasn't answered
    lastShown = -1;               // so the time redraws the moment it lands
    waiting();
    delay(500);
    return;
  }

  int slot = t.tm_hour * 60 + (t.tm_min / 5) * 5;
  if (slot != lastShown) {
    lastShown = slot;
    FastLED.setBrightness(isNight(t.tm_hour) ? NIGHT_BRIGHTNESS : DAY_BRIGHTNESS);
    render(t.tm_hour, t.tm_min);
    Serial.printf("%02d:%02d\n", t.tm_hour, t.tm_min);
  }

  // Redraw every pass, not just on the 5-minute boundary. The RMT bitstream is
  // refilled from an ISR that competes with wifi; one starved refill would
  // otherwise leave a wrong phrase on the face until the next slot.
  FastLED.show();
  delay(50);
}

// ------------------------------------------------------------------ pixels
// Reading order -> physical LED. The strip snakes: first row one way, next row
// back, and so on.
uint8_t pixel(uint8_t idx) {
  uint8_t row = idx / COLS;
  uint8_t col = idx % COLS;
  if (!SERPENTINE_STARTS_TOP)  row = ROWS - 1 - row;
  if (!SERPENTINE_STARTS_LEFT) col = COLS - 1 - col;
  return row * COLS + ((row % 2 == 0) ? col : COLS - 1 - col);
}

void light(WordSpan w, CRGB c) {
  for (uint8_t i = 0; i < w.len; i++) leds[pixel(w.at + i)] = c;
}

bool isNight(int hour) {
  return (NIGHT_FROM > NIGHT_TO) ? (hour >= NIGHT_FROM || hour < NIGHT_TO)
                                 : (hour >= NIGHT_FROM && hour < NIGHT_TO);
}

void onNtpSync(struct timeval *tv) { lastSync = time(nullptr); }

// ------------------------------------------------------------------- clock
void render(int hour24, int minute) {
  FastLED.clear();

  // If we haven't heard from NTP in over a day the clock is free-running on
  // the crystal and drifting. Say so quietly instead of lying.
  bool drifting = lastSync && (time(nullptr) - lastSync > 26L * 3600L);
  light(HET, drifting ? STALE : COLOUR);
  light(IS,  drifting ? STALE : COLOUR);

  int m = (minute / 5) * 5;
  int h = hour24;                 // the hour we name
  bool half = false;

  switch (m) {
    case  0: break;
    case  5: light(M_VIJF, COLOUR); light(OVER_U, COLOUR); break;
    case 10: light(M_TIEN, COLOUR); light(OVER_U, COLOUR); break;
    case 15: light(KWART,  COLOUR); light(OVER_K, COLOUR); break;
    case 20: light(M_TIEN, COLOUR); light(VOOR_U, COLOUR); half = true; break;
    case 25: light(M_VIJF, COLOUR); light(VOOR_U, COLOUR); half = true; break;
    case 30:                                               half = true; break;
    case 35: light(M_VIJF, COLOUR); light(OVER_U, COLOUR); half = true; break;
    case 40: light(M_TIEN, COLOUR); light(OVER_U, COLOUR); half = true; break;
    case 45: light(KWART,  COLOUR); light(VOOR_H, COLOUR); h++; break;
    case 50: light(M_TIEN, COLOUR); light(VOOR_U, COLOUR); h++; break;
    case 55: light(M_VIJF, COLOUR); light(VOOR_U, COLOUR); h++; break;
  }
  if (half) { light(HALF, COLOUR); h++; }   // half drie = 14:30

  light(HOURS[((h + 11) % 12) + 1], COLOUR);   // 24h -> 1..12
  if (m == 0) light(UUR, COLOUR);
}

// Slow amber pulse on LED 0 while we have no time yet. If this never stops,
// check WIFI_SSID / WIFI_PASS - the ESP32 keeps retrying on its own.
void waiting() {
  static bool on = false;
  on = !on;
  FastLED.clear();
  leds[pixel(0)] = on ? CRGB(60, 30, 0) : CRGB::Black;
  FastLED.show();
}

// Three red blinks on LED 0 so you can confirm the strip orientation before
// anything is glued shut. Kept dim so a 3 a.m. power cut isn't a light show.
void orientationCheck() {
  FastLED.setBrightness(40);
  for (int i = 0; i < 3; i++) {
    leds[pixel(0)] = CRGB::Red;   FastLED.show(); delay(300);
    leds[pixel(0)] = CRGB::Black; FastLED.show(); delay(300);
  }
}

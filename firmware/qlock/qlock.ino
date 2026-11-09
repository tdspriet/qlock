// QLOCK: Dutch word clock. 110 letters + 4 minute dots, WS2812B on an ESP32.
//
// Arduino IDE: board "ESP32 Dev Module" (esp32 by Espressif, 3.3.x),
//              library FastLED 3.10.9 or newer.
// Fill in your Wi-Fi below and upload over USB with the clock plug unplugged.
// After that you can upload over Wi-Fi: the clock shows up as port "qlock".
// The full guide is in README.md.

#include <ArduinoOTA.h>
#include <FastLED.h>
#include <WiFi.h>
#include <esp_sntp.h>
#include <time.h>

// ------------------------------------------------------------ your settings
#define WIFI_SSID "your-network"
#define WIFI_PASS "your-password"
#define TIMEZONE  "CET-1CEST,M3.5.0,M10.5.0/3"   // Brussels / Amsterdam, summer time included
#define DATA_PIN  16

// >>> clock logic. tools/check_firmware.py runs this part for every minute of a day.
#define COLS     11
#define ROWS     10
#define NUM_LEDS 114                             // 110 letters, then the 4 dots

const CRGB COLOUR = CRGB(255, 190, 120);         // warm white
const CRGB STALE  = CRGB(120, 60, 160);          // HET IS in violet: no time sync for a day
const uint8_t DAY_BRIGHTNESS   = 140;            // out of 255
const uint8_t NIGHT_BRIGHTNESS = 25;
const int NIGHT_FROM = 23;                       // dim from 23:00 ...
const int NIGHT_TO   = 7;                        // ... until 07:00

// How the strip is wired, seen from the FRONT: LED 0 is the H of HET, top-left,
// and the rows snake down. Wired it the other way? Flip these, don't resolder.
const bool STARTS_LEFT = true;
const bool STARTS_TOP  = true;

// The dots come after the letters on the strip. Listed as minute 1, 2, 3, 4:
// top-left, top-right, bottom-right, bottom-left.
const uint8_t DOTS[4] = {113, 112, 111, 110};

// row 0 HETKISAVIJF   row 1 TIENATZVOOR   row 2 OVERMEKWART   row 3 HALFSPMOVER
// row 4 VOORTHGEENS   row 5 TWEEAMCDRIE   row 6 VIERVIJFZES   row 7 ZEVENONEGEN
// row 8 ACHTTIENELF   row 9 TWAALFPMUUR
// A word = {first letter counted in reading order from 0, number of letters}
struct Word { uint8_t at, len; };

const Word HET    = {  0, 3};
const Word IS     = {  4, 2};
const Word M_VIJF = {  7, 4};   // VIJF, the minutes one
const Word M_TIEN = { 11, 4};   // TIEN, the minutes one
const Word VOOR_1 = { 18, 4};   // vijf/tien VOOR
const Word OVER_1 = { 22, 4};   // vijf/tien OVER
const Word KWART  = { 28, 5};
const Word HALF   = { 33, 4};
const Word OVER_2 = { 40, 4};   // kwart OVER
const Word VOOR_2 = { 44, 4};   // kwart VOOR
const Word UUR    = {107, 3};
const Word HOURS[13] = {        // 1..12: EEN TWEE DRIE VIER VIJF ZES ZEVEN ACHT NEGEN TIEN ELF TWAALF
  {0, 0}, {51, 3}, {55, 4}, {62, 4}, {66, 4}, {70, 4}, {74, 3},
  {77, 5}, {88, 4}, {83, 5}, {92, 4}, {96, 3}, {99, 6}
};

CRGB leds[NUM_LEDS];
volatile time_t lastSync = 0;

// Letter in reading order -> position on the strip.
uint8_t pixel(uint8_t idx) {
  uint8_t row = idx / COLS;
  uint8_t col = idx % COLS;
  if (!STARTS_TOP)  row = ROWS - 1 - row;
  if (!STARTS_LEFT) col = COLS - 1 - col;
  return row * COLS + ((row % 2 == 0) ? col : COLS - 1 - col);
}

void light(Word w, CRGB c) {
  for (uint8_t i = 0; i < w.len; i++) leds[pixel(w.at + i)] = c;
}

bool isNight(int hour) {
  return (NIGHT_FROM > NIGHT_TO) ? (hour >= NIGHT_FROM || hour < NIGHT_TO)
                                 : (hour >= NIGHT_FROM && hour < NIGHT_TO);
}

void render(int hour, int minute) {
  FastLED.clear();

  // No answer from the time server for over a day: the clock may be drifting.
  bool stale = lastSync && (time(nullptr) - lastSync > 26L * 3600L);
  light(HET, stale ? STALE : COLOUR);
  light(IS,  stale ? STALE : COLOUR);

  int h = hour;
  bool half = false;
  switch (minute / 5 * 5) {
    case  0: light(UUR, COLOUR); break;
    case  5: light(M_VIJF, COLOUR); light(OVER_1, COLOUR); break;
    case 10: light(M_TIEN, COLOUR); light(OVER_1, COLOUR); break;
    case 15: light(KWART,  COLOUR); light(OVER_2, COLOUR); break;
    case 20: light(M_TIEN, COLOUR); light(VOOR_1, COLOUR); half = true; break;
    case 25: light(M_VIJF, COLOUR); light(VOOR_1, COLOUR); half = true; break;
    case 30:                                               half = true; break;
    case 35: light(M_VIJF, COLOUR); light(OVER_1, COLOUR); half = true; break;
    case 40: light(M_TIEN, COLOUR); light(OVER_1, COLOUR); half = true; break;
    case 45: light(KWART,  COLOUR); light(VOOR_2, COLOUR); h++; break;
    case 50: light(M_TIEN, COLOUR); light(VOOR_1, COLOUR); h++; break;
    case 55: light(M_VIJF, COLOUR); light(VOOR_1, COLOUR); h++; break;
  }
  if (half) { light(HALF, COLOUR); h++; }        // "half drie" is 14:30
  light(HOURS[(h + 11) % 12 + 1], COLOUR);

  for (int i = 0; i < minute % 5; i++) leds[DOTS[i]] = COLOUR;   // one dot per extra minute
}
// <<< clock logic

void onSync(struct timeval *tv) { lastSync = time(nullptr); }

// At power-up: the H of HET blinks red three times, then the dots light one by
// one, clockwise from top-left. If either is wrong, see the settings above.
void hello() {
  FastLED.setBrightness(60);
  for (int i = 0; i < 3; i++) {
    leds[pixel(0)] = CRGB::Red;   FastLED.show(); delay(300);
    leds[pixel(0)] = CRGB::Black; FastLED.show(); delay(300);
  }
  for (int i = 0; i < 4; i++) { leds[DOTS[i]] = COLOUR; FastLED.show(); delay(400); }
  FastLED.clear(true);
}

void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 3000);   // stays under the 4 A adapter
  FastLED.clear(true);
  hello();

  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  sntp_set_time_sync_notification_cb(onSync);
  configTzTime(TIMEZONE, "pool.ntp.org", "time.nist.gov");
  ArduinoOTA.setHostname("qlock");
}

void loop() {
  static int shown = -1;
  static bool otaStarted = false;

  if (WiFi.status() == WL_CONNECTED) {
    if (!otaStarted) { ArduinoOTA.begin(); otaStarted = true; }
    ArduinoOTA.handle();
  }

  struct tm t;
  if (!getLocalTime(&t, 0)) {
    // No time yet: the H pulses amber. If it never stops, check the Wi-Fi name
    // and password above.
    static bool on = false;
    on = !on;
    shown = -1;
    FastLED.clear();
    leds[pixel(0)] = on ? CRGB(60, 30, 0) : CRGB::Black;
    FastLED.show();
    delay(500);
    return;
  }

  int now = t.tm_hour * 60 + t.tm_min;
  if (now != shown) {
    shown = now;
    FastLED.setBrightness(isNight(t.tm_hour) ? NIGHT_BRIGHTNESS : DAY_BRIGHTNESS);
    render(t.tm_hour, t.tm_min);
    Serial.printf("%02d:%02d\n", t.tm_hour, t.tm_min);
  }

  // Send the picture again every pass, so a glitch caused by Wi-Fi traffic is
  // gone within a blink instead of staying until the next minute.
  FastLED.show();
  delay(50);
}

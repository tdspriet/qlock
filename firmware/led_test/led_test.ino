// LED test: lights every LED in turn, then all of them together. No Wi-Fi.
//
//   NUM_LEDS 5     the sample print: J, F, R, O, then the dot
//   NUM_LEDS 114   the finished LED panel: 110 letters, then the 4 dots
//
// Same board settings and wiring as the clock. See README.md.

#include <FastLED.h>

#define NUM_LEDS 5
#define DATA_PIN 16

CRGB leds[NUM_LEDS];
const CRGB WARM = CRGB(255, 190, 120);

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(140);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 3000);
  FastLED.clear(true);
}

void loop() {
  for (int i = 0; i < NUM_LEDS; i++) {             // one at a time: the others must stay dark
    FastLED.clear();
    leds[i] = WARM;
    FastLED.show();
    delay(NUM_LEDS > 10 ? 150 : 2000);
  }
  fill_solid(leds, NUM_LEDS, WARM);                // all together
  FastLED.show();
  delay(5000);
  FastLED.clear(true);
  delay(1000);
}

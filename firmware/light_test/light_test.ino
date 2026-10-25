// Four-LED test for stl/test: two rows of two, J F / O R seen from the front.
// Same ESP32, shifter and power wiring as the clock; no Wi-Fi required.
// Disconnect the complete ESP32 harness before attaching USB. See README.
#include <FastLED.h>

CRGB leds[4];

void setup() {
  FastLED.addLeds<WS2812B, 16, GRB>(leds, 4);
  FastLED.setBrightness(140);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 500);
  FastLED.clear(true);
}

void loop() {
  // Physical snake: J -> F -> R -> O. Check dark neighbours for leakage.
  for (int i = 0; i < 4; ++i) {
    FastLED.clear();
    leds[i] = CRGB(255, 190, 120);
    FastLED.show();
    delay(2000);
  }
  fill_solid(leds, 4, CRGB(255, 190, 120));
  FastLED.show();
  delay(2000);
  FastLED.clear(true);
  delay(1000);
}

/* Block diagram of the README "Wiring" section. Colours come from CSS. */
const WIRING_SVG = `
<svg class="wiring-svg" viewBox="0 0 880 410" role="img" aria-labelledby="wd-t wd-d">
  <title id="wd-t">QLOCK wiring</title>
  <desc id="wd-d">The 5 V adapter feeds the DC jack, which feeds the 5 V and GND rails. A 1000 µF capacitor sits across the rails at the strip input, next to the strip. The ESP32 connects through a keyed three-wire harness: VIN to 5 V, GND to GND, GPIO16 to the level shifter input with a 10 kΩ pulldown. The shifter output goes through 470 Ω to the strip data input. The strip gets power at LEDs 0, 55 and 109.</desc>

  <!-- rails -->
  <path class="w w-5v" d="M168 112 H800"/>
  <path class="w w-gnd" d="M178 372 H800"/>
  <text class="w-rail" x="806" y="116">5 V</text>
  <text class="w-rail" x="806" y="376">GND</text>

  <!-- adapter + jack -->
  <rect class="w-box dashed" x="20" y="24" width="128" height="54" rx="6"/>
  <text class="w-t" x="84" y="47" text-anchor="middle">5 V / 4 A adapter</text>
  <text class="w-s" x="84" y="64" text-anchor="middle">outside the clock</text>
  <path class="w w-cable" d="M84 78 V136"/>
  <rect class="w-box" x="20" y="136" width="128" height="50" rx="6"/>
  <text class="w-t" x="84" y="158" text-anchor="middle">DC jack 5.5 × 2.1</text>
  <text class="w-s" x="84" y="175" text-anchor="middle">centre + · check it</text>
  <path class="w w-5v" d="M148 150 H168 V112"/>
  <path class="w w-gnd" d="M148 172 H178 V372"/>
  <text class="w-s" x="160" y="204" text-anchor="end">18 AWG</text>

  <!-- bulk cap, at the strip input -->
  <circle class="w-node" cx="780" cy="112" r="3.5"/>
  <circle class="w-node" cx="780" cy="372" r="3.5"/>
  <path class="w w-5v" d="M780 112 V226"/>
  <path class="w w-gnd" d="M780 240 V372"/>
  <path class="w-plate" d="M766 226 H794"/>
  <path class="w-plate" d="M766 240 Q780 232 794 240"/>
  <text class="w-t" x="790" y="270">1000 µF</text>
  <text class="w-s" x="790" y="286">at the strip</text>
  <text class="w-s" x="790" y="300">input, − to GND</text>

  <!-- ESP32 -->
  <rect class="w-box" x="292" y="176" width="112" height="116" rx="6"/>
  <text class="w-t" x="306" y="198">ESP32</text>
  <text class="w-s" x="306" y="214">WROOM-32</text>
  <text class="w-pin" x="398" y="234" text-anchor="end">VIN</text>
  <text class="w-pin" x="398" y="256" text-anchor="end">GND</text>
  <text class="w-pin" x="398" y="278" text-anchor="end">GPIO16</text>

  <!-- harness -->
  <rect class="w-plug" x="412" y="220" width="18" height="66" rx="3"/>
  <text class="w-s" x="421" y="306" text-anchor="middle">keyed</text>
  <text class="w-s" x="421" y="320" text-anchor="middle">harness</text>
  <path class="w w-5v" d="M404 230 H412 M430 230 H452 V112"/>
  <path class="w w-gnd" d="M404 252 H412 M430 252 H466 V372"/>
  <path class="w w-data" d="M404 274 H412 M430 274 H560"/>
  <circle class="w-node" cx="452" cy="112" r="3.5"/>
  <circle class="w-node" cx="466" cy="372" r="3.5"/>

  <!-- pulldown -->
  <circle class="w-node" cx="506" cy="274" r="3.5"/>
  <path class="w w-data" d="M506 274 V300"/>
  <rect class="w-res" x="499" y="300" width="14" height="30" rx="2"/>
  <path class="w w-gnd" d="M506 330 V372"/>
  <circle class="w-node" cx="506" cy="372" r="3.5"/>
  <text class="w-t" x="518" y="320">10 kΩ</text>

  <!-- level shifter -->
  <rect class="w-box chip" x="560" y="196" width="104" height="110" rx="4"/>
  <text class="w-chip w-t" x="612" y="246" text-anchor="middle">74AHCT125</text>
  <text class="w-chip w-s" x="612" y="262" text-anchor="middle">+100 nF 14↔7</text>
  <text class="w-chip w-pin" x="566" y="278">2</text>
  <text class="w-chip w-pin" x="658" y="278" text-anchor="end">3</text>
  <text class="w-chip w-pin" x="598" y="212" text-anchor="middle">14</text>
  <text class="w-chip w-pin" x="584" y="300" text-anchor="middle">1</text>
  <text class="w-chip w-pin" x="628" y="300" text-anchor="middle">7</text>
  <path class="w w-5v" d="M598 196 V112"/>
  <circle class="w-node" cx="598" cy="112" r="3.5"/>
  <path class="w w-gnd" d="M584 306 V372 M628 306 V372"/>
  <circle class="w-node" cx="584" cy="372" r="3.5"/>
  <circle class="w-node" cx="628" cy="372" r="3.5"/>
  <text class="w-s" x="638" y="346">pin 1 → GND</text>

  <!-- series resistor + strip -->
  <path class="w w-data" d="M664 274 H676"/>
  <rect class="w-res h" x="676" y="267" width="30" height="14" rx="2"/>
  <path class="w w-data" d="M706 274 H716"/>
  <text class="w-t" x="691" y="258" text-anchor="middle">470 Ω</text>
  <rect class="w-box strip" x="716" y="146" width="40" height="196" rx="4"/>
  <text class="w-t" transform="translate(741 244) rotate(-90)" text-anchor="middle">LED strip · 110 × WS2812B</text>
  <text class="w-pin" x="712" y="292" text-anchor="end">DIN</text>
  <path class="w w-5v" d="M736 112 V146"/>
  <path class="w w-gnd" d="M736 342 V372"/>
  <circle class="w-node" cx="736" cy="112" r="3.5"/>
  <circle class="w-node" cx="736" cy="372" r="3.5"/>
  <text class="w-s" x="728" y="136" text-anchor="end">feeds at LED 0, 55, 109</text>

  <!-- legend -->
  <g class="w-legend" transform="translate(20 236)">
    <path class="w w-5v" d="M0 0 H22"/><text class="w-s" x="30" y="4">5 V</text>
    <path class="w w-gnd" d="M0 20 H22"/><text class="w-s" x="30" y="24">GND</text>
    <path class="w w-data" d="M0 40 H22"/><text class="w-s" x="30" y="44">data</text>
  </g>
</svg>`;

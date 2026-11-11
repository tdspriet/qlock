/* The content of the tracker: the shopping list and the steps.
 * A short version of README.md. Ticks are stored by id, so keep ids as they are. */

const TT = 'https://www.tinytronics.nl/en/';
const WIRE = TT + 'cables-and-connectors/cables-and-adapters/prototyping-wires/loose-wires/wire-single-core-flexible-%C3%B82.15mm-0.5mm2-';

const SHOP = [
  { name: 'Electronics', where: 'TinyTronics, plus €9.49 shipping. The LED reel and the 100 nF come from Amazon.de', items: [
    { id: 'esp32', n: '1', t: 'ESP32-D0WDQ6 board', eur: 7, url: TT + 'development-boards/microcontroller-boards/with-wi-fi/esp32-d0wdq6-development-board-with-wi-fi-and-bluetooth' },
    { id: 'strip', n: '1', t: 'WS2812B LED strip, 30 LEDs/m, 5 m reel, white, IP30 (Amazon)', eur: 27.99, url: 'https://www.amazon.de/dp/B01CDTE9AW' },
    { id: 'shifter', n: '2', t: 'SN74AHCT125N level shifter (one spare)', eur: 2, url: TT + 'components/ics-and-microcontroller-chips/ics/sn74ahct125n-4-channel-level-converter-3.3v-to-5v-14-pin-dip' },
    { id: 'socket', n: '1', t: '14-pin IC socket', eur: 0.35, url: TT + 'components/sockets/14-pins-ic-socket' },
    { id: 'pcb', n: '1', t: 'Experiment PCB 5 × 7 cm', eur: 0.8, url: TT + 'tools-and-mounting/prototyping-supplies/experiment-pcbs/experiment-pcb-5cm*7cm-double-sided' },
    { id: 'psu', n: '1', t: '5 V / 4 A power adapter', eur: 10.5, url: TT + 'power/power-supplies/5v/sunshine-power-adapter-with-dc-jack-5.5-2.1mm-5v-4a' },
    { id: 'jack', n: '1', t: 'DC jack to screw terminals', eur: 1, url: TT + 'cables-and-connectors/connectors/screw-terminals/dc-jack-female-5.5mm-to-terminal-block' },
    { id: 'cap', n: '1', t: '2200 µF 25 V capacitor', eur: 0.5, url: TT + 'components/capacitors/aishi-elektrolytic-capacitor-2200uf-25v' },
    { id: 'cap100n', n: '1', t: '100 nF ceramic capacitors, bag of 150 (Amazon)', eur: 5.59, url: 'https://www.amazon.de/dp/B0GWMVTD1H' },
    { id: 'resistors', n: '1', t: 'Resistor set (470 Ω and 10 kΩ)', eur: 5, url: TT + 'components/resistors/resistors/10%CF%89-1m%CF%89-resistor-set' },
    { id: 'plug', n: '2', t: 'JST-XH 3-pin plug with cable and socket', eur: 1.2, url: TT + 'cables-and-connectors/cables-and-adapters/jst-compatible/jst-xh-connector-with-cable-and-pcb-connector-3-pins' },
    { id: 'wire-red', n: '4 m', t: 'Wire 0.5 mm², red', eur: 4, url: WIRE + 'red-1m' },
    { id: 'wire-black', n: '4 m', t: 'Wire 0.5 mm², black', eur: 4, url: WIRE + 'black-1m' },
    { id: 'wire-yellow', n: '3 m', t: 'Wire 0.5 mm², yellow', eur: 3, url: WIRE + 'yellow-1m' },
    { id: 'shrink', n: '1', t: 'Heat shrink kit', eur: 4, url: TT + 'tools-and-mounting/installation-and-mounting-material/heat-shrink-tubing/heat-shrink-tubing-kit-black' },
    { id: 'usb', n: '1', t: 'Micro-USB data cable (USB-A plug)', eur: 2.25, url: TT + 'cables-and-connectors/cables-and-adapters/usb/micro-usb/goobay-93918-micro-usb-cable-1m-black' },
  ] },
  { name: 'Tools', where: 'in the TinyTronics order. Tick what you can borrow', items: [
    { id: 'iron', n: '1', t: 'Soldering iron, Atten ST-2065D', eur: 28.75, url: TT + 'tools-and-mounting/tools/soldering-irons-and-stations/atten-st-2065d-soldering-iron-65w-adjustable-temperature' },
    { id: 'tip', n: '1', t: 'Chisel tip for the iron', eur: 4, url: TT + 'tools-and-mounting/soldering/soldering-tips/solder-tip-for-atten-st-2065d-chisel-1.6mm' },
    { id: 'solder', n: '1', t: 'Solder 0.7 mm, 100 g, leaded', eur: 10.5, url: TT + 'tools-and-mounting/soldering/consumables/solder-wire/premium-solder-wire-0.7mm-100g' },
    { id: 'stripper', n: '1', t: 'Wire stripper, Weicon No. 5', eur: 19.95, url: TT + 'tools-and-mounting/tools/pliers-and-cutters/wire-strippers/premium-weicon-automatic-wire-stripper-no.-5' },
    { id: 'cutters', n: '1', t: 'Side cutters', eur: 4, url: TT + 'tools-and-mounting/tools/pliers-and-cutters/cutters/cutting-pliers-type-170' },
    { id: 'hands', n: '1', t: 'Helping hands', eur: 5, url: TT + 'tools-and-mounting/soldering/accessories/helping-hands-with-magnifying-glass' },
    { id: 'meter', n: '1', t: 'Multimeter, UNI-T UT133B', eur: 20.25, url: TT + 'tools-and-mounting/tools/measuring/lcr-and-multimeters/uni-t-ut133b-multimeter' },
  ] },
  { name: 'Filament', where: '1.75 mm PLA. Use the printer’s own if work has it', items: [
    { id: 'pla-black', n: '1 kg', t: 'Black PLA', eur: 22.5, url: 'https://www.123-3d.nl/123-3D-Filament-PLA-Zwart-1-75-mm-1-kg-i11621.html' },
    { id: 'pla-white', n: '1 kg', t: 'White PLA', eur: 22.5, url: 'https://www.123-3d.nl/123-3D-Filament-PLA-Wit-1-75-mm-1-kg-i11622.html' },
  ] },
  { name: 'DIY store', where: 'any', items: [
    { id: 'glue', n: '10 g', t: 'Superglue gel', eur: 10 },
    { id: 'plywood', n: '1', t: 'Plywood 3.6 mm, 122 × 61 cm', eur: 10, url: 'https://www.hubo.be/nl/p/multiplex-122x61-cm-3-6mm/12495/' },
    { id: 'batten', n: '1', t: 'Planed batten 18 × 44 mm, 240 cm', eur: 5.2, url: 'https://www.gamma.be/nl/assortiment/lat-geschaafd-vuren-fsc-18x44-mm-240-cm/p/B270487' },
    { id: 'screws', n: '8 + 4', t: 'Screws 4 × 40 and 3.5 × 30 mm, wood glue', eur: 0 },
    { id: 'tape', n: '', t: 'Masking tape, sandpaper, foam tape', eur: 0 },
    { id: 'saw', n: '', t: 'Saw, drill with 3 and 8 mm bits', eur: 0 },
  ] },
];

const PHASES = [
  { id: 'buy', name: 'Buy', shop: true,
    intro: 'Two orders: TinyTronics, and Amazon.de for the LED reel and the 100 nF capacitors.' },

  { id: 'sample', name: 'Print the sample',
    intro: 'A small corner of the clock. Bambu Studio, 0.20 mm Standard, PLA. Files are in stl/.',
    steps: [
      { id: 's-import', t: 'Import both sample_faceplate files as one object',
        h: 'Select both in one Import and answer Yes to “single object with multiple parts”. The _letters part is white, the other black.' },
      { id: 's-face', t: 'Print the sample faceplate',
        h: 'Never mirror or auto-orient it: it prints face-down. In the preview, layer 1 must show the letters filled in white.' },
      { id: 's-grid', t: 'Print sample_lightgrid in white',
        h: 'The preview must show the thin walls on the edges. If not, set Wall generator to Arachne.' },
    ] },

  { id: 'controller', name: 'Controller', figure: 'wiring',
    intro: 'A small board that feeds the LEDs and the ESP32. The one rule: USB cable in, clock plug out. Never both.',
    steps: [
      { id: 'c-polarity', t: 'Check the adapter with the multimeter',
        h: 'Adapter into the DC jack. The screw terminal marked + must read +5 V.' },
      { id: 'c-board', t: 'Solder the controller board',
        h: 'Follow the picture below. The 100 nF goes straight across chip pins 14 and 7. Lay the big capacitor on its side.' },
      { id: 'c-plug', t: 'Solder the plug cable to the ESP32',
        h: 'Three wires, to the tips of the pins marked 5.0V, GND and GP16, with heat shrink over each. Mark which is which.' },
      { id: 'c-ide', t: 'Set up the Arduino IDE',
        h: 'Install esp32 (3.3.x) and FastLED (3.10.9 or newer). Board: ESP32 Dev Module. Apple-silicon Mac: install Rosetta first, see the README.' },
      { id: 'c-flash', t: 'Upload led_test.ino to the ESP32',
        h: 'If it hangs on “Connecting…”, hold a wire between GP0 and GND, press RST, and let go when the upload starts.' },
    ] },

  { id: 'test', name: 'Test the sample',
    intro: 'Five LEDs behind J F / O R and the dot. Nothing glued. Judge it in a dim room.',
    steps: [
      { id: 't-leds', t: 'Stick five spare LEDs on a board, under the sample',
        h: 'Cut the first two 15-LED sections off the reel: each is a row of 11 for later and 4 left over. From those: two strips of two under J F and O R, a single one under the dot.' },
      { id: 't-wire', t: 'Wire them J → F → R → O → dot, and power up',
        h: 'Follow the arrows on the strip. Red +5 V, black GND, yellow data. Each LED lights in turn, then all five.' },
      { id: 't-even', t: 'The letters glow evenly',
        h: 'A bright blob? Set INLAY_T = 0.6 in tools/make_stl.py and re-run it, or lay baking paper behind the faceplate.' },
      { id: 't-black', t: 'The black stays black',
        h: 'Glowing? Try another black filament, or set FACE_T = 3.0 and re-run.' },
      { id: 't-dark', t: 'Neighbours of a lit letter stay dark',
        h: 'If not, the grid isn’t flat on the LEDs. A bit of black tack over the strip under the wall closes the gap.' },
    ] },

  { id: 'print', name: 'Print the clock',
    intro: 'Same settings as the sample. Each faceplate is two files imported together, black + white.',
    steps: [
      ...['TL', 'TR', 'BL', 'BR'].map(x => ({ id: 'face-' + x, t: `Faceplate ${x}`, h: `faceplate_${x} + faceplate_${x}_letters` })),
      ...['TL', 'TR', 'BL', 'BR'].map(x => ({ id: 'grid-' + x, t: `Light grid ${x}`, h: `lightgrid_${x}, white` })),
    ] },

  { id: 'panel', name: 'LED panel', figure: 'leds',
    intro: 'The LED side of the panel is the view from the front: H is top-left.',
    steps: [
      { id: 'p-cut', t: 'Cut the plywood to 450 × 450 mm and draw ten row lines',
        h: 'From the top edge: 60, 96.7, 133.3, 170, 206.7, 243.3, 280, 316.7, 353.3 and 390 mm.' },
      { id: 'p-strips', t: 'Cut ten strips of 11 LEDs',
        h: 'One from each 15-LED section of the reel, so no row has a factory solder joint in it. Cut through the middle of the copper pads.' },
      { id: 'p-stick', t: 'Stick the rows on the lines',
        h: 'Middle of the first LED 58.3 mm from the left edge. Arrows point right on the top row, left on the next, and so on.' },
      { id: 'p-dots', t: 'Stick one LED in each corner',
        h: 'Its middle 22.4 mm from both edges.' },
      { id: 'p-join', t: 'Join the rows at the ends',
        h: 'Three short wires each, alternating sides: +5 V to +5 V, GND to GND, DO to DI.' },
      { id: 'p-chain', t: 'Chain the four dots',
        h: 'From the end of the bottom row: bottom-left, bottom-right, top-right, top-left. Tape the wires flat, 22 mm from the edge.' },
      { id: 'p-power', t: 'Drill the hole and bring in the power',
        h: '8 mm hole, 22 mm from the left edge on the top row line. Red, black and yellow go to the start of the top row; a second red and black go to the free end of the top-left dot.' },
      { id: 'p-test', t: 'Test all 114 LEDs',
        h: 'Set NUM_LEDS 114 in led_test.ino and upload it again.' },
      { id: 'p-fit', t: 'The grid tiles sit flat on the panel',
        h: 'Notches down, over the strips and wires.' },
    ] },

  { id: 'glue', name: 'Glue the face',
    intro: 'Superglue gel. Work on a flat table.',
    steps: [
      { id: 'g-tape', t: 'Tape the four faceplate tiles together, face up',
        h: 'Read the clock first. Then flip the whole plate over.' },
      { id: 'g-dry', t: 'Dry-fit the grid tiles on the back, notches up',
        h: 'From the back everything is mirrored: lightgrid_TL goes top-right. No wall may cross a letter.' },
      { id: 'g-glue', t: 'Glue the grid tiles on, one at a time',
        h: 'Gel along the faceplate seams, the rim, the edge walls, and a dot on every wall crossing.' },
    ] },

  { id: 'frame', name: 'Frame and finish',
    intro: 'A box with a lip in front, like a deep picture frame. Measure the glued face first.',
    steps: [
      { id: 'f-box', t: 'Build the box from the batten',
        h: 'Two of 488 mm, two of 452 mm between them. Glue and two screws per corner. Opening 452 × 452 mm.' },
      { id: 'f-lip', t: 'Glue plywood strips on the front',
        h: '30 mm wide: two of 488 mm, two of 428 mm, flush with the outside.' },
      { id: 'f-fill', t: 'Put in the face and the LED panel, and screw in four blocks',
        h: '20 mm blocks from the leftover batten, tight against the panel. Controller on the back of the panel.' },
      { id: 'f-wifi', t: 'Put your Wi-Fi in qlock.ino and upload it',
        h: 'USB in, clock plug out. Later updates go over Wi-Fi.' },
      { id: 'f-check', t: 'Power up: the start-up check passes',
        h: 'H blinks red three times, then the dots light clockwise from top-left. Then the time appears.' },
      { id: 'f-hang', t: 'Hang it',
        h: 'On two screws in the wall, under the top batten.' },
    ] },
];

/* The clock face and what lights up when. Same logic as firmware/qlock/qlock.ino. */
const FACE = ['HETKISAVIJF', 'TIENATZVOOR', 'OVERMEKWART', 'HALFSPMOVER', 'VOORTHGEENS',
  'TWEEAMCDRIE', 'VIERVIJFZES', 'ZEVENONEGEN', 'ACHTTIENELF', 'TWAALFPMUUR'];

function litAt(hour, minute) {
  const W = { HET: [0, 3], IS: [4, 2], VIJF: [7, 4], TIEN: [11, 4], VOOR: [18, 4], OVER: [22, 4],
    KWART: [28, 5], HALF: [33, 4], OVER2: [40, 4], VOOR2: [44, 4], UUR: [107, 3] };
  const HOURS = [[99, 6], [51, 3], [55, 4], [62, 4], [66, 4], [70, 4], [74, 3], [77, 5], [88, 4], [83, 5], [92, 4], [96, 3]];
  const words = [W.HET, W.IS];
  let h = hour;
  const step = Math.floor(minute / 5);
  const by = [['UUR'], ['VIJF', 'OVER'], ['TIEN', 'OVER'], ['KWART', 'OVER2'], ['TIEN', 'VOOR', 'HALF'],
    ['VIJF', 'VOOR', 'HALF'], ['HALF'], ['VIJF', 'OVER', 'HALF'], ['TIEN', 'OVER', 'HALF'],
    ['KWART', 'VOOR2'], ['TIEN', 'VOOR'], ['VIJF', 'VOOR']][step];
  by.forEach(k => words.push(W[k]));
  if (step >= 4) h++;
  words.push(HOURS[h % 12]);
  const lit = new Set();
  words.forEach(([at, len]) => { for (let i = 0; i < len; i++) lit.add(at + i); });
  return { lit, dots: minute % 5 };
}

/* Position on the strip of the letter in row r, column c. */
const stripNumber = (r, c) => r * 11 + (r % 2 === 0 ? c : 10 - c);

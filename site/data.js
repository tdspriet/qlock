/* QLOCK build tracker — the plan.
 *
 * Everything here comes from README.md. Ticks and notes are NOT stored here;
 * they live in site/progress.json (written by serve.py). Ids are the link
 * between the two, so rename an id and its tick is lost.
 */

// ------------------------------------------------------------------ geometry
// Same numbers as tools/qlock.py CONFIG. Design coordinates: seen from the
// FRONT, origin bottom-left, mm.
const GEO = (() => {
  const COLS = 11, ROWS = 10, PLATE = 376, COL_PITCH = 1000 / 30, ROW_PITCH = 35;
  const MARGIN_X = (PLATE - (COLS - 1) * COL_PITCH) / 2;   // 21.33
  const MARGIN_Y = (PLATE - (ROWS - 1) * ROW_PITCH) / 2;   // 30.5
  const colX = [...Array(COLS)].map((_, i) => MARGIN_X + i * COL_PITCH);
  const rowY = [...Array(ROWS)].map((_, r) => PLATE - MARGIN_Y - r * ROW_PITCH);
  return {
    COLS, ROWS, PLATE, COL_PITCH, ROW_PITCH, MARGIN_X, MARGIN_Y, colX, rowY,
    FACE_T: 2.5, WALL_T: 1.6, WALL_H: 18, RIM_T: 4,
    POCKET_L: 30, POCKET_W: 8, POCKET_D: 1.2, SPLINE_T: 1, SPLINE_CLEAR: 0.3,
    SEAM_X: MARGIN_X + 4.5 * COL_PITCH,        // 171.33 faceplate vertical seam
    SEAM_Y: PLATE - MARGIN_Y - 4.5 * ROW_PITCH, // 188    both horizontal seams
    GRID_SEAM_X: MARGIN_X + 5.5 * COL_PITCH,   // 204.67 grid vertical seam
  };
})();

const LETTERS = [
  'HETKISAVIJF',
  'TIENATZVOOR',
  'OVERMEKWART',
  'HALFSPMOVER',
  'VOORTHGEENS',
  'TWEEAMCDRIE',
  'VIERVIJFZES',
  'ZEVENONEGEN',
  'ACHTTIENELF',
  'TWAALFPMUUR',
];

// ------------------------------------------------------------------ shopping
// status lives in progress.json: need (default) | got | have | skip
// price: € per unit, README estimates unless `src` says otherwise.
const SHOP_GROUPS = [
  { id: 'electronics', name: 'Electronics', hint: 'One TinyTronics order' },
  { id: 'materials', name: 'Materials', hint: 'Filament, diffuser, wood' },
  { id: 'tools', name: 'Tools', hint: 'Mostly the same TinyTronics order' },
];

const TT = 'https://www.tinytronics.nl/en/';
const SHOP = [
  // electronics: one TinyTronics order -------------------------------------
  { id: 'esp32', group: 'electronics', shop: 'TinyTronics', name: 'ESP32 Wi-Fi + Bluetooth board, CP2102', qty: 1, price: 9,
    url: TT + 'development-boards/microcontroller-boards/with-wi-fi/esp32-wifi-and-bluetooth-board-cp2102',
    note: 'Micro-USB. Should be a WROOM-32: on a WROVER, GPIO16 belongs to the PSRAM and DATA_PIN must become 13.' },
  { id: 'strip', group: 'electronics', shop: 'TinyTronics', name: 'WS2812B strip, 30 LEDs/m, 1 m', qty: 5, price: 8.5,
    url: TT + 'lighting/led-strips/led-strips/ws2812b-digital-5050-rgb-led-strip-30-leds-1m',
    note: 'Five metres, not four: each metre gives only two 11-LED rows plus 8 spare LEDs. €9 each, €8.50 from 5. A sixth gives you a spare pair of rows. Each strip ships with a JST-SM pigtail; label any you reuse.' },
  { id: 'shifter', group: 'electronics', shop: 'TinyTronics', name: 'SN74AHCT125N level shifter, 14-pin DIP', qty: 1, price: 1,
    url: TT + 'components/ics-and-microcontroller-chips/ics/sn74ahct125n-4-channel-level-converter-3.3v-to-5v-14-pin-dip' },
  { id: 'dipsocket', group: 'electronics', shop: 'TinyTronics', name: '14-pin IC socket', qty: 1, price: 0.35,
    url: TT + 'components/sockets/14-pins-ic-socket' },
  { id: 'perfboard', group: 'electronics', shop: 'TinyTronics', name: 'Experiment PCB 5 × 7 cm, double sided', qty: 1, price: 0.8,
    url: TT + 'tools-and-mounting/prototyping-supplies/experiment-pcbs/experiment-pcb-5cm*7cm-double-sided' },
  { id: 'psu', group: 'electronics', shop: 'TinyTronics', name: 'Sunshine 5 V / 4 A adapter, 5.5 × 2.1 mm (XSG-0504000HEU)', qty: 1, price: 10.5,
    url: TT + 'power/power-supplies/5v/sunshine-power-adapter-with-dc-jack-5.5-2.1mm-5v-4a',
    note: 'Regulated 5 V. Never a 12 V LED adapter. The page doesn’t state the polarity, so measure it. It stays outside the clock.' },
  { id: 'dcjack', group: 'electronics', shop: 'TinyTronics', name: 'DC jack female 5.5 mm to screw terminal', qty: 1, price: 1,
    url: TT + 'cables-and-connectors/connectors/screw-terminals/dc-jack-female-5.5mm-to-terminal-block',
    note: 'No current rating on the page; the README asks for ≥ 4 A. Panel-mount alternative: “DC Jack plastic 5.5mm - Female - Mount”, €0.50, 12 mm hole (also unrated).' },
  { id: 'cap1000', group: 'electronics', shop: 'TinyTronics', name: '1000 µF 25 V electrolytic capacitor, 5 pcs', qty: 1, price: 1.1,
    url: TT + 'components/capacitors/aishi-elektrolytic-capacitor-1000uf-25v-5-pieces',
    note: 'TinyTronics has no 16 V version; 25 V works the same. Across 5 V / GND at the strip input, stripe (−) to GND.' },
  { id: 'cap100n', group: 'electronics', shop: 'TinyTronics', name: '100 nF 50 V ceramic capacitor', qty: 2, price: 0.1,
    url: TT + 'components/capacitors/ceramic-capacitor-100nf-50v',
    note: 'One needed, one spare. Directly across shifter pins 14 and 7, short leads.' },
  { id: 'resistors', group: 'electronics', shop: 'TinyTronics', name: 'Resistor set 10 Ω – 1 MΩ (has 470 Ω and 10 kΩ)', qty: 1, price: 5,
    url: TT + 'components/resistors/resistors/10%CF%89-1m%CF%89-resistor-set',
    note: '470 Ω in the data line right at the strip; 10 kΩ pulldown on shifter pin 2.' },
  { id: 'harness', group: 'electronics', shop: 'TinyTronics', name: 'JST-XH 3-pin connector with cable + PCB socket', qty: 2, price: 0.6,
    url: TT + 'cables-and-connectors/cables-and-adapters/jst-compatible/jst-xh-connector-with-cable-and-pcb-connector-3-pins',
    note: 'The removable ESP32 harness (VIN, GND, GPIO16): socket on the shifter board, cable to the ESP32 headers. Deliberately not JST-SM, the type on every strip pigtail, so the two can never be swapped. Label both halves; one spare.' },
  { id: 'headers', group: 'electronics', shop: 'TinyTronics', name: 'Female pin header, 40 pins', qty: 1, price: 0.46,
    url: TT + 'cables-and-connectors/connectors/pin-headers/female/40-pins-header-female',
    note: 'Cut to length for the ESP32 VIN / GND / GPIO16 connections.' },
  { id: 'wire-red', group: 'electronics', shop: 'TinyTronics', name: 'Stranded wire 0.5 mm², red, 1 m', qty: 1, price: 1,
    url: TT + 'cables-and-connectors/cables-and-adapters/prototyping-wires/loose-wires/wire-single-core-flexible-%C3%B82.15mm-0.5mm2-red-1m',
    note: '≈ 20 AWG: injection leads and row jumpers (the README’s 22 AWG; TinyTronics has none, this is a bit thicker).' },
  { id: 'wire-black', group: 'electronics', shop: 'TinyTronics', name: 'Stranded wire 0.5 mm², black, 1 m', qty: 1, price: 1,
    url: TT + 'cables-and-connectors/cables-and-adapters/prototyping-wires/loose-wires/wire-single-core-flexible-%C3%B82.15mm-0.5mm2-black-1m' },
  { id: 'wire-yellow', group: 'electronics', shop: 'TinyTronics', name: 'Stranded wire 0.14 mm², yellow, 1 m', qty: 1, price: 0.6,
    url: TT + 'cables-and-connectors/cables-and-adapters/prototyping-wires/loose-wires/wire-single-core-flexible-%C3%B81.1mm-0.14mm2-yellow-1m',
    note: 'Data line and the data wire of each jumper.' },
  { id: 'wire-feed', group: 'electronics', shop: 'Domoticx', name: 'Twin wire 18 AWG red/black, silicone, 1 m', qty: 1, price: 1.15,
    url: 'https://domoticx.net/webshop/tweelingdraad-08mm2-18awg-10a-silicone-rood-zwart-per-meter',
    note: 'The main supply feed from the jack to the distribution point. TinyTronics doesn’t sell 18 AWG stranded.' },
  { id: 'heatshrink', group: 'electronics', shop: 'TinyTronics', name: 'Heat shrink tubing kit, black', qty: 1, price: 4,
    url: TT + 'tools-and-mounting/installation-and-mounting-material/heat-shrink-tubing/heat-shrink-tubing-kit-black' },
  { id: 'usbcable', group: 'electronics', shop: 'TinyTronics', name: 'Micro-USB data cable, 1 m', qty: 1, price: 2.25,
    url: TT + 'cables-and-connectors/cables-and-adapters/usb/micro-usb/goobay-93918-micro-usb-cable-1m-black',
    note: 'Skip it if you have one that carries data, not only charge.' },

  // materials ---------------------------------------------------------------
  { id: 'pla-white', group: 'materials', shop: '123-3D', name: 'White PLA 2.85 mm, 1 kg', qty: 1, price: 22.5,
    url: 'https://www.123-3d.nl/123-3D-Filament-PLA-Wit-2-85-mm-1-kg-i11646.html',
    note: 'Light grid: about 340 g sliced, plus the test piece and any failed print. Check first whether work has 2.85 mm white. Ultimaker-brand alternative: 750 g for €43.56 at MakerPoint.' },
  { id: 'pla-black', group: 'materials', shop: '123-3D', name: 'Black PLA 2.85 mm, 1 kg', qty: 1, price: 22.5,
    url: 'https://www.123-3d.nl/123-3D-Filament-PLA-Zwart-2-85-mm-1-kg-i11645.html',
    note: 'Faceplate and splines: about 340 g sliced. Opacity unknown: the 1.3 mm opacity test decides. Ultimaker black, 750 g for €43.56 at MakerPoint, is the fallback.' },
  { id: 'diffuser', group: 'materials', shop: 'Bax-shop', name: 'LEE 216 White Diffusion, 120 × 50 cm', qty: 1, price: 11.8,
    url: 'https://www.bax-shop.be/nl/lichtfilters/lee-filter-120-x-50cm-216-white-diffusion',
    note: 'Cut to 366 × 366 mm. Tracing paper at full size turns out dearer (large sheets ≈ €40), so LEE 216 is the cheaper option here.' },
  { id: 'tracing', group: 'materials', shop: '123inkt', name: 'Tracing paper A3, 90 g/m², 10 sheets (optional)', qty: 1, price: 5.75,
    url: 'https://www.123inkt.be/Canson-kalkpapier-overtrekpapier-A3-10-vellen-00017253-i24422.html',
    note: 'Only to compare against LEE 216 in the light test: A3 is too narrow for the full 366 mm face.' },
  { id: 'plywood', group: 'materials', shop: 'Hubo', name: 'Plywood 3.6 mm, 122 × 61 cm', qty: 1, price: 9.99, later: true,
    url: 'https://www.hubo.be/nl/p/multiplex-122x61-cm-3-6mm/12495/',
    note: 'One sheet gives the back panel and the rear cover. Hubo cuts to size. Buy after the dry-fit: measure the real assembly first.' },
  { id: 'timber', group: 'materials', shop: 'Gamma', name: 'Planed spruce batten 18 × 44 mm, 240 cm', qty: 1, price: 5.59, later: true, src: 'search result, page not loaded',
    url: 'https://www.gamma.be/nl/assortiment/lat-geschaafd-vuren-fsc-18x44-mm-240-cm/p/B270487',
    note: 'For a box about 45 mm deep; 4 sides of ~41 cm fit in 240 cm. Check against the measured stack; 44 × 69 mm exists if you need more depth. Rebate under 10 mm.' },
  { id: 'hardware', group: 'materials', shop: 'Hubo', name: 'Chipboard screws 3.5 × 16 mm, 165 pcs', qty: 1, price: 4.99, later: true,
    url: 'https://www.hubo.be/nl/p/mack-spaanplaatschroeven-pz2-16x3-5-mm-geelverzinkt-165-stuks/209400/',
    note: 'Back panel and rear cover. Add a grommet or clip as strain relief for the DC cable.' },

  // tools -------------------------------------------------------------------
  { id: 'iron', group: 'tools', shop: 'TinyTronics', name: 'Atten ST-2065D soldering iron, 65 W, adjustable', qty: 1, price: 28.75,
    url: TT + 'tools-and-mounting/tools/soldering-irons-and-stations/atten-st-2065d-soldering-iron-65w-adjustable-temperature',
    note: '250–480 °C. About 70 joints, none fine-pitch. TinyTronics doesn’t list a tip or stand in the box: get the chisel tip, and use a stand or a safe resting spot.' },
  { id: 'tip', group: 'tools', shop: 'TinyTronics', name: 'Chisel tip 1.6 mm for the ST-2065D', qty: 1, price: 4,
    url: TT + 'tools-and-mounting/soldering/soldering-tips/solder-tip-for-atten-st-2065d-chisel-1.6mm' },
  { id: 'solder', group: 'tools', shop: 'TinyTronics', name: 'Solder wire 0.7 mm, 100 g, lead-free', qty: 1, price: 10.5,
    url: TT + 'tools-and-mounting/soldering/consumables/solder-wire/premium-solder-wire-0.7mm-100g-lead-free',
    note: 'The leaded 0.7 mm version is the same price and easier to work with.' },
  { id: 'flux', group: 'tools', shop: 'TinyTronics', name: 'No-clean gel flux', qty: 1, price: 3,
    url: TT + 'tools-and-mounting/soldering/consumables/flux/termopasty-no-clean-gel-flux-1.4ml' },
  { id: 'strippers', group: 'tools', shop: 'TinyTronics', name: 'Weicon automatic wire stripper No. 5', qty: 1, price: 19.95,
    url: TT + 'tools-and-mounting/tools/pliers-and-cutters/wire-strippers/premium-weicon-automatic-wire-stripper-no.-5',
    note: 'Strips 0.2–6 mm². The cheap €6.50 4-in-1 tool starts at 0.75 mm², too coarse for these wires.' },
  { id: 'cutters', group: 'tools', shop: 'TinyTronics', name: 'Side cutters, type 170', qty: 1, price: 4,
    url: TT + 'tools-and-mounting/tools/pliers-and-cutters/cutters/cutting-pliers-type-170' },
  { id: 'hands', group: 'tools', shop: 'TinyTronics', name: 'Helping hands with magnifier', qty: 1, price: 5,
    url: TT + 'tools-and-mounting/soldering/accessories/helping-hands-with-magnifying-glass' },
  { id: 'superglue', group: 'tools', shop: 'Brico', name: 'Loctite Super Glue-3 Power Gel, 3 × 1 g', qty: 1, price: 10.2,
    url: 'https://www.brico.be/nl/ijzerwaren/lijmen-tapes-reparatiekits/lijmen/secondelijm/loctite-secondelijm-super-glue-3-power-gel-mini-dose-3x1gr/10077144',
    note: 'Gel, not liquid: it has to bridge the film gap at the rim. 3 g may not cover every seam plus the rim, so consider two.' },
  { id: 'sandpaper', group: 'tools', shop: 'Hubo', name: 'Sandpaper K240 (10) + K400 waterproof (5)', qty: 1, price: 7.88,
    url: 'https://www.hubo.be/nl/p/bosch-schuurpapier-k240-230x93-mm/374462/',
    note: 'K400: hubo.be/nl/p/sam-schuurpapier-waterproof-k400-fijn-5-stuks/246496 (€3.09).' },
  { id: 'tape', group: 'tools', shop: 'Hubo', name: 'Masking tape 30 mm × 50 m', qty: 1, price: 5.49,
    url: 'https://www.hubo.be/nl/p/tesa-universal-afplaktape-50m-x-30mm-beige/134681/' },
  { id: 'multimeter', group: 'tools', shop: 'Work', name: 'Multimeter', qty: 1, price: 0, defaultStatus: 'have',
    note: 'README: borrow from work. Needed for the jack polarity and the harness continuity checks.' },
  { id: 'woodtools', group: 'tools', shop: 'Have', name: 'Saw, wood glue, clamps', qty: 1, price: 0, defaultStatus: 'have',
    note: 'README: already have.' },
];

// Prices checked on the shop pages on 25 Oct 2026, incl. VAT, excl. shipping.
const SHOP_CHECKED = '25 Oct 2026';

// ------------------------------------------------------------------ the plan
// `shop` = done automatically once all those items are got / have / skip.
// `ref`  = which reference tab explains it.
const PHASES = [
  {
    id: 'gather', name: 'Gather', blurb: 'Order the parts and set up the software.',
    tasks: [
      { id: 'buy-electronics', title: 'Order the electronics from TinyTronics', shop: ['esp32', 'strip', 'shifter', 'dipsocket', 'perfboard', 'psu', 'dcjack', 'cap1000', 'cap100n', 'resistors', 'harness', 'headers', 'wire-red', 'wire-black', 'wire-yellow', 'wire-feed', 'heatshrink', 'usbcable'] },
      { id: 'buy-tools', title: 'Get the tools', shop: ['iron', 'tip', 'solder', 'flux', 'strippers', 'cutters', 'hands', 'superglue', 'sandpaper', 'tape', 'multimeter', 'woodtools'] },
      { id: 'buy-filament', title: 'Get ≥ 500 g white and ≥ 500 g opaque black PLA, 2.85 mm', shop: ['pla-white', 'pla-black'] },
      { id: 'buy-diffuser', title: 'Get the diffuser film (and tracing paper to compare)', shop: ['diffuser', 'tracing'] },
      { id: 'sw-arduino', title: 'Install Arduino IDE with esp32 core 3.3.12 and FastLED 3.10.5', ref: 'firmware',
        note: 'Board: ESP32 Dev Module. Default 4 MB flash / OTA-capable partition scheme.' },
      { id: 'sw-cura', title: 'Set Cura to single extruder for the UM3 and turn the prime tower off', ref: 'print',
        note: 'Disable extruder 2 in the printer settings. Dual extrusion shrinks the bed to 197 mm and the wide tiles will not fit.' },
    ],
  },
  {
    id: 'test-prints', name: 'Test prints', blurb: 'Small samples first: about 3 hours, cheap to fail.',
    tasks: [
      { id: 'slice-check', title: 'Slice one wide faceplate and one wide grid with the workplace profile', ref: 'print',
        note: 'Move each tile to X = −12, Y = −1, Z = 0 (Y = +1 if Flip Y is on). Brim 1.2 mm. Check the brim stays inside the printable area, and in layer view check the 0.8 mm seam half-walls and the letter bridges.' },
      { id: 'print-opacity', title: 'Print opacity_sample in black', part: 'opacity_sample' },
      { id: 'print-face-sample', title: 'Print faceplate_sample in black', part: 'faceplate_sample' },
      { id: 'print-grid-sample', title: 'Print lightgrid_sample in white', part: 'lightgrid_sample' },
    ],
  },
  {
    id: 'light-test', name: 'Light test', blurb: 'Four LEDs behind J F / O R prove the optics and the wiring.',
    tasks: [
      { id: 'polarity', title: 'Check the adapter polarity with a multimeter (centre +)', ref: 'wiring' },
      { id: 'shifter-board', title: 'Solder the level-shifter board', ref: 'wiring',
        note: 'Pin 1 to GND (active-low enable). 100 nF right across pins 14–7. 10 kΩ from pin 2 to GND. Unused inputs 5, 9, 12 to GND, unused enables 4, 10, 13 to 5 V.' },
      { id: 'harness', title: 'Make the keyed 3-wire ESP32 harness: VIN, GND, GPIO16', ref: 'wiring',
        note: 'Label both halves. Check continuity per pin; don’t trust the wire colours.' },
      { id: 'cut-sample-leds', title: 'Cut one metre into 11 + 11 + 8 and take two pairs from the 8', ref: 'leds' },
      { id: 'wire-sample', title: 'Wire the sample: two runs of two, snake J → F → R → O', ref: 'leds',
        note: '35 mm row spacing, each LED centred under its letter. Grid notches against the LED panel, diffuser between grid and faceplate. Tape or clamp, no glue.' },
      { id: 'flash-light-test', title: 'Flash light_test.ino over USB', ref: 'firmware',
        note: 'Unplug the whole ESP32 harness first. Never attach USB with the harness connected.' },
      { id: 'opacity-check', title: 'Opacity check: lit LED behind the 1.3 mm square stays dark',
        note: 'Hold the black opacity sample over a lit LED at full brightness. If it glows: use a more opaque filament, or set FACE_T = 3.0 in tools/qlock.py, regenerate everything and retest.' },
      { id: 'light-check', title: 'Check: letters even, neighbours dark, no glow through the plate',
        note: 'Also: letters read right from the smooth side, O and R centres stay attached, the grid sits flat on the strip and joints. If light leaks, find the path (wall, notch, seam, diffuser gap) before the full print.' },
      { id: 'pick-diffuser', title: 'Choose the diffuser: LEE 216, or one or two layers of tracing paper' },
    ],
  },
  {
    id: 'print', name: 'Print the clock', blurb: 'Nine big prints. Use the regenerated files, never mirror them again.',
    tasks: [
      { id: 'print-face-TL', title: 'Print faceplate_TL (black)', part: 'faceplate_TL' },
      { id: 'print-face-TR', title: 'Print faceplate_TR (black)', part: 'faceplate_TR' },
      { id: 'print-face-BL', title: 'Print faceplate_BL (black)', part: 'faceplate_BL' },
      { id: 'print-face-BR', title: 'Print faceplate_BR (black)', part: 'faceplate_BR' },
      { id: 'print-grid-TL', title: 'Print lightgrid_TL (white)', part: 'lightgrid_TL' },
      { id: 'print-grid-TR', title: 'Print lightgrid_TR (white)', part: 'lightgrid_TR' },
      { id: 'print-grid-BL', title: 'Print lightgrid_BL (white)', part: 'lightgrid_BL' },
      { id: 'print-grid-BR', title: 'Print lightgrid_BR (white)', part: 'lightgrid_BR' },
      { id: 'print-splines', title: 'Print splines_x10 (black, 8 needed)', part: 'splines' },
    ],
  },
  {
    id: 'panel', name: 'LED panel', blurb: 'Wire and test everything before anything gets glued.',
    tasks: [
      { id: 'dry-fit', title: 'Dry-fit the four faceplates, splines and grid tiles, no glue',
        note: 'Face-down on a flat table, pockets up. Seen from the back, TL sits on your right. Check the front reads correctly.' },
      { id: 'buy-wood', title: 'Measure the dry-fit, then buy the wood', shop: ['plywood', 'timber', 'hardware'] },
      { id: 'cut-panel', title: 'Cut the 3–4 mm back panel' },
      { id: 'mark-panel', title: 'Mark the LED rows on the panel', ref: 'leds',
        note: 'First LED centre 21.33 mm from the left and 30.5 mm from the top, seen from the front. 33.333 mm per column, 35 mm per row. Mirror left/right when you mark from the back.' },
      { id: 'cut-rows', title: 'Cut the strips into 10 runs of 11 LEDs', ref: 'leds' },
      { id: 'stick-rows', title: 'Stick the rows on, snaking as seen from the front', ref: 'leds',
        note: 'Row 1 left → right, row 2 right → left… Alternate rows are turned 180°: follow the arrows. Keep each strip within ±1 mm of its row or the grid won’t seat.' },
      { id: 'jumpers', title: 'Solder the 9 three-wire row jumpers at the strip ends', ref: 'leds' },
      { id: 'power-feed', title: 'Power feed plus injection at LEDs 0, 55 and 109', ref: 'wiring',
        note: '18 AWG from the jack to the distribution point; the 0.5 mm² red/black (≈ 20 AWG) for the short injection leads. Separate +5 V and GND at each point.' },
      { id: 'bulk-cap', title: 'Fit the 1000 µF capacitor across 5 V / GND at the strip input', ref: 'wiring' },
      { id: 'data-line', title: 'Connect the shifter output through 470 Ω to the strip DIN', ref: 'wiring',
        note: 'The 470 Ω goes right at the strip end, where it damps the reflection.' },
      { id: 'flash-qlock', title: 'Put Wi-Fi details in qlock.ino and flash it over USB', ref: 'firmware',
        note: 'Same USB procedure: harness unplugged while USB is connected.' },
      { id: 'led0-check', title: 'Boot check: LED 0 blinks red 3× behind the H of HET', ref: 'firmware',
        note: 'Judge it from the front. If it’s wrong, flip SERPENTINE_STARTS_LEFT or SERPENTINE_STARTS_TOP and reflash rather than resoldering.' },
      { id: 'all-rows', title: 'Test all 110 LEDs with the grid dry-fitted' },
    ],
  },
  {
    id: 'face', name: 'Glue the face', blurb: 'Only after the full LED test passes.',
    tasks: [
      { id: 'glue-face', title: 'Fit the splines and glue the faceplate seams',
        note: 'Seen from the back, TL is on your right. Confirm the front reads correctly before the glue goes on.' },
      { id: 'glue-grid', title: 'Glue the four grid tiles together', note: 'Each tile carries half a wall at the seams.' },
      { id: 'cut-film', title: 'Cut the diffuser to 366 × 366 mm (5 mm in all round)' },
      { id: 'glue-film', title: 'Film on the faceplate back, grid on top, glue the rim only',
        note: 'Gel superglue bridges the film thickness at the rim. Keep the film flat against the walls and clamp while it sets.' },
    ],
  },
  {
    id: 'frame', name: 'Frame and finish', blurb: 'The box, the back, and hanging it up.',
    tasks: [
      { id: 'frame', title: 'Build the wooden frame, about 45 mm deep',
        note: 'Keep the rebate under 10 mm: the outer letters start 11.8 mm in from the plate edge.' },
      { id: 'fix-panel', title: 'Fix the back panel to the grid over its whole area',
        note: 'Faceplate and grid both split at y = 188 with only four splines across. Without this (or a cross-brace) the clock hinges in the middle.' },
      { id: 'rear-cover', title: 'Make the removable rear cover, with strain relief for the DC cable',
        note: 'Keep the USB port and the ESP32 harness reachable from the back.' },
      { id: 'final-check', title: 'Final check: right time, dims at 23:00, OTA update works', ref: 'firmware',
        note: 'OTA hostname: qlock. HET IS turning violet means no NTP sync for 26 h.' },
      { id: 'hang', title: 'Hang it on the wall' },
    ],
  },
];

// ------------------------------------------------------------------ parts
// What the 3D view and the parts board show. A part's status is the kind of
// its first unfinished step: buy → print → build → done. Filament counts as
// part of printing, so a tile reads "to print" until it's off the bed.
//   { shop: [...] }  done when all those items are got/have/skip
//   { task: 'id' }   done when that task is ticked
const PARTS = [
  // printed — the 3D view loads these STLs directly from ../stl
  ...['TL', 'TR', 'BL', 'BR'].map(t => ({
    id: `faceplate_${t}`, name: `Faceplate ${t}`, family: 'faceplate', kind: 'print', stl: `faceplate_${t}.stl`,
    colour: 'black', layer: 'faceplate', tile: t,
    steps: [
      { kind: 'print', label: 'Black PLA', shop: ['pla-black'] },
      { kind: 'print', label: 'Print', task: `print-face-${t}` },
      { kind: 'build', label: 'Glue seams', task: 'glue-face' },
    ],
  })),
  { id: 'splines', name: 'Splines (8 of 10)', family: 'splines', kind: 'print', stl: 'splines_x10.stl', colour: 'black', layer: 'splines',
    steps: [
      { kind: 'print', label: 'Black PLA', shop: ['pla-black'] },
      { kind: 'print', label: 'Print', task: 'print-splines' },
      { kind: 'build', label: 'Glue into pockets', task: 'glue-face' },
    ] },
  { id: 'diffuser', name: 'Diffuser film', family: 'diffuser', kind: 'buy', layer: 'diffuser',
    steps: [
      { kind: 'buy', label: 'Buy', shop: ['diffuser'] },
      { kind: 'build', label: 'Cut 366 × 366', task: 'cut-film' },
      { kind: 'build', label: 'Glue in', task: 'glue-film' },
    ] },
  ...['TL', 'TR', 'BL', 'BR'].map(t => ({
    id: `lightgrid_${t}`, name: `Light grid ${t}`, family: 'lightgrid', kind: 'print', stl: `lightgrid_${t}.stl`,
    colour: 'white', layer: 'grid', tile: t,
    steps: [
      { kind: 'print', label: 'White PLA', shop: ['pla-white'] },
      { kind: 'print', label: 'Print', task: `print-grid-${t}` },
      { kind: 'build', label: 'Glue tiles', task: 'glue-grid' },
    ],
  })),
  { id: 'leds', name: 'LED rows (10 × 11)', family: 'leds', kind: 'buy', layer: 'leds',
    steps: [
      { kind: 'buy', label: '5 m strip + wire', shop: ['strip', 'wire-red', 'wire-black', 'wire-yellow'] },
      { kind: 'build', label: 'Cut rows', task: 'cut-rows' },
      { kind: 'build', label: 'Stick on panel', task: 'stick-rows' },
      { kind: 'build', label: 'Jumpers', task: 'jumpers' },
      { kind: 'build', label: 'All LEDs tested', task: 'all-rows' },
    ] },
  { id: 'panel', name: 'Back panel', family: 'panel', kind: 'build', layer: 'panel',
    steps: [
      { kind: 'buy', label: 'Plywood', shop: ['plywood'] },
      { kind: 'build', label: 'Cut', task: 'cut-panel' },
      { kind: 'build', label: 'Mark rows', task: 'mark-panel' },
      { kind: 'build', label: 'Fix to grid', task: 'fix-panel' },
    ] },
  { id: 'esp32', name: 'ESP32 + harness', family: 'electronics', kind: 'buy', layer: 'electronics',
    steps: [
      { kind: 'buy', label: 'Buy', shop: ['esp32', 'harness', 'headers'] },
      { kind: 'build', label: 'Harness', task: 'harness' },
      { kind: 'build', label: 'Flash qlock.ino', task: 'flash-qlock' },
    ] },
  { id: 'shifterboard', name: 'Level-shifter board', family: 'electronics', kind: 'build', layer: 'electronics',
    steps: [
      { kind: 'buy', label: 'Parts', shop: ['shifter', 'dipsocket', 'perfboard', 'cap100n', 'resistors'] },
      { kind: 'build', label: 'Solder', task: 'shifter-board' },
      { kind: 'build', label: 'Data line', task: 'data-line' },
    ] },
  { id: 'power', name: 'Power: jack, 1000 µF, feeds', family: 'electronics', kind: 'build', layer: 'electronics',
    steps: [
      { kind: 'buy', label: 'Parts', shop: ['psu', 'dcjack', 'cap1000', 'wire-feed', 'wire-red', 'wire-black'] },
      { kind: 'build', label: 'Polarity', task: 'polarity' },
      { kind: 'build', label: 'Feed + injection', task: 'power-feed' },
      { kind: 'build', label: 'Bulk cap', task: 'bulk-cap' },
    ] },
  { id: 'frame', name: 'Wooden frame', family: 'frame', kind: 'build', layer: 'frame',
    steps: [
      { kind: 'buy', label: 'Timber', shop: ['timber'] },
      { kind: 'build', label: 'Build', task: 'frame' },
    ] },
  { id: 'rearcover', name: 'Rear cover', family: 'rearcover', kind: 'build', layer: 'rearcover',
    steps: [
      { kind: 'buy', label: 'Panel', shop: ['plywood', 'hardware'] },
      { kind: 'build', label: 'Make', task: 'rear-cover' },
    ] },
  // test pieces (not in the 3D clock)
  { id: 'opacity_sample', name: 'Opacity sample', family: 'test', kind: 'print', stl: 'test/opacity_sample.stl', colour: 'black', test: true,
    steps: [
      { kind: 'print', label: 'Black PLA', shop: ['pla-black'] },
      { kind: 'print', label: 'Print', task: 'print-opacity' },
      { kind: 'build', label: 'Opacity check', task: 'opacity-check' },
    ] },
  { id: 'faceplate_sample', name: 'Faceplate sample', family: 'test', kind: 'print', stl: 'test/faceplate_sample.stl', colour: 'black', test: true,
    steps: [
      { kind: 'print', label: 'Black PLA', shop: ['pla-black'] },
      { kind: 'print', label: 'Print', task: 'print-face-sample' },
      { kind: 'build', label: 'Light test', task: 'light-check' },
    ] },
  { id: 'lightgrid_sample', name: 'Light grid sample', family: 'test', kind: 'print', stl: 'test/lightgrid_sample.stl', colour: 'white', test: true,
    steps: [
      { kind: 'print', label: 'White PLA', shop: ['pla-white'] },
      { kind: 'print', label: 'Print', task: 'print-grid-sample' },
      { kind: 'build', label: 'Light test', task: 'light-check' },
    ] },
];

// size: exported STL bounds. g / min: CuraEngine 5.13 slice with the README
// settings (UM3, AA 0.4, 0.2 mm, 20 % infill, 1.2 mm brim), PLA at 1.24 g/cm³.
// gSolid: STL volume × 1.24, the README's "about 800 g" figure.
const PRINT_INFO = {
  faceplate_TL: { size: '171.3 × 188 × 2.5', g: 76, gSolid: 89, min: 397 },
  faceplate_TR: { size: '204.7 × 188 × 2.5', g: 91, gSolid: 106, min: 473 },
  faceplate_BL: { size: '171.3 × 188 × 2.5', g: 76, gSolid: 89, min: 398 },
  faceplate_BR: { size: '204.7 × 188 × 2.5', g: 91, gSolid: 106, min: 473 },
  lightgrid_TL: { size: '204.7 × 188 × 18', g: 92, gSolid: 109, min: 409 },
  lightgrid_TR: { size: '171.3 × 188 × 18', g: 79, gSolid: 94, min: 350 },
  lightgrid_BL: { size: '204.7 × 188 × 18', g: 92, gSolid: 109, min: 418 },
  lightgrid_BR: { size: '171.3 × 188 × 18', g: 78, gSolid: 94, min: 355 },
  splines: { size: '29.4 × 110 × 1', g: 3, gSolid: 3, min: 17 },
  opacity_sample: { size: '25 × 25 × 1.3', g: 1, gSolid: 1, min: 4 },
  faceplate_sample: { size: '72.1 × 83.8 × 2.5', g: 15, gSolid: 17, min: 75 },
  lightgrid_sample: { size: '72.1 × 83.8 × 18', g: 21, gSolid: 27, min: 91 },
};
const PRINT_TIME_NOTE = 'Times and grams from a CuraEngine 5.13 slice with the settings below (UM3 “Fast” 0.2 mm profile, generic PLA, 20 % infill, 1.2 mm brim), without heat-up. Cura on the printer’s own profile may differ a little. The README’s 407 g + 392 g is the solid volume; with 20 % infill it comes to about 340 g of each colour.';

const PART_NOTES = {
  faceplate: 'Prints face-down on the glass, spline pockets up, no support. The file is deliberately mirrored when seen from above: do not mirror it again. O A R P D have a thin bridge at the top so their middles stay put.',
  lightgrid: 'Flat wall edges on the glass, strip and wire notches up. Each tile carries half a wall at the seams. 12 mm slots let the strip pass every vertical wall; 6 mm notches at the ends carry the row jumpers.',
  splines: 'Print in the faceplate colour: the pockets leave only 1.3 mm of plate, partly over a lit cell. Four bridge the vertical seam, four the horizontal one.',
  diffuser: 'Sealed inside the sandwich between faceplate and grid, so choose it after the light test. It sits under the walls but not under the 4 mm rim.',
  leds: 'Column pitch is 33.333 mm on purpose: exactly a 30 LED/m strip. Each 11-LED run is 366.7 mm in a 368 mm gap, so about 0.7 mm play at each end.',
  panel: 'LED strips stick to its front face. Screw or glue it to the grid over the whole area, or the clock hinges at y = 188.',
  electronics: 'ESP32 on a removable 3-wire harness (VIN, GND, GPIO16). The SN74AHCT125N lifts the 3.3 V data to 5 V. Strip current never runs through the harness.',
  frame: 'Box depth about 45 mm. Rebate under 10 mm, or it starts covering the outer letters.',
  rearcover: 'Removable, with the USB port and the harness reachable, and strain relief for the DC cable.',
  test: 'Cropped from the real top-right corner: reads J F / O R from the smooth front, with the clock’s top and right rim intact.',
};

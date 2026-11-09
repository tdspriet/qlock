# QLOCK — Dutch word clock, 3D printed

450 × 450 mm, the full QLOCKTWO size. 11 × 10 letters, all 110 lit, one LED
per letter in its own little box. Prints in four tiles on the Bambu Lab H2C
at work.

```
H E T K I S A V I J F      "HET IS VIJF OVER HALF DRIE"
T I E N A T Z V O O R
O V E R M E K W A R T      faceplate  450 x 450 x 2.5 mm, 4 tiles
H A L F S P M O V E R      pitch      33.33 x 36.67 (cell 31.7 x 35.1)
V O O R T H G E E N S      LEDs       110 x WS2812B
T W E E A M C D R I E      depth      18 mm grid, ~16 mm LED to film
V I E R V I J F Z E S      biggest tile  242 x 225 mm  (bed 325 x 320)
Z E V E N O N E G E N
A C H T T I E N E L F
T W A A L F P M U U R
```

Column pitch is 33.333 mm on purpose — that's exactly a 30 LED/m strip. Cut it
into 10 rows of 11 and every LED sits dead centre under its letter, in an
identical 31.7 × 35.1 mm box. Nine jumpers instead of 110 hand-wired LEDs.

The 45 cm plate keeps that pitch and adds a plain border instead: about
49 mm from the edge to the nearest letter, the same on all four sides. That
is why the rows are 36.667 mm apart rather than 35. Rows are separate strips,
so row spacing is free; only the column pitch is fixed by the strip.

**Why still four tiles:** the H2C bed is 325 × 320 mm on the left nozzle and
305 × 320 mm on the right. Splitting 450 mm in two gives 450 × 225 mm pieces,
which don't fit even diagonally. Four tiles of at most 242 × 225 mm fit
either nozzle with room to spare. The old 376 mm version only existed to get
four tiles onto the Ultimaker's 215 mm bed instead of nine.

## Build tracker

`site/` is a small local website for following the build: the plan as a
checklist, a 3D model of the clock coloured by what's still to buy, print or
build, the shopping list with verified links, and the wiring, print and
firmware reference.

```bash
python3 site/serve.py          # opens http://localhost:8017/site/
python3 site/serve.py --lan    # also reachable from a phone on the same wifi
```

Standard library only, works offline. Ticks are saved to
`site/progress.json`; commit it to keep progress with the project. Any static
host (GitHub Pages) shows the committed progress read-only.

## Buy — budget ≈ €90–100 for electronics

Electronics from [TinyTronics](https://www.tinytronics.nl/en); diffuser and
frame materials separately. Prices are estimates, excluding shipping. Use
**1.75 mm PLA** for the H2C.

| What | ~€ |
|---|---|
| [ESP32 dev board](https://www.tinytronics.nl/en/development-boards/microcontroller-boards/with-wi-fi/esp32-wifi-and-bluetooth-board-cp2102) (WROOM-32, USB) | 9 |
| [WS2812B strip **30 LEDs/m**](https://www.tinytronics.nl/en/lighting/led-strips/led-strips/ws2812b-digital-5050-rgb-led-strip-30-leds-1m), IP20 bare (10 mm) — **5 ×**, it's sold per metre | 45 |
| [SN74AHCT125N level shifter](https://www.tinytronics.nl/en/components/ics-and-microcontroller-chips/ics/sn74ahct125n-4-channel-level-converter-3.3v-to-5v-14-pin-dip) | 2 |
| [Sunshine XSG-0504000HEU, regulated 5 V / 4 A](https://www.tinytronics.nl/en/power/power-supplies/5v/sunshine-power-adapter-with-dc-jack-5.5-2.1mm-5v-4a), enclosed EU adapter, 5.5 × 2.1 mm centre-positive plug | 10.50 |
| 5.5 × 2.1 mm female DC jack to screw terminals, rated at least 4 A | 1 |
| [1000 µF 16 V electrolytic cap](https://www.tinytronics.nl/en/components/capacitors) | 1 |
| [470 Ω + 10 kΩ resistors](https://tinytronics.nl/shop/en/components/resistors) — grab the whole set, it's handier | 4 |
| [100 nF / 50 V ceramic capacitor](https://www.tinytronics.nl/en/components/capacitors/ceramic-capacitor-100nf-50v), one for the level shifter | 0.10 |
| Keyed 3-pin inline connector pair with leads, rated ≥1 A, for the removable ESP32 harness; female header sockets for VIN/GND/GPIO16 | 2 |
| USB data cable matching the ESP32 board, for initial programming | have / 3 |
| Perfboard, small piece, + 14-pin DIP socket — for the level shifter | 2 |
| [Stranded copper wire](https://www.tinytronics.nl/en/cables-and-connectors/cables-and-adapters/prototyping-wires/loose-wires): 18 AWG red/black supply feed, 22 AWG red/black short injection leads and row jumpers, 24 AWG yellow data | 8 |
| [Heat shrink assortment](https://www.tinytronics.nl/en/cables-and-connectors) | 4 |

Also allow for a **3–4 mm plywood back panel**, wooden frame, removable rear
cover, mounting screws and cable strain relief. Measure the assembled print
before cutting the wood. The supply stays outside the clock.

The firmware limits its LED power estimate to **3 A**, leaving headroom for
the ESP32 on the selected 4 A supply. Do not substitute a 12 V LED adapter.

> **Five 1 m strips, not four.** A 1 m strip holds 30 LEDs, which cuts into
> only *two* 11-LED rows with 8 LEDs wasted. Four metres would get you 8 rows,
> not 10; five gets you exactly 10. Buy a sixth if you want a spare pair of
> rows — there are no spare rows otherwise, only 8 loose LEDs per metre.

## Diffuser — the one thing TinyTronics doesn't sell

Pick one, before you glue anything, because it's sealed inside the sandwich:

- **[LEE 216](https://www.bax-shop.be/nl/lichtfilters/lee-filter-120-x-50cm-216-white-diffusion)**,
  budget €10–15 at Bax. Test it with your LEDs before final assembly.
- **Tracing paper**, 90–110 g/m², as a low-cost alternative. Test one or two
  layers for diffusion and brightness.

## Filament

Use **white PLA for the grid** and **opaque black PLA for the faceplate and
splines**. White reflects light inside each cell; actual opacity depends on
the filament and print settings. A dark faceplate colour other than black is
fine if it passes the test below.

Print `stl/test/opacity_sample.stl` in the faceplate colour. It matches the
**1.3 mm** remaining underneath the spline pockets. Hold a lit LED behind it
at the intended brightness: the plastic should stay dark. If it glows, use
a more opaque filament or increase `FACE_T` to 3.0 in `tools/qlock.py`,
regenerate everything, and retest the new sample.

The final parts contain about **505 g white + 580 g dark PLA** (solid
volume; these parts are thin, so infill hardly changes it), plus about 80 g
of test pieces. Get **a 1 kg spool of each colour**. Printing time comes
from Bambu Studio when you slice.

## Tools

Also TinyTronics, same order.

| | ~€ |
|---|---|
| [Soldering iron](https://www.tinytronics.nl/en/tools-and-mounting/tools/soldering-irons-and-stations), temperature-controlled, + solder + flux | 40 |
| Wire strippers, side cutters | 10 |
| Helping hands, or just tape | 8 |
| Superglue gel — bonds PLA well | 5 |
| Sandpaper 240/400, masking tape | 5 |
| Multimeter | work |
| Saw, wood glue, clamps for the frame | have |

About 70 joints all told, none of them fine-pitch — any decent 60 W iron with
a chisel tip is plenty.

## Print

| File | Colour | Notes |
|---|---|---|
| `faceplate_TL TR BL BR` | any dark | face-down on the plate, no support |
| `lightgrid_TL TR BL BR` | white | flat wall edges on the plate, strip/wire notches up |
| `splines_x14` | faceplate colour | 12 needed, 2 spare |
| `test/faceplate_sample`, `test/lightgrid_sample`, `test/opacity_sample` | as above | print these first |

**Use the regenerated 450 mm files; delete any older imports.** Tile names
TL/TR/BL/BR always describe their position **seen from the front**. The
exported faceplate is deliberately mirrored when viewed from above: the
readable front is against the build plate, with spline pockets facing up.
Import at 100% scale, and **do not mirror it or let Bambu Studio
auto-orient it**. The grid exports use the same orientation so the staggered
seams still align.

**Bambu Studio, H2C:**

- One tile per plate. The biggest is 241.7 × 225 mm, so every part fits
  either nozzle in any rotation; auto-arrange is fine. Splines and the three
  samples can share one plate (two filaments, so expect some flushing there).
- Every clock part is one colour: give each plate one filament. No prime
  tower or flushing for those plates.
- **0.20 mm Standard** process, 0.4 mm nozzle, 20% infill. Turn on **Detect
  thin wall** and check in the preview that the 0.8 mm seam half-walls print.
- **The build plate texture becomes the clock's front.** Use the Smooth PEI
  plate or a Cool Plate for a smooth face. The Textured PEI plate gives a
  matte, textured face, which can also look good; print the faceplate sample
  on the plate you plan to use and decide.
- No brim needed for the faceplates. If a grid tile corner lifts, add an
  outer brim; every part leaves at least 5 mm of bed all round.

O A R P D have a thin bridge at the top, or the middle of the O falls out.

Print the splines in the **faceplate colour**. Their pockets leave only 1.3 mm
of plate and some of that sits over a lit cell — so do the light-tightness
test on a **1.3 mm** square, not 2.5.

## First print and light test

Print the three files in `stl/test/`. The faceplate and grid samples are
**109.1 × 115.8 mm**, cropped from the actual top-right corner. Seen from the
smooth front they read **J F / O R**, with the clock's full border, ribs and
rim beside them, so the sample also shows how wide the border looks.

Use four spare LEDs from the 8-LED offcuts, as **two runs of two**. Keep the
36.67 mm row spacing and centre each LED under its letter. Viewed from the
front, snake **J → F → R → O**. Fit the grid with its notches against the LED
panel and a piece of the chosen diffuser between grid and faceplate. Tape
or clamp it together first.

Upload `firmware/light_test/light_test.ino` using the Wiring procedure below.
It lights each cell separately and then all four, without Wi-Fi. Check:

- Letters read correctly from the smooth side; the O and R centres stay attached.
- Strip, solder joints and jumper wires let the grid sit flat on the panel.
- Letters light evenly, neighbouring letters stay dark, and the faceplate
  and opacity sample do not glow.

If light leaks, locate the path (wall, notch, seam or diffuser gap) and block
it or change the material before the full run. White PLA alone is not a
promise of optical isolation. Once this sample passes, print the full tiles.
Keep all assemblies unglued until their wiring and lighting tests pass.

## Assemble

1. Dry-fit the faceplates **face-down on a flat table**, with spline pockets
   up. From this rear view the TL tile is on your right. Confirm the smooth
   front reads correctly, then fit the splines and glue the seams.
2. Glue the 4 grid tiles together. Each carries half a wall at the seams.
3. Cut the LEE filter to **440 × 440**, 5 mm smaller all round. The 50 cm
   wide LEE sheet fits it.
4. Film on the back of the faceplate, grid on top, glue around the rim only.
   The film sits under the walls and border ribs but not under the rim, so it props the grid
   slightly proud by its actual thickness — **gel** superglue bridges that.
   Keep the film flat against the walls; clamp while the rim glue sets.
5. LED strips on a 3–4 mm back panel. Test all rows and dry-fit before fixing
   the panel securely to the frame. Keep the rear cover removable.
6. Wooden frame, rear cover, done.

The outer letters start **48.8 mm** in from the plate edge, so the frame
rebate is not critical: 10 mm is plenty. Leave the USB port **and the
removable ESP32 harness** reachable through the back.

Box depth ≈ 45 mm, inside 450 × 450 mm.

> Faceplate and grid both split at **y = 225**, and nothing bridges that line
> across the full width except six splines. Screw or glue the back panel to
> the grid over its whole area, or cross-brace the frame — otherwise the
> finished clock has a hinge across its middle.

## Wiring

Cut the strip into **10 runs of 11**. Stick them on the back panel 36.667 mm apart
and snake them **as seen from the front**: row 1 left→right, row 2
right→left, etc. Viewed from the open back these directions reverse. Alternate rows get
flipped 180°, so watch the arrows.

With a nominal 450 × 450 mm panel, the first LED centre is **58.33 mm from
the left and 60 mm from the top, seen from the front**. The next column is
33.333 mm away and the next row 36.667 mm away. Mirror left/right when marking
the LED side of the panel from the back.

The grid is already notched: 12 mm slots through every vertical wall for the
strip, 6 mm at the far left and right of every horizontal wall for the
jumpers — tight against the outer walls, right where the strip ends and its
solder pads are, so the wires run straight along the edge between rows. An
11-LED run is 366.7 mm in a 368 mm gap, so ~0.7 mm play at each end. The
tight axis is **Y — keep each strip within ±1 mm of its row**, or the grid
won't seat on the panel.

That's 9 three-wire jumpers plus the feed and two injection points — about 70
solder joints. Wiring 110 LEDs individually would have been nearer 660.

SN74AHCT125N, 14-pin DIP. **Pin 1 must go to GND** — it's an active-low output
enable. A floating enable gives undefined behaviour.

```
ESP32 GPIO16 ──[removable harness]──> pin 2 (1A) ──[10kΩ]── GND
                                      pin 1 (1OE) ── GND
                                      pin 3 (1Y) ──[470Ω]──> strip DIN
                                      pin 14 (VCC) ── 5V
                                      pin 7 (GND) ── GND
                                      100nF directly between pins 14 and 7
                                      pins 5, 9, 12 (unused inputs) ── GND
                                      pins 4, 10, 13 (unused enables) ── 5V
                                      pins 6, 8, 11 (unused outputs) ── unconnected

5V ──┬── strip (separate +5V AND GND feeds at physical LEDs 0, 55 and 109)
     ├── 1000µF across 5V/GND at strip input (+ to 5V, − stripe to GND)
     ├── shifter pin 14
     └──[removable harness]── ESP32 VIN (direct 5V, no series diode)
GND ── tie PSU, strip and shifter together
     └──[removable harness]── ESP32 GND
```

Keep the **100 nF ceramic capacitor** close to the shifter's power pins, with
short leads; the large capacitor at the strip does not replace it. This is
[TI's recommended bypass arrangement](https://www.ti.com/lit/ds/symlink/sn74ahct125.pdf).

The **removable harness carries all three ESP32 connections: VIN, GND and
GPIO16**. Use a keyed plug and label both halves; this is the controller
connection, not an LED-strip connector. Check pin continuity rather than
assuming the supplied wire colours identify the signals.

**USB programming procedure:**

1. Switch off the clock supply and unplug the entire three-wire ESP32 harness.
2. Connect the isolated ESP32 to USB and upload. Nothing from the clock is
   connected to its VIN, GND or GPIO16 while USB is attached.
3. Unplug USB, reconnect the harness, then switch on the clock supply.

Simply switching the supply off does **not** isolate VIN from the strip.
Never attach USB with the harness connected. During normal use the board
receives the full regulated 5 V on VIN, consistent with the
[seller's specification](https://www.tinytronics.nl/en/development-boards/microcontroller-boards/with-wi-fi/esp32-wifi-and-bluetooth-board-cp2102).
Wi-Fi OTA updates need no cable changes.

Keep power injection leads short, use the wire sizes in the shopping list,
and run the main power feed directly from the jack to the distribution point.
Do not pass strip current through the ESP32 harness. Verify jack polarity
with a multimeter before connecting the electronics.

The 470 Ω goes on the **output** side, right at the strip. That's where it
damps the reflection; on the input it does nothing.

Add a **10 kΩ pulldown from pin 2 to GND**. This holds the data input low
while GPIO16 is not driven during boot.

The clock lights at most **23 letters**. Actual current depends on the strip
revision, brightness and colour. The listed strip specifies **36 mA per LED
±10% at full white**; the clock normally uses much less. The firmware's
**3 A LED power estimate** leaves headroom on the **4 A supply** for the ESP32.
It is a software estimate, not a fuse or a measured current regulator.

> You'll be working from the back, so left is mirrored. Light LED 0 before you
> glue anything — it should be the **H** of HET, top-left, seen from the front.

```python
led = row * 11 + (col if row % 2 == 0 else 10 - col)
```

## Firmware

`firmware/qlock/qlock.ino`. Arduino IDE, board **ESP32 Dev Module**, one
library: **FastLED 3.10.5**, with **esp32 core 3.3.12**. Use the default
4 MB flash / OTA-capable partition scheme. Put your Wi-Fi credentials in
the two `#define`s at the top and upload using the USB procedure above.

- NTP over wifi, Dutch DST handled by the timezone string. No RTC needed.
- Dims to 25/255 between 23:00 and 07:00.
- On boot the logical top-left pixel blinks red three times. If it
  isn't the **H** of HET top-left seen from the front, flip
  `SERPENTINE_STARTS_LEFT` for a left/right reversal or
  `SERPENTINE_STARTS_TOP` for a bottom-starting snake, and reflash.
- Amber pulse on LED 0 means it hasn't got the time yet — check your wifi
  details.
- HET IS turn violet if NTP hasn't synced in 26 h, so a silently drifting
  clock tells you rather than just being wrong.
- OTA is on (hostname `qlock`), so you can reflash over wifi once it's shut.

Both sketches were compiled against **esp32 core 3.3.12 + FastLED 3.10.5**
for ESP32 Dev Module on 24 September 2026. The clock uses 84% flash / 17% RAM;
the sample test uses 29% / 8%. `tools/check_firmware.py` runs the actual C++
renderer for all **1,440 minutes**, checks the Dutch phrases against the
letter grid, verifies the physical LED mapping and night schedule, and
confirms the maximum of 23 lit letters. Mesh checks and a front preview are
provided by `tools/verify.py`. Physical fit and lighting still require the
small sample test above.

`tools/verify.py` also checks that every STL fits the H2C's smaller
(right-nozzle) bed, 305 × 320 mm, with 5 mm to spare all round. The 450 mm
files have not been sliced in Bambu Studio yet: slice one wide faceplate and
one wide grid and check the preview before queuing the rest.

## Word map

Reading order, 0 = top-left H. `HET` and `IS` always on.

| Word | Idx | | Word | Idx |
|---|---|---|---|---|
| HET | 0–2 | | EEN | 51–53 |
| IS | 4–5 | | TWEE | 55–58 |
| VIJF *(min)* | 7–10 | | DRIE | 62–65 |
| TIEN *(min)* | 11–14 | | VIER | 66–69 |
| VOOR *(uur)* | 18–21 | | VIJF | 70–73 |
| OVER *(uur)* | 22–25 | | ZES | 74–76 |
| KWART | 28–32 | | ZEVEN | 77–81 |
| HALF | 33–36 | | NEGEN | 83–87 |
| OVER *(na kwart)* | 40–43 | | ACHT | 88–91 |
| VOOR *(half)* | 44–47 | | TIEN | 92–95 |
| | | | ELF | 96–98 |
| | | | TWAALF | 99–104 |
| | | | UUR | 107–109 |

Two OVERs and two VOORs so every phrase still reads left-to-right:

| | | | |
|---|---|---|---|
| :00 | HET IS · hour · UUR | :30 | HALF · hour+1 |
| :05 | VIJF · OVER(22) · hour | :35 | VIJF · OVER(22) · HALF · hour+1 |
| :10 | TIEN · OVER(22) · hour | :40 | TIEN · OVER(22) · HALF · hour+1 |
| :15 | KWART · OVER(40) · hour | :45 | KWART · VOOR(44) · hour+1 |
| :20 | TIEN · VOOR(18) · HALF · hour+1 | :50 | TIEN · VOOR(18) · hour+1 |
| :25 | VIJF · VOOR(18) · HALF · hour+1 | :55 | VIJF · VOOR(18) · hour+1 |

## Files

```
stl/                    9 full-size print files (450 mm, 4 tiles each)
stl/test/               3 small material/fit/light test files
firmware/qlock/         the ESP32 clock sketch
firmware/light_test/    four-LED sample test, no Wi-Fi
tools/qlock.py          regenerates the STLs — every dimension is in CONFIG
tools/verify.py         exported-mesh and front-orientation checks
tools/check_firmware.py host C++ simulation of all 1440 minutes
reference/letters.json  the 110 letter outlines the script draws from
reference/front-preview.svg  front view reconstructed from verified STLs
site/                   build tracker: python3 site/serve.py
site/data.js            the plan, shopping list and parts behind it
site/progress.json      your ticks, written by serve.py
```

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python tools/qlock.py
.venv/bin/python tools/verify.py
python3 tools/check_firmware.py  # needs c++ (Xcode command-line tools on Mac)
```

No CAD software needed. The letters live in a plain JSON file the script
reads. STLs open in Preview, or better in Bambu Studio, which you need for
the printer anyway. `.ino` opens in VS Code; Arduino IDE flashes it.

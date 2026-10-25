# QLOCK — Dutch word clock, 3D printed

376 × 376 mm. 11 × 10 letters, all 110 lit, one LED per letter in its own
little box. Prints on the Ultimaker 3 at work.

```
H E T K I S A V I J F      "HET IS VIJF OVER HALF DRIE"
T I E N A T Z V O O R
O V E R M E K W A R T      faceplate  376 x 376 x 2.5 mm, 4 tiles
H A L F S P M O V E R      pitch      33.33 x 35 (cell 31.7 x 33.4)
V O O R T H G E E N S      LEDs       110 x WS2812B
T W E E A M C D R I E      depth      18 mm grid, ~16 mm LED to film
V I E R V I J F Z E S      biggest tile  205 x 188 mm  (bed is 215)
Z E V E N O N E G E N
A C H T T I E N E L F
T W A A L F P M U U R
```

Column pitch is 33.333 mm on purpose — that's exactly a 30 LED/m strip. Cut it
into 10 rows of 11 and every LED sits dead centre under its letter, in an
identical 31.7 × 33.4 mm box. Nine jumpers instead of 110 hand-wired LEDs.

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
**2.85 mm PLA** for the Ultimaker 3.

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

The final parts contain about **407 g white + 392 g dark PLA** before brims,
test pieces and waste. Have **at least 500 g of each colour** available;
750 g or 1 kg spools leave room for a failed print. Printing time and actual
filament consumption come from Cura's estimate for your printer profile.

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
| `faceplate_TL TR BL BR` | any dark | face-down on the glass, no support |
| `lightgrid_TL TR BL BR` | white | flat wall edges on glass, strip/wire notches up |
| `splines_x10` | faceplate colour | 8 needed, 2 spare |
| `test/faceplate_sample`, `test/lightgrid_sample`, `test/opacity_sample` | as above | print these first |

**Use the regenerated files in this folder; replace any older Cura imports.**
Tile names TL/TR/BL/BR always describe their position **seen from the front**.
The exported faceplate is deliberately mirrored when viewed from above: the
readable, smooth front is against the glass, with spline pockets facing up.
Import at 100% scale with Z unchanged; **do not mirror it again**. The grid
exports use the same orientation so the staggered seams still align.

Cura: **single extruder, prime tower off** — disable extruder 2 in Cura's
printer settings. Dual drops the bed to 197 mm and the wide tiles won't fit.
Slice one wide tile first to check it isn't greyed out before queueing the
rest. 0.2 mm layers, 20 % infill.

For the **stock Ultimaker 3 profile, left extruder / AA 0.4**, use **1.2 mm
brim (3 lines at 0.4 mm)**, initial-layer line width **100%**, and Travel
Avoid Distance **1 mm**. Use a clean, level glass plate with the printer's
recommended PLA adhesion treatment.

For each full tile, keep its exported XY orientation, select Move and set
**X = −12 mm, Y = −1 mm, Z = 0** relative to the bed centre. This placement
was checked against Cura 5.13's UM3 clip keep-outs, left-nozzle reach and
prime-blob clearance, including the brim. If you enabled Cura's **Flip Y
axis** preference, enter **Y = +1 mm** instead. Prime tower stays off; the
single-extruder prime blob can stay on. Do not auto-arrange afterwards.

The old **4 mm brim** recommendation is withdrawn: a nominal 215 mm square
does not account for the printer's reserved areas. Slice one wide faceplate
and one wide grid with the actual workplace profile before queuing the rest;
check that all brim and extrusion paths stay inside its printable area.

Use the **AA 0.4 print core**. Inspect layer preview for continuous **0.8 mm
seam half-walls** and the letter bridges. Enable Print Thin Walls if your
Cura version exposes it; the preview is the deciding check.

The parts contain about 800 g PLA before brims and samples. Plan the print
queue using Cura's sliced time estimates.

O A R P D have a thin bridge at the top, or the middle of the O falls out.

Print the splines in the **faceplate colour**. Their pockets leave only 1.3 mm
of plate and some of that sits over a lit cell — so do the light-tightness
test on a **1.3 mm** square, not 2.5.

## First print and light test

Print the three files in `stl/test/`. The faceplate and grid samples are
**72.1 × 83.8 mm**, cropped from the actual top-right corner. Seen from the
smooth front they read **J F / O R**, with the clock's top and right rim intact.

Use four spare LEDs from the 8-LED offcuts, as **two runs of two**. Keep the
35 mm row spacing and centre each LED under its letter. Viewed from the
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
3. Cut the LEE filter to **366 × 366**, 5 mm smaller all round.
4. Film on the back of the faceplate, grid on top, glue around the rim only.
   The film sits under the walls but not under the rim, so it props the grid
   slightly proud by its actual thickness — **gel** superglue bridges that.
   Keep the film flat against the walls; clamp while the rim glue sets.
5. LED strips on a 3–4 mm back panel. Test all rows and dry-fit before fixing
   the panel securely to the frame. Keep the rear cover removable.
6. Wooden frame, rear cover, done.

Keep the frame rebate under **10 mm** — the outer letters start 11.8 mm in
from the plate edge and anything deeper starts covering them. Leave the USB
port **and the removable ESP32 harness** reachable through the back.

Box depth ≈ 45 mm.

> Faceplate and grid both split at **y = 188**, and nothing bridges that line
> across the full width except four splines. Screw or glue the back panel to
> the grid over its whole area, or cross-brace the frame — otherwise the
> finished clock has a hinge across its middle.

## Wiring

Cut the strip into **10 runs of 11**. Stick them on the back panel 35 mm apart
and snake them **as seen from the front**: row 1 left→right, row 2
right→left, etc. Viewed from the open back these directions reverse. Alternate rows get
flipped 180°, so watch the arrows.

With a nominal 376 × 376 mm panel, the first LED centre is **21.33 mm from
the left and 30.5 mm from the top, seen from the front**. The next column is
33.333 mm away and the next row 35 mm away. Mirror left/right when marking
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

All 12 STLs also passed a **CuraEngine 5.13 geometry smoke slice** at 0.2 mm
layers / 0.4 mm nozzle, with the brim and placement above. This used explicit
test settings, not the workplace printer's saved material profile; generate
your final printer G-code in Cura. The stock UM3 keep-out calculation can be
repeated on this Mac with:

```bash
.venv/bin/python tools/verify.py --cura-resources "/Applications/UltiMaker Cura.app/Contents/Resources/share/cura/resources"
```

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
stl/                    9 full-size print files
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
reads. STLs open in Preview, or better in Cura, which you need for the printer
anyway. `.ino` opens in VS Code; Arduino IDE flashes it.

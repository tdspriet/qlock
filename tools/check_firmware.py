#!/usr/bin/env python3
"""
Run the clock's own code on this computer for every minute of a day and check
what lights up: the Dutch phrase, the minute dots, the strip order, the night
hours.

    python3 tools/check_firmware.py        (needs a C++ compiler: c++)
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HARNESS = """
#include <cstdint>
#include <ctime>
#include <iostream>
struct CRGB { int r, g, b; CRGB(int r = 0, int g = 0, int b = 0) : r(r), g(g), b(b) {} };
%s
struct { void clear() { for (auto &p : leds) p = CRGB(); } } FastLED;
%s
int main() {
  for (int h = 0; h < 24; h++) for (int m = 0; m < 60; m++) {
    render(h, m);
    for (int i = 0; i < 110; i++) if (leds[pixel(i)].r) std::cout << i << ' ';
    std::cout << '|';
    for (int i = 110; i < NUM_LEDS; i++) if (leds[i].r) std::cout << ' ' << i;
    std::cout << '\\n';
  }
  for (int i = 0; i < 110; i++) std::cout << int(pixel(i)) << ' ';
  std::cout << '\\n';
  for (int h = 0; h < 24; h++) std::cout << isNight(h);
  std::cout << '\\n';
}
"""


def main():
    sketch = (ROOT / "firmware/qlock/qlock.ino").read_text()
    logic = sketch[sketch.index("// >>> clock logic"):sketch.index("// <<< clock logic")]
    data, code = logic.split("CRGB leds[NUM_LEDS];")
    source = HARNESS % (data + "CRGB leds[NUM_LEDS];", code)

    with tempfile.TemporaryDirectory() as d:
        cpp, exe = Path(d) / "clock.cpp", Path(d) / "clock"
        cpp.write_text(source)
        subprocess.run(["c++", "-std=c++11", str(cpp), "-o", str(exe)], check=True)
        lines = subprocess.check_output([str(exe)], text=True).splitlines()
    assert len(lines) == 24 * 60 + 2

    glyphs = json.loads((ROOT / "tools/letters.json").read_text())["glyphs"]
    face = "".join(glyphs[f"{r},{c}"]["ch"] for r in range(10) for c in range(11))
    hours = "TWAALF EEN TWEE DRIE VIER VIJF ZES ZEVEN ACHT NEGEN TIEN ELF".split()
    minutes = ["", "VIJF OVER", "TIEN OVER", "KWART OVER", "TIEN VOOR HALF", "VIJF VOOR HALF",
               "HALF", "VIJF OVER HALF", "TIEN OVER HALF", "KWART VOOR", "TIEN VOOR", "VIJF VOOR"]
    dots = [int(n) for n in re.search(r"DOTS\[4\] = \{([^}]*)\}", logic).group(1).split(",")]

    most = 0
    for n, line in enumerate(lines[:1440]):
        h, m = divmod(n, 60)
        letters, lit_dots = (part.split() for part in line.split("|"))
        step = m // 5
        want = f"HET IS {minutes[step]} {hours[(h + (step >= 4)) % 12]} {'UUR' if step == 0 else ''}"
        got = "".join(face[int(i)] for i in letters)
        assert got == want.replace(" ", ""), (h, m, got, want)
        assert sorted(map(int, lit_dots)) == sorted(dots[:m % 5]), (h, m, lit_dots)
        most = max(most, len(letters) + len(lit_dots))

    # Walk the strip the way it is wired and compare with the sketch's mapping.
    left = re.search(r"STARTS_LEFT = (\w+)", logic).group(1) == "true"
    top = re.search(r"STARTS_TOP  = (\w+)", logic).group(1) == "true"
    strip = []
    for step, row in enumerate(range(10) if top else reversed(range(10))):
        cols = range(11) if left != bool(step % 2) else reversed(range(11))
        strip += [row * 11 + col for col in cols]
    assert [int(v) for v in lines[1440].split()] == [strip.index(i) for i in range(110)]
    assert sorted(dots) == [110, 111, 112, 113]
    assert lines[1441] == "".join("1" if h < 7 or h >= 23 else "0" for h in range(24))

    print(f"ok: all 1440 minutes read correctly in Dutch, dots count the extra minutes,\n"
          f"    strip order and night hours are right. At most {most} LEDs lit at once.")


if __name__ == "__main__":
    main()

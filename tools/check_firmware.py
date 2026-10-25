#!/usr/bin/env python3
"""Run the clock's actual C++ renderer on the host for every minute of a day.

Requires a C++ compiler (c++). This supplements, rather than replaces, an
Arduino build and testing on the ESP32.
"""
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    sketch = (ROOT / 'firmware/qlock/qlock.ino').read_text()
    glyphs = json.loads((ROOT / 'reference/letters.json').read_text())['glyphs']
    grid = ''.join(glyphs[f'{r},{c}']['ch'] for r in range(10) for c in range(11))
    constants = sketch[sketch.index('#define DATA_PIN'):sketch.index('// ------------------------------------------------------------------- setup')]
    functions = sketch[sketch.index('uint8_t pixel(uint8_t idx) {'):sketch.index('// Slow amber pulse')]
    source = '''#include <cstdint>
#include <ctime>
#include <iostream>
struct CRGB {int r,g,b; CRGB(int r=0,int g=0,int b=0):r(r),g(g),b(b){} };
''' + constants + '''
struct FL {void clear(){for(auto &p:leds)p=CRGB();}} FastLED;
''' + functions + '''
int main() {
  for(int h=0;h<24;h++) for(int m=0;m<60;m++) {
    render(h,m);
    std::cout<<h<<":"<<m<<" ";
    for(int i=0;i<110;i++) if(leds[pixel(i)].r) std::cout<<i<<",";
    std::cout<<"\\n";
  }
  for(int i=0;i<110;i++) std::cout<<int(pixel(i))<<",";
  std::cout<<"\\n";
  for(int h=0;h<24;h++) std::cout<<isNight(h);
  std::cout<<"\\n";
}
'''
    with tempfile.TemporaryDirectory(prefix='qlock-render-') as d:
        cpp, exe = Path(d) / 'test.cpp', Path(d) / 'test'
        cpp.write_text(source)
        subprocess.run(['c++', '-std=c++11', str(cpp), '-o', str(exe)], check=True)
        lines = subprocess.check_output([str(exe)], text=True).splitlines()

    hours = ['TWAALF', 'EEN', 'TWEE', 'DRIE', 'VIER', 'VIJF', 'ZES', 'ZEVEN',
             'ACHT', 'NEGEN', 'TIEN', 'ELF']
    minutes = ['', 'VIJF OVER', 'TIEN OVER', 'KWART OVER', 'TIEN VOOR HALF',
               'VIJF VOOR HALF', 'HALF', 'VIJF OVER HALF', 'TIEN OVER HALF',
               'KWART VOOR', 'TIEN VOOR', 'VIJF VOOR']
    assert len(lines) == 1442
    maximum = 0
    for line in lines[:1440]:
        hm, values = line.split()
        h, m = map(int, hm.split(':'))
        indices = list(map(int, values.rstrip(',').split(',')))
        slot = m // 5
        expected = ('HET IS ' + minutes[slot] + ' ' + hours[(h + (slot >= 4)) % 12]
                    + (' UUR' if slot == 0 else '')).replace(' ', '')
        actual = ''.join(grid[i] for i in indices)
        assert actual == expected, (hm, actual, expected)
        maximum = max(maximum, len(indices))
    actual_mapping = list(map(int, lines[1440].rstrip(',').split(',')))
    # Walk the physical strip independently, then invert physical->reading order.
    starts_top = 'SERPENTINE_STARTS_TOP  = true' in constants
    starts_left = 'SERPENTINE_STARTS_LEFT = true' in constants
    physical = []
    for step, row in enumerate(range(10) if starts_top else reversed(range(10))):
        forward = starts_left != bool(step % 2)
        physical.extend(row * 11 + col for col in (range(11) if forward else reversed(range(11))))
    assert actual_mapping == [physical.index(i) for i in range(110)]
    assert lines[1441] == ''.join('1' if h < 7 or h >= 23 else '0' for h in range(24))
    assert maximum == 23
    print('PASS: all 1440 minutes; Dutch phrases; physical LED mapping; night schedule; maximum 23 lit.')


if __name__ == '__main__':
    main()

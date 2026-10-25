/* Dutch time → lit letters. A straight port of render() in
 * firmware/qlock/qlock.ino, so the site lights exactly what the clock will.
 * Indices are reading order: 0 = top-left H, 109 = bottom-right R. */
const CLOCK = (() => {
  const W = (at, len, word) => ({ at, len, word });
  const HET = W(0, 3, 'HET'), IS = W(4, 2, 'IS');
  const M_VIJF = W(7, 4, 'VIJF'), M_TIEN = W(11, 4, 'TIEN');
  const VOOR_U = W(18, 4, 'VOOR'), OVER_U = W(22, 4, 'OVER');
  const KWART = W(28, 5, 'KWART'), HALF = W(33, 4, 'HALF');
  const OVER_K = W(40, 4, 'OVER'), VOOR_H = W(44, 4, 'VOOR');
  const UUR = W(107, 3, 'UUR');
  const HOURS = [null, W(51, 3, 'EEN'), W(55, 4, 'TWEE'), W(62, 4, 'DRIE'), W(66, 4, 'VIER'),
    W(70, 4, 'VIJF'), W(74, 3, 'ZES'), W(77, 5, 'ZEVEN'), W(88, 4, 'ACHT'), W(83, 5, 'NEGEN'),
    W(92, 4, 'TIEN'), W(96, 3, 'ELF'), W(99, 6, 'TWAALF')];

  function words(hour24, minute) {
    const out = [HET, IS];
    const m = Math.floor(minute / 5) * 5;
    let h = hour24, half = false;
    switch (m) {
      case 5: out.push(M_VIJF, OVER_U); break;
      case 10: out.push(M_TIEN, OVER_U); break;
      case 15: out.push(KWART, OVER_K); break;
      case 20: out.push(M_TIEN, VOOR_U); half = true; break;
      case 25: out.push(M_VIJF, VOOR_U); half = true; break;
      case 30: half = true; break;
      case 35: out.push(M_VIJF, OVER_U); half = true; break;
      case 40: out.push(M_TIEN, OVER_U); half = true; break;
      case 45: out.push(KWART, VOOR_H); h++; break;
      case 50: out.push(M_TIEN, VOOR_U); h++; break;
      case 55: out.push(M_VIJF, VOOR_U); h++; break;
    }
    if (half) { out.push(HALF); h++; }
    out.push(HOURS[((h + 11) % 12) + 1]);
    if (m === 0) out.push(UUR);
    return out;
  }

  /** {lit: Set<index>, phrase: 'HET IS VIJF OVER HALF DRIE'} */
  function at(hour24, minute) {
    const ws = words(hour24, minute);
    const lit = new Set();
    for (const w of ws) for (let i = 0; i < w.len; i++) lit.add(w.at + i);
    const phrase = [...ws].sort((a, b) => a.at - b.at).map(w => w.word).join(' ');
    return { lit, phrase };
  }

  /** Physical LED number for a reading-order index (default serpentine flags). */
  const led = idx => {
    const row = Math.floor(idx / 11), col = idx % 11;
    return row * 11 + (row % 2 === 0 ? col : 10 - col);
  };

  const isNight = hour => hour >= 23 || hour < 7;

  return { at, led, isNight };
})();

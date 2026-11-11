// 오리지널 픽셀 캐릭터 7종 (14 x 18 그리드). 각 글자 = 팔레트 색, '.' = 투명.
const LEGS = [
  "..PPPPPPPPPP..",
  "..PPPP..PPPP..",
  "..PPPP..PPPP..",
  "..FFFF..FFFF..",
];
const FACE_STD = [
  "..HSSSSSSSSH..",
  "..SSESSSSESS..",
  "..SCSSSSSSCS..",
  "...SSSMMSSS...",
];
const SKIN = { S: "#F4C9A8", E: "#2B2118", C: "#F2A0A0", M: "#C9625A", F: "#2A2A2E" };

const CHARACTERS = {
  ceo: {
    name: "대표",
    grid: [
      "....HHHHHH....",
      "...HHHHHHHH...",
      "..HHHHHHHHHH..",
      "..HHSSSSSSHH..",
      ...FACE_STD,
      "....BBBBBB....",
      "..BBBBBBBBBB..",
      ".BBBBBBBBBBBB.",
      ".BBBBBBBBBBBB.",
      ".SBBBBBBBBBBS.",
      "..BBBBBBBBBB..",
      ...LEGS,
    ],
    pal: { ...SKIN, H: "#1E1E22", B: "#26262B", P: "#4A4A52" },
  },
  investor: {
    name: "투자 매니저",
    grid: [
      "....HHHHHH....",
      "...HHHHHHHHH..",
      "..HHHHHHHHHH..",
      "..HSSSHHHHHH..",
      ...FACE_STD,
      "....BWAAWB....",
      "..BBBWAAWBBB..",
      ".BBBBWAAWBBBB.",
      ".BBBBBAABBBBB.",
      ".SBBBBBBBBBBS.",
      "..BBBBBBBBBB..",
      ...LEGS,
    ],
    pal: { ...SKIN, H: "#6B3F24", B: "#2B3A67", W: "#FFFFFF", A: "#E0B43C", P: "#22304F" },
  },
  scientist: {
    name: "연구소장",
    grid: [
      "..H.HHHH.H....",
      "..HHHHHHHHHH..",
      ".HHHHHHHHHHHH.",
      ".HHSSSSSSSSHH.",
      "..SSSSSSSSSS..",
      "..GGGGSSGGGG..",
      "..GLEGSSGELG..",
      "...SSSMMSSS...",
      "....WBBBBW....",
      "..WWWBBBBWWW..",
      ".WWWWBBBBWWWW.",
      ".WWWWBBBBWWWW.",
      ".SWWWBBBBWWWS.",
      "..WWWWWWWWWW..",
      ...LEGS,
    ],
    pal: { ...SKIN, H: "#A7A7AF", G: "#1E1E22", L: "#CFE6F7", W: "#DCE4EE", B: "#4F7FD1", P: "#3C3F47" },
  },
  innovator: {
    name: "혁신 심사위원",
    grid: [
      ".....RRRR.....",
      "...RRRRRRRR...",
      "..RRRRRRRRRR..",
      "..HHSSSSSSHH..",
      ...FACE_STD,
      "..DDBBBBBBDD..",
      "..BBBABBABBB..",
      ".BBBBABBABBBB.",
      ".BBBBBBBBBBBB.",
      ".SBBBDDDDBBBS.",
      "..BBBBBBBBBB..",
      ...LEGS,
    ],
    pal: { ...SKIN, R: "#D9443A", H: "#2B2118", B: "#2E9E6A", D: "#1F7650", A: "#FFFFFF", P: "#2F3542" },
  },
  founder: {
    name: "예비 창업자",
    grid: [
      ".....RRRR.....",
      "...RRRRRRRR...",
      "..RRRRRRRRRR..",
      "..DDDDDDDDDD..",
      ...FACE_STD,
      "....BBBBBB....",
      "..BABBBBBBAB..",
      ".BBABBBBBBABB.",
      ".BBABBBBBBABB.",
      ".SBBBBBBBBBBS.",
      "..BBBBBBBBBB..",
      ...LEGS,
    ],
    pal: { ...SKIN, R: "#62CDB8", D: "#3EA591", H: "#5A3A22", B: "#F4C542", A: "#3B3B44", P: "#4B6CB7" },
  },
  tax: {
    name: "세무 담당",
    grid: [
      ".....HHHH.....",
      ".....HHHH.....",
      "...HHHHHHHH...",
      "..HHSSSSSSHH..",
      ...FACE_STD,
      ".....SSSS.....",
      "..BBBWWWWBBB..",
      ".BBBBWWWWBBBB.",
      ".BBBBBWWBBBBB.",
      ".SBBBBBBBBBKKK",
      "..BBBBBBBBBKYK",
      ...LEGS,
    ],
    pal: { ...SKIN, H: "#3B2618", W: "#FFFFFF", B: "#C9A574", K: "#5C5F66", Y: "#B8E986", P: "#5B4636" },
  },
  admin: {
    name: "행정 담당",
    grid: [
      "....HHHHHH....",
      "...HHHHHHHH...",
      "..HHHHHHHHHH..",
      "..HHSSSSSSHH..",
      "..HSSSSSSSSH..",
      "..HSESSSSESH..",
      "..HCSSSSSSCH..",
      "..HSSSMMSSSH..",
      "..HH.SSSS.HH..",
      "..HBBWWWWBBH..",
      ".BBLLLLWWBBBB.",
      ".BBLWWLWWBBBB.",
      ".SBLWWLBBBBBS.",
      "..BLLLLBBBBB..",
      ...LEGS,
    ],
    pal: { ...SKIN, H: "#8E3B26", B: "#E57EA6", W: "#FFFFFF", L: "#9B6B43", P: "#3E3A4A" },
  },
};

// 캐릭터 → SVG 문자열. blink=true면 눈을 피부색으로 덮음.
function charSVG(key, px = 10, blink = false) {
  const c = CHARACTERS[key];
  const rects = [];
  c.grid.forEach((row, y) => {
    if (row.length !== 14) throw new Error(`${key} row ${y} width ${row.length}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      let col = c.pal[ch];
      if (blink && ch === "E") col = c.pal.S;
      if (!col) throw new Error(`${key} missing color ${ch}`);
      rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col}"/>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18" width="${14 * px}" height="${18 * px}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

if (typeof module !== "undefined") module.exports = { CHARACTERS, charSVG };

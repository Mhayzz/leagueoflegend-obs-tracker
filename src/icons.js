const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

const TIERS = [
  "iron", "bronze", "silver", "gold", "platinum",
  "emerald", "diamond", "master", "grandmaster", "challenger",
];

const ICON_SOURCES = (tier) => [
  `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-mini-crests/${tier}.png`,
  `https://ddragon.leagueoflegends.com/cdn/img/ranked-mini-crests/${tier}.png`,
  `https://opgg-static.akamaized.net/images/medals_new/${tier}.png`,
];

const TIER_STYLES = {
  iron:        { bg: ["#3a3a3a", "#6b6b6b"], border: "#8a8a8a", letter: "I" },
  bronze:      { bg: ["#6b3a1f", "#a0522d"], border: "#cd7f32", letter: "B" },
  silver:      { bg: ["#5a6475", "#8c9bb5"], border: "#b0bec5", letter: "S" },
  gold:        { bg: ["#7a5c10", "#c89b3c"], border: "#ffd700", letter: "G" },
  platinum:    { bg: ["#1a5f5c", "#3cbdb8"], border: "#4dd0e1", letter: "P" },
  emerald:     { bg: ["#1a5c35", "#2e8b57"], border: "#50c878", letter: "E" },
  diamond:     { bg: ["#1a3f6b", "#3a7ab5"], border: "#7ec8e3", letter: "D" },
  master:      { bg: ["#4a1a7a", "#7b2d8b"], border: "#c084fc", letter: "M" },
  grandmaster: { bg: ["#7a1a1a", "#b71c1c"], border: "#ff5252", letter: "GM" },
  challenger:  { bg: ["#0d3366", "#1565c0"], border: "#82b1ff", letter: "C" },
  unranked:    { bg: ["#1a1a2e", "#2d2d4a"], border: "#444466", letter: "?" },
};

function buildSVG(tier) {
  const s = TIER_STYLES[tier] || TIER_STYLES.unranked;
  const fontSize = s.letter.length > 1 ? 26 : 34;
  const textY = s.letter.length > 1 ? 49 : 51;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${s.bg[0]}"/>
      <stop offset="100%" stop-color="${s.bg[1]}"/>
    </linearGradient>
    <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/></filter>
  </defs>
  <polygon points="40,4 76,22 76,58 40,76 4,58 4,22"
    fill="url(#g)" stroke="${s.border}" stroke-width="2.5" filter="url(#sh)"/>
  <polygon points="40,12 68,27 68,53 40,68 12,53 12,27"
    fill="none" stroke="${s.border}" stroke-width="1" opacity="0.35"/>
  <text x="40" y="${textY}" text-anchor="middle"
    fill="white" font-size="${fontSize}" font-weight="700" font-family="Arial,sans-serif"
    filter="url(#sh)">${s.letter}</text>
</svg>`;
}

async function downloadAll() {
  try {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  } catch (_) {}

  for (const tier of TIERS) {
    const dest = path.join(ICONS_DIR, `${tier}.png`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) continue;

    for (const url of ICON_SOURCES(tier)) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          },
        });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) continue;
        fs.writeFileSync(dest, buf);
        console.log(`Icon downloaded: ${tier} (${buf.length} bytes) from ${url}`);
        break;
      } catch (_) {
        continue;
      }
    }
  }
}

module.exports = { TIERS, TIER_STYLES, buildSVG, downloadAll };

const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Config fichier ──────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, "data", "config.json");

const DEFAULT_DISPLAY = {
  bg_opacity:       0.75,
  accent_color:     "#C89B3C",
  show_session_lp:  true,
  show_last_match:  true,
  show_streak:      true,
  widget_width:     300,
  refresh_rank:     30,
};

function loadFileConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch(e) {}
  return {};
}

function saveFileConfig(cfg) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    return true;
  } catch(e) { console.error("saveFileConfig:", e.message); return false; }
}

let fileConfig = loadFileConfig();

function getCfg() {
  return {
    riot_name:   fileConfig.riot_name   || process.env.RIOT_NAME   || "",
    riot_tag:    fileConfig.riot_tag    || process.env.RIOT_TAG    || "",
    riot_region: fileConfig.riot_region || process.env.RIOT_REGION || "euw1",
    riot_server: fileConfig.riot_server || process.env.RIOT_SERVER || "europe",
    riot_api_key: fileConfig.riot_api_key || process.env.RIOT_API_KEY || "",
    display: { ...DEFAULT_DISPLAY, ...(fileConfig.display || {}) },
  };
}

const SETUP_PASSWORD = process.env.SETUP_PASSWORD || "";

// ── Caches ──────────────────────────────────────────────────
let rankCache  = { data: null, ts: 0 };
let matchCache = { data: null, ts: 0, size: 0 };
let puuidCache = { data: null, ts: 0, name: "", tag: "" };

function invalidateCaches() {
  rankCache  = { data: null, ts: 0 };
  matchCache = { data: null, ts: 0, size: 0 };
  puuidCache = { data: null, ts: 0, name: "", tag: "" };
}

// ── Riot API helpers ─────────────────────────────────────────
const REGION_ROUTES = {
  "br1":   "americas",
  "eun1":  "europe",
  "euw1":  "europe",
  "jp1":   "asia",
  "kr":    "asia",
  "la1":   "americas",
  "la2":   "americas",
  "me1":   "europe",
  "na1":   "americas",
  "oc1":   "sea",
  "ph2":   "sea",
  "ru":    "europe",
  "sg2":   "sea",
  "th2":   "sea",
  "tr1":   "europe",
  "tw2":   "sea",
  "vn2":   "sea",
};

async function getPUUID(name, tag, server, apiKey) {
  const now = Date.now();
  if (puuidCache.data && puuidCache.name === name && puuidCache.tag === tag && now - puuidCache.ts < 3600000) {
    return puuidCache.data;
  }
  const routingRegion = REGION_ROUTES[server] || "europe";
  const url = `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const r = await fetch(url, { headers: { "X-Riot-Token": apiKey } });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.status?.message || `HTTP ${r.status}`);
  }
  const j = await r.json();
  puuidCache = { data: j.puuid, ts: now, name, tag };
  return j.puuid;
}

async function getSummonerByPUUID(puuid, server, apiKey) {
  const url = `https://${server}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const r = await fetch(url, { headers: { "X-Riot-Token": apiKey } });
  if (!r.ok) throw new Error(`Summoner HTTP ${r.status}`);
  return r.json();
}

// ── Config API ──────────────────────────────────────────────
app.get("/api/config", (req, res) => {
  const cfg = getCfg();
  res.json({
    riot_name:         cfg.riot_name,
    riot_tag:          cfg.riot_tag,
    riot_region:       cfg.riot_region,
    riot_server:       cfg.riot_server,
    has_api_key:       !!cfg.riot_api_key,
    display:           cfg.display,
    password_required: !!SETUP_PASSWORD,
  });
});

app.post("/api/config", (req, res) => {
  if (SETUP_PASSWORD && req.body.password !== SETUP_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  const { riot_name, riot_tag, riot_region, riot_server, riot_api_key, display } = req.body;
  const newCfg = {
    ...fileConfig,
    ...(riot_name    !== undefined && { riot_name }),
    ...(riot_tag     !== undefined && { riot_tag }),
    ...(riot_region  !== undefined && { riot_region }),
    ...(riot_server  !== undefined && { riot_server }),
    ...(riot_api_key !== undefined && riot_api_key !== "" && { riot_api_key }),
    ...(display      !== undefined && { display: { ...DEFAULT_DISPLAY, ...display } }),
  };
  if (!saveFileConfig(newCfg)) return res.status(500).json({ error: "Erreur de sauvegarde" });
  fileConfig = newCfg;
  invalidateCaches();
  res.json({ ok: true });
});

// ── Rank ─────────────────────────────────────────────────────
app.get("/api/rank", async (req, res) => {
  const { riot_name: name, riot_tag: tag, riot_region: region, riot_server: server, riot_api_key: apiKey } = getCfg();
  if (!name || !tag) return res.status(400).json({ error: "Configure ton compte sur /setup.html" });
  if (!apiKey) return res.status(400).json({ error: "Clé API Riot manquante — configure sur /setup.html" });

  const now = Date.now();
  if (rankCache.data && now - rankCache.ts < 30000) return res.json(rankCache.data);

  try {
    const puuid = await getPUUID(name, tag, server, apiKey);
    const summoner = await getSummonerByPUUID(puuid, server, apiKey);
    const summonerId = summoner.id;

    const rankUrl = `https://${server}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    const r = await fetch(rankUrl, { headers: { "X-Riot-Token": apiKey } });
    if (!r.ok) return res.status(r.status).json({ error: `Erreur API rank: ${r.status}` });

    const entries = await r.json();
    const solo = entries.find(e => e.queueType === "RANKED_SOLO_5x5") ||
                 entries.find(e => e.queueType === "RANKED_FLEX_SR") ||
                 null;

    if (!solo) {
      const result = {
        rank: "Unranked", tier: "UNRANKED", division: "", lp: 0,
        wins: 0, losses: 0,
        rank_icon: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-iron.png",
        player: `${name}#${tag}`,
      };
      rankCache = { data: result, ts: now };
      return res.json(result);
    }

    const tierName = (solo.tier || "").toLowerCase();
    const iconUrl  = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-${tierName || "iron"}.png`;

    const result = {
      rank:      `${solo.tier} ${solo.rank}`,
      tier:      solo.tier,
      division:  solo.rank,
      lp:        solo.leaguePoints,
      wins:      solo.wins,
      losses:    solo.losses,
      hot_streak: solo.hotStreak || false,
      veteran:   solo.veteran || false,
      rank_icon: iconUrl,
      player:    `${name}#${tag}`,
      summoner_icon_id: summoner.profileIconId,
    };
    rankCache = { data: result, ts: now };
    res.json(result);
  } catch(e) {
    console.error("rank error:", e.message);
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ── Matches ──────────────────────────────────────────────────
app.get("/api/matches", async (req, res) => {
  const { riot_name: name, riot_tag: tag, riot_region: region, riot_server: server, riot_api_key: apiKey } = getCfg();
  if (!name || !tag) return res.status(400).json({ error: "Config manquante" });
  if (!apiKey) return res.status(400).json({ error: "Clé API Riot manquante" });

  const size = Math.min(10, Math.max(1, parseInt(req.query.size) || 5));
  const now  = Date.now();
  if (matchCache.data && matchCache.size >= size && now - matchCache.ts < 60000) {
    return res.json(matchCache.data.slice(0, size));
  }

  try {
    const puuid = await getPUUID(name, tag, server, apiKey);
    const routingRegion = REGION_ROUTES[server] || "europe";

    // Ranked solo games
    const matchListUrl = `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=${size}`;
    const r = await fetch(matchListUrl, { headers: { "X-Riot-Token": apiKey } });
    if (!r.ok) return res.status(r.status).json({ error: `Erreur match list: ${r.status}` });

    const matchIds = await r.json();
    if (!matchIds.length) {
      matchCache = { data: [], size, ts: now };
      return res.json([]);
    }

    const matchDetails = await Promise.all(
      matchIds.map(async (id) => {
        try {
          const mr = await fetch(
            `https://${routingRegion}.api.riotgames.com/lol/match/v5/matches/${id}`,
            { headers: { "X-Riot-Token": apiKey } }
          );
          if (!mr.ok) return null;
          return mr.json();
        } catch(e) { return null; }
      })
    );

    const matches = matchDetails.filter(Boolean).map(match => {
      const participant = match.info?.participants?.find(p => p.puuid === puuid);
      if (!participant) return null;

      const champName = participant.championName || "Unknown";
      const champId   = participant.championId;
      const champIcon = `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champName}.png`;

      return {
        champion:    champName,
        champ_icon:  champIcon,
        kills:       participant.kills   ?? 0,
        deaths:      participant.deaths  ?? 0,
        assists:     participant.assists ?? 0,
        won:         participant.win     ?? null,
        map:         match.info?.gameMode || "CLASSIC",
        lp_change:   null, // Not available from match API directly
        cs:          (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
        vision_score: participant.visionScore || 0,
        game_duration: match.info?.gameDuration || 0,
      };
    }).filter(Boolean);

    matchCache = { data: matches, size, ts: now };
    res.json(matches);
  } catch(e) {
    console.error("matches error:", e.message);
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ── Champion rotation (bonus) ────────────────────────────────
app.get("/api/debug", async (req, res) => {
  const { riot_name: name, riot_tag: tag, riot_server: server, riot_api_key: apiKey } = getCfg();
  if (!name || !tag) return res.json({ error: "Pas de compte configuré" });
  if (!apiKey) return res.json({ error: "Pas de clé API" });
  const results = {};
  try {
    const puuid = await getPUUID(name, tag, server, apiKey);
    results.puuid = puuid ? "OK" : "Introuvable";
    const summoner = await getSummonerByPUUID(puuid, server, apiKey);
    results.summoner = summoner?.id ? "OK" : "Erreur";
    const rankUrl = `https://${server}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`;
    const r = await fetch(rankUrl, { headers: { "X-Riot-Token": apiKey } });
    const entries = await r.json();
    results.entries = entries.map(e => e.queueType);
  } catch(e) {
    results.error = e.message;
  }
  res.json({ player: `${name}#${tag}`, server, ...results });
});

app.get("/health", (_, res) => res.send("ok"));
app.listen(PORT, "0.0.0.0", () => console.log(`LoL OBS Tracker running on port ${PORT}`));

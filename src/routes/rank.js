const { Router } = require("express");
const config = require("../config");
const { cache } = require("../cache");
const { getPUUID } = require("../riot-api");
const { TIERS } = require("../icons");

const fetch = require("node-fetch");
const router = Router();

const VALID_TIERS = TIERS; // ["iron","bronze",..."challenger"]

router.get("/api/rank", async (_req, res) => {
  const cfg = config.get();
  const { riot_name: name, riot_tag: tag, riot_server: server, riot_api_key: apiKey } = cfg;

  if (!name || !tag) {
    return res.status(400).json({ error: "Configure ton compte sur /setup.html" });
  }
  if (!apiKey) {
    return res.status(400).json({ error: "Cle API Riot manquante — configure sur /setup.html" });
  }

  const now = Date.now();
  if (cache.rank.data && now - cache.rank.ts < 60000) {
    return res.json(cache.rank.data);
  }

  try {
    const puuid = await getPUUID(name, tag, server, apiKey);

    const rankUrl = `https://${server}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    const r = await fetch(rankUrl, { headers: { "X-Riot-Token": apiKey } });
    if (!r.ok) {
      return res.status(r.status).json({ error: `Erreur API rank: ${r.status}` });
    }

    const entries = await r.json();
    const solo =
      entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ||
      entries.find((e) => e.queueType === "RANKED_FLEX_SR") ||
      null;

    if (!solo) {
      const result = {
        rank: "Unranked",
        tier: "UNRANKED",
        division: "",
        lp: 0,
        wins: 0,
        losses: 0,
        rank_icon: "/icons/iron.png",
        player: `${name}#${tag}`,
      };
      Object.assign(cache.rank, { data: result, ts: now });
      return res.json(result);
    }

    const tierName = (solo.tier || "").toLowerCase();
    const safeTier = VALID_TIERS.includes(tierName) ? tierName : "iron";
    const iconUrl = `/icons/${safeTier}.png`;

    // Track LP changes between refreshes
    const currentLP = solo.leaguePoints;
    if (cache.lp.value !== null && currentLP !== cache.lp.value) {
      cache.lp.lastChange = currentLP - cache.lp.value;
    }
    cache.lp.value = currentLP;

    const result = {
      rank: `${solo.tier} ${solo.rank}`,
      tier: solo.tier,
      division: solo.rank,
      lp: currentLP,
      lp_change: cache.lp.lastChange,
      wins: solo.wins,
      losses: solo.losses,
      hot_streak: solo.hotStreak || false,
      veteran: solo.veteran || false,
      rank_icon: iconUrl,
      player: `${name}#${tag}`,
    };

    Object.assign(cache.rank, { data: result, ts: now });
    res.json(result);
  } catch (e) {
    console.error("rank error:", e.message);
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

module.exports = router;

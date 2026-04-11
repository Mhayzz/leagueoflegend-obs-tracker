const { Router } = require("express");
const fetch = require("node-fetch");
const config = require("../config");
const { cache } = require("../cache");
const { getPUUID, getRoutingRegion } = require("../riot-api");

const router = Router();

const DDRAGON_CHAMPION_URL =
  "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion";

router.get("/api/matches", async (req, res) => {
  const cfg = config.get();
  const { riot_name: name, riot_tag: tag, riot_server: server, riot_api_key: apiKey } = cfg;

  if (!name || !tag) return res.status(400).json({ error: "Config manquante" });
  if (!apiKey) return res.status(400).json({ error: "Cle API Riot manquante" });

  const size = Math.min(10, Math.max(1, parseInt(req.query.size) || 5));
  const now = Date.now();

  if (cache.match.data && cache.match.size >= size && now - cache.match.ts < 60000) {
    return res.json(cache.match.data.slice(0, size));
  }

  try {
    const puuid = await getPUUID(name, tag, server, apiKey);
    const region = getRoutingRegion(server);

    const listUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${size}`;
    const r = await fetch(listUrl, { headers: { "X-Riot-Token": apiKey } });
    if (!r.ok) {
      return res.status(r.status).json({ error: `Erreur match list: ${r.status}` });
    }

    const matchIds = await r.json();
    if (!matchIds.length) {
      Object.assign(cache.match, { data: [], size, ts: now });
      return res.json([]);
    }

    const details = await Promise.all(
      matchIds.map(async (id) => {
        try {
          const mr = await fetch(
            `https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`,
            { headers: { "X-Riot-Token": apiKey } }
          );
          if (!mr.ok) return null;
          return mr.json();
        } catch (_) {
          return null;
        }
      })
    );

    const matches = details
      .filter(Boolean)
      .map((match) => {
        const p = match.info?.participants?.find((x) => x.puuid === puuid);
        if (!p) return null;

        const champName = p.championName || "Unknown";
        return {
          champion: champName,
          champ_icon: `${DDRAGON_CHAMPION_URL}/${champName}.png`,
          kills: p.kills ?? 0,
          deaths: p.deaths ?? 0,
          assists: p.assists ?? 0,
          won: p.win ?? null,
          map: match.info?.gameMode || "CLASSIC",
          lp_change: null,
          cs: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
          vision_score: p.visionScore || 0,
          game_duration: match.info?.gameDuration || 0,
        };
      })
      .filter(Boolean);

    Object.assign(cache.match, { data: matches, size, ts: now });
    res.json(matches);
  } catch (e) {
    console.error("matches error:", e.message);
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

module.exports = router;

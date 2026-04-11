const fetch = require("node-fetch");
const { cache } = require("./cache");

const REGION_ROUTES = {
  br1: "americas",
  eun1: "europe",
  euw1: "europe",
  jp1: "asia",
  kr: "asia",
  la1: "americas",
  la2: "americas",
  me1: "europe",
  na1: "americas",
  oc1: "sea",
  ph2: "sea",
  ru: "europe",
  sg2: "sea",
  th2: "sea",
  tr1: "europe",
  tw2: "sea",
  vn2: "sea",
};

function getRoutingRegion(server) {
  return REGION_ROUTES[server] || "europe";
}

async function getPUUID(name, tag, server, apiKey) {
  const now = Date.now();
  const c = cache.puuid;
  if (c.data && c.name === name && c.tag === tag && now - c.ts < 3600000) {
    return c.data;
  }

  const region = getRoutingRegion(server);
  const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const res = await fetch(url, { headers: { "X-Riot-Token": apiKey } });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.status?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  Object.assign(cache.puuid, { data: data.puuid, ts: now, name, tag });
  return data.puuid;
}

module.exports = { REGION_ROUTES, getRoutingRegion, getPUUID };

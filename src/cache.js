// Shared mutable state — always access via `cache.rank`, `cache.match`, etc.
// Never reassign the top-level properties; mutate the nested objects instead.
const cache = {
  rank: { data: null, ts: 0 },
  match: { data: null, ts: 0, size: 0 },
  puuid: { data: null, ts: 0, name: "", tag: "" },
  lp: { value: null, lastChange: null },
};

function invalidateAll() {
  Object.assign(cache.rank, { data: null, ts: 0 });
  Object.assign(cache.match, { data: null, ts: 0, size: 0 });
  Object.assign(cache.puuid, { data: null, ts: 0, name: "", tag: "" });
  Object.assign(cache.lp, { value: null, lastChange: null });
}

module.exports = { cache, invalidateAll };

const { Router } = require("express");
const config = require("../config");
const { invalidateAll } = require("../cache");

const router = Router();

router.get("/api/config", (_req, res) => {
  const cfg = config.get();
  res.json({
    riot_name: cfg.riot_name,
    riot_tag: cfg.riot_tag,
    riot_region: cfg.riot_region,
    riot_server: cfg.riot_server,
    has_api_key: !!cfg.riot_api_key,
    display: cfg.display,
    password_required: !!config.SETUP_PASSWORD,
  });
});

router.post("/api/config", (req, res) => {
  if (config.SETUP_PASSWORD && req.body.password !== config.SETUP_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  if (!config.update(req.body)) {
    return res.status(500).json({ error: "Erreur de sauvegarde" });
  }

  invalidateAll();
  res.json({ ok: true });
});

module.exports = router;

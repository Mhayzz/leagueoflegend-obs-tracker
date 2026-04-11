const { Router } = require("express");
const { buildSVG, TIER_STYLES } = require("../icons");

const router = Router();

router.get("/api/rank-icon/:tier", (req, res) => {
  const tier = req.params.tier.toLowerCase();
  if (!TIER_STYLES[tier] && tier !== "unranked") {
    return res.status(404).send("Unknown tier");
  }

  res.set("Content-Type", "image/svg+xml");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(buildSVG(tier));
});

module.exports = router;

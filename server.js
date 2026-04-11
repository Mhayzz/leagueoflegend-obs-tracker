const express = require("express");
const path = require("path");
const { downloadAll } = require("./src/icons");

const configRoutes = require("./src/routes/config");
const rankRoutes = require("./src/routes/rank");
const matchesRoutes = require("./src/routes/matches");
const iconsRoutes = require("./src/routes/icons");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(configRoutes);
app.use(rankRoutes);
app.use(matchesRoutes);
app.use(iconsRoutes);

app.get("/health", (_req, res) => res.send("ok"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LoL OBS Tracker running on port ${PORT}`);
  downloadAll().catch((e) => console.error("downloadIcons:", e.message));
});

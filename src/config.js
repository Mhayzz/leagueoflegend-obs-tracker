const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");

const DEFAULT_DISPLAY = {
  bg_opacity: 0.75,
  accent_color: "#C89B3C",
  show_session_lp: true,
  show_last_match: true,
  show_streak: true,
  widget_width: 300,
  refresh_rank: 300,
};

const SETUP_PASSWORD = process.env.SETUP_PASSWORD || "";

let fileConfig = loadFileConfig();

function loadFileConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch (_) {}
  return {};
}

function saveFileConfig(cfg) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    return true;
  } catch (e) {
    console.error("saveFileConfig:", e.message);
    return false;
  }
}

function get() {
  return {
    riot_name: fileConfig.riot_name || process.env.RIOT_NAME || "",
    riot_tag: fileConfig.riot_tag || process.env.RIOT_TAG || "",
    riot_region: fileConfig.riot_region || process.env.RIOT_REGION || "euw1",
    riot_server: fileConfig.riot_server || process.env.RIOT_SERVER || "europe",
    riot_api_key: fileConfig.riot_api_key || process.env.RIOT_API_KEY || "",
    display: { ...DEFAULT_DISPLAY, ...(fileConfig.display || {}) },
  };
}

function update(body) {
  const { riot_name, riot_tag, riot_region, riot_server, riot_api_key, display } = body;
  const newCfg = {
    ...fileConfig,
    ...(riot_name !== undefined && { riot_name }),
    ...(riot_tag !== undefined && { riot_tag }),
    ...(riot_region !== undefined && { riot_region }),
    ...(riot_server !== undefined && { riot_server }),
    ...(riot_api_key !== undefined && riot_api_key !== "" && { riot_api_key }),
    ...(display !== undefined && { display: { ...DEFAULT_DISPLAY, ...display } }),
  };
  if (!saveFileConfig(newCfg)) return false;
  fileConfig = newCfg;
  return true;
}

module.exports = { get, update, DEFAULT_DISPLAY, SETUP_PASSWORD };

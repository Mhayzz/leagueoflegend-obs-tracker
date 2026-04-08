# LoL OBS Tracker

Overlay League of Legends pour OBS, déployé sur Railway.

## Déploiement Railway

### 1. Créer un nouveau projet Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Sélectionner ce repository

### 2. Variables d'environnement

Dans Railway → **Variables**, ajouter :

| Variable | Description | Exemple |
|---|---|---|
| `RIOT_API_KEY` | Clé API Riot Games | `RGAPI-xxxx-xxxx-...` |
| `SETUP_PASSWORD` | (Optionnel) Protège la page /setup.html | `monmotdepasse` |

> La clé API s'obtient sur [developer.riotgames.com](https://developer.riotgames.com)

### 3. Configuration du compte

Une fois déployé, ouvrir `https://ton-app.railway.app/setup.html` pour configurer :
- Pseudo + tag Riot (ex: `Hero#MABE`)
- Serveur (EUW, NA, KR…)
- Apparence (couleur, opacité, largeur)

### 4. OBS — Browser Source

- **URL** : `https://ton-app.railway.app/`
- **Largeur** : valeur affichée dans le setup (ex: 300)
- **Hauteur** : valeur affichée dans le setup (ex: 177)
- Cocher **"Refresh browser when scene becomes active"**

---

## Pages disponibles

| URL | Description |
|---|---|
| `/` | Overlay OBS |
| `/setup.html` | Configuration |
| `/health` | Health check Railway |

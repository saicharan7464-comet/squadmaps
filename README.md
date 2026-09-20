# SquadNav — Real-Time Group & Normal Navigation

SquadNav is a production-quality group navigation web application built for convoy travel and everyday navigation. It allows squad members traveling together to follow the **same canonical squad path** to a common destination, while displaying each other's live locations, speeds, ETAs, and **exact distances from each other across all devices**.

---

## 🚀 Features

- **Shared Canonical Squad Path**: The entire squad follows the exact same designated route chosen by the host to stay together.
- **Inter-Member Distances on All Devices**: Real-time calculation showing how far each squad member is from you (e.g. *Rahul is 2.4 km ahead of you*).
- **Live Location Watching & Radar**: Pulsing radar pins with live speeds, heading chevrons, and a one-click **"Locate Member"** button to pan/zoom directly to any squad member.
- **Turn-by-Turn Navigation HUD**: Maneuver banner, distance to next turn, speedometer (0 km/h stationary), remaining distance/ETA, off-route recalculation, and voice guidance.
- **Falling-Behind Alert System**: Smart non-spamming alerts when a member falls behind by configurable distance/time thresholds.
- **Arrival Detection**: Geofence detection with arrival celebration banners and convoy progress summaries.
- **"Let's Meet Here" (Regroup)**: Propose meeting points with real-time squad voting (Accept / Reject).
- **Place Discovery Together**: Suggest rest stops, fuel stations, and restaurants along the route with interactive squad voting.
- **Squad Radio**: Canned one-tap driving chips (*"Wait for me"*, *"I am stopping"*, *"Fuel stop"*, *"Food stop"*, *"Reached"*) and text chat.
- **Privacy & Offline Handling**: Pause GPS toggle and automatic heartbeat detection flagging disconnected members with their last known location and timestamp.
- **Convoy Simulator Mode (Demo Mode)**: Built-in simulation toggle to test multi-car highway convoys on desktop without physical driving.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS with modern Dark Cockpit navigation design tokens and glassmorphism
- **Map & Routing**: Leaflet / CartoDB Dark Matter / Google Maps Platform, OSRM routing engine
- **Places & Geocoding**: OpenStreetMap Nominatim
- **Real-Time Backend**: Firebase Firestore + Auth (with built-in multi-client LocalSync fallback for instant testing)
- **Audio & Speech**: Web Audio API synthesized chimes & Web Speech API voice guidance

---

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Google Maps and/or Firebase credentials if available (optional: SquadNav operates out of the box with built-in sync).

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.

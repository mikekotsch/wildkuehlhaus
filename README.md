# 🦌 Wildkühlhaus – Hegegemeinschaft Emsdetten

Eine einfache Web-App zur Verwaltung des Wildkühlhauses. Jäger können Wild einlagern und den Füllstand prüfen. Wenn das Kühlhaus voll ist, wird der Zoo automatisch per E-Mail benachrichtigt.

## Funktionen

- **Füllstandsanzeige** — große, gut lesbare Prozentanzeige
- **Einlagerung in 2 Schritten** — Name eingeben, Wildgröße auswählen, fertig
- **Zoo-Benachrichtigung** — vorausgefüllte E-Mail beim Vollwerden
- **Einlagerungsprotokoll** — wer hat wann was eingelagert
- **Zurücksetzen** — nach Zoo-Abholung mit einem Klick leeren

## Wildgrößen

| Größe  | Tierarten              | Kapazität |
|--------|------------------------|-----------|
| Klein  | Hase · Ente · Fasan    | ~5 %      |
| Mittel | Reh · Fuchs            | ~15 %     |
| Groß   | Hirsch · Wildschwein   | ~30 %     |

## Setup

### Voraussetzungen

- [Node.js](https://nodejs.org/) (v18 oder neuer)
- [Vite](https://vitejs.dev/) + React

### Installation

```bash
npm create vite@latest wildkuehlhaus -- --template react
cd wildkuehlhaus
npm install
```

Die Datei `src/App.jsx` mit dem Inhalt aus `freezer-app.jsx` ersetzen.

### Starten

```bash
npm run dev
```

App läuft dann unter `http://localhost:5173`

### Deployen (z. B. auf Netlify oder Vercel)

```bash
npm run build
# den "dist"-Ordner hochladen oder per CLI deployen
```

## Konfiguration

In `freezer-app.jsx` (Zeile 5) die Zoo-E-Mail-Adresse eintragen:

```js
const ZOO_EMAIL = "zoo@example.com"; // ← hier eintragen
```

## Lizenz

MIT

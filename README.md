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
| Klein  | Hase · Ente · Fasan    | ~11 %     |
| Mittel | Reh · Fuchs            | ~33 %     |
| Groß   | Hirsch · Wildschwein   | ~67 %     |

Die Kapazität ist an der realen Belegung ausgerichtet: anderthalb große,
drei mittlere oder rund neun kleine Tiere füllen das Kühlhaus.

## Archivierung nach Abholung

Wenn der Zoo das Kühlhaus leert, werden die aktiven Einträge nicht gelöscht.
Sie erhalten in Supabase einen Zeitstempel in `abgeholt_am` und verschwinden
dadurch aus Füllstand und Einlagerungsprotokoll. Die Daten bleiben für eine
spätere Auswertung in der Datenbank erhalten.

Vor dem Deployen dieser Version muss
`supabase/migrations/20260825000000_archive_collected_entries.sql` im
Supabase SQL Editor ausgeführt werden. Die Migration ergänzt die benötigte
Spalte und die Berechtigung zum Archivieren.

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

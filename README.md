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
Sie erhalten in Neon einen Zeitstempel in `abgeholt_am` und verschwinden dadurch
aus Füllstand und Einlagerungsprotokoll. Die Daten bleiben im Archiv erhalten.

## Vercel-Setup

Die App verwendet eine Vercel Function und Neon Postgres. Die aktivierte Neon
Integration stellt `DATABASE_URL` in Vercel bereit; die API erstellt die
benötigten Tabellen beim ersten Aufruf. `VITE_WRITE_TOKEN` und `VITE_ZOO_EMAIL`
bleiben unverändert. Der Schreib-Link bleibt
`https://<deployed-url>?token=<VITE_WRITE_TOKEN>`.

### Umzug bestehender Einträge

Beim ersten Aufruf importiert die API vorhandene Einträge und das Archiv aus dem
bisherigen Vercel Blob. Dafür `BLOB_READ_WRITE_TOKEN` bis zum erfolgreichen
ersten Aufruf gesetzt lassen. Falls kein Blob-Bestand gefunden wird, kann die API
stattdessen alte Supabase-Einträge übernehmen; dafür `VITE_SUPABASE_URL` und
`VITE_SUPABASE_ANON_KEY` während des Imports setzen. Ein fehlgeschlagener Import
wird als Verbindungsfehler angezeigt und nicht als leerer Bestand behandelt.
Nach erfolgreichem Import den Datenbestand in Neon überprüfen und anschließend
die nicht mehr benötigten Blob- und Supabase-Variablen entfernen.

Für den lokalen Aufruf der Vercel Functions `vercel dev` (Vercel CLI) verwenden
und `DATABASE_URL` in `.env.local` setzen. Für die optionale Datenübernahme aus
Blob zusätzlich `BLOB_READ_WRITE_TOKEN` setzen. `npm run dev` startet nur den
Vite-Frontend-Server. `npm run build` erstellt den Produktions-Build.

## Lizenz

MIT

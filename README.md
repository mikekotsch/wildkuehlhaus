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
Sie erhalten in Blob einen Zeitstempel in `abgeholt_am` und verschwinden dadurch
aus Füllstand und Einlagerungsprotokoll. Die Daten bleiben im Archiv erhalten.

## Vercel-Setup

Die App verwendet Vercel Functions und einen privaten Vercel-Blob-Store für
Einträge und Archiv. In Vercel einen Blob-Store mit dem Projekt verbinden; dadurch
steht der Function `BLOB_READ_WRITE_TOKEN` zur Verfügung. Zusätzlich die
Umgebungsvariablen `VITE_WRITE_TOKEN` und `VITE_ZOO_EMAIL` setzen und deployen.
Der Schreib-Link bleibt `https://<deployed-url>?token=<VITE_WRITE_TOKEN>`.

### Umzug bestehender Einträge

Beim ersten Aufruf nach dem Deployment importiert die API alle bisherigen
Supabase-Einträge einschließlich des Archivs in Blob. Für diesen ersten Aufruf
müssen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` noch in Vercel gesetzt
sein und das alte Supabase-Projekt erreichbar sein. Die App zeigt bei einem
fehlgeschlagenen Import einen Verbindungsfehler; die Daten werden dann nicht als
leerer Bestand angezeigt. Nach einem erfolgreichen Aufruf sind die Daten in Blob
und die beiden Supabase-Variablen können aus Vercel entfernt werden. Das
Supabase-Projekt erst löschen, nachdem der Import überprüft wurde.

Für den lokalen Aufruf der Vercel Functions `vercel dev` (Vercel CLI) verwenden
und `BLOB_READ_WRITE_TOKEN` in `.env.local` setzen. `npm run dev` startet nur
den Vite-Frontend-Server. `npm run build` erstellt den Produktions-Build.

## Lizenz

MIT

import { useState, useEffect, useRef } from "react";

const MAX_UNITS   = 100;
const STORAGE_KEY = "kuehlhaus_v2";
const ZOO_EMAIL   = "zoo@example.com"; // ← hier eintragen

const WILD = [
  { label: "Klein",  sub: "Hase · Ente · Fasan", value: "K", units: 5,  icon: "🐇" },
  { label: "Mittel", sub: "Reh · Fuchs",          value: "M", units: 15, icon: "🦌" },
  { label: "Groß",   sub: "Hirsch · Wildschwein", value: "G", units: 30, icon: "🐗" },
];

const leer = { einlagerungen: [], einheiten: 0 };

function laden() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : leer; }
  catch { return leer; }
}

function datum(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

const F = {
  bg:      "#f2ede0",
  paper:   "#faf7ef",
  gruen:   "#1e4a1e",
  gruenMi: "#2f6b2f",
  gruenHe: "#4a8c4a",
  rand:    "#b8a878",
  randHe:  "#d8c898",
  text:    "#141a14",
  textMi:  "#3a4a3a",
  textHe:  "#6a7a5a",
  amber:   "#a05800",
  rot:     "#8a1a08",
  rotBg:   "#fdecea",
};

export default function App() {
  const [state, setState]           = useState(laden);
  const [schritt, setSchritt]       = useState("start");
  const [name, setName]             = useState("");
  const [geradVoll, setGeradVoll]   = useState(false);
  const [zeigeReset, setZeigeReset] = useState(false);
  const vorherVoll = useRef(state.einheiten >= MAX_UNITS);

  const pct      = Math.min(100, Math.round((state.einheiten / MAX_UNITS) * 100));
  const istVoll  = pct >= 100;
  const balkenF  = pct < 60 ? F.gruenMi : pct < 85 ? F.amber : F.rot;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const nowVoll = state.einheiten >= MAX_UNITS;
    if (nowVoll && !vorherVoll.current) {
      setGeradVoll(true);
      setTimeout(() => setGeradVoll(false), 8000);
    }
    vorherVoll.current = nowVoll;
  }, [state]);

  function einlagern(groesse) {
    const w = WILD.find(w => w.value === groesse);
    setState(prev => ({
      einlagerungen: [
        { id: Date.now(), name, groesse, einheiten: w.units, icon: w.icon, ts: new Date().toISOString() },
        ...prev.einlagerungen
      ],
      einheiten: Math.min(MAX_UNITS, prev.einheiten + w.units),
    }));
    setSchritt("bestaetigt");
    setName("");
    setTimeout(() => setSchritt("start"), 3000);
  }

  const zooMail = `mailto:${ZOO_EMAIL}?subject=K%C3%BChlhaus+voll+%E2%80%93+Abholung&body=Das+Wildkühlhaus+ist+voll.%0A%0AEinlagerungen%3A%0A${state.einlagerungen.map(e => `- ${e.name}: ${e.icon} (${e.groesse}) ${datum(e.ts)}`).join("%0A")}`;

  return (
    <div style={{ minHeight: "100vh", background: F.bg, fontFamily: "'Georgia', serif", color: F.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      {/* ── VOLLMELDUNG ─────────────────────────────── */}
      {geradVoll && (
        <div onClick={() => setGeradVoll(false)} style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(20,8,4,0.80)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            background: F.rotBg, border: `4px solid ${F.rot}`,
            borderRadius: 14, padding: "44px 40px", textAlign: "center",
            maxWidth: 380, width: "100%",
          }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🚨</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 40, fontWeight: 900, color: F.rot, lineHeight: 1.1,
            }}>Kühlhaus<br />ist voll!</div>
            <div style={{ fontSize: 18, color: F.textMi, marginTop: 14, lineHeight: 1.5 }}>
              Bitte den Zoo<br />benachrichtigen.
            </div>
            <a href={zooMail} style={{
              display: "block", marginTop: 28,
              background: F.rot, color: "#fff",
              padding: "16px 0", borderRadius: 8,
              textDecoration: "none", fontWeight: 700, fontSize: 18,
              fontFamily: "'Playfair Display', serif",
            }}>Zoo jetzt benachrichtigen →</a>
            <div style={{ marginTop: 14, fontSize: 14, color: F.textHe }}>
              (Tippen zum Schließen)
            </div>
          </div>
        </div>
      )}

      {/* ── KOPF ────────────────────────────────────── */}
      <header style={{
        background: F.gruen, color: "#f0ead8",
        padding: "22px 24px 18px",
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, fontWeight: 900, letterSpacing: 0.5,
          }}>🦌 Wildkühlhaus</div>
          <div style={{ fontSize: 15, opacity: 0.75, marginTop: 4 }}>
            Hegegemeinschaft Emsdetten
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 540, margin: "0 auto", padding: "0 16px 64px" }}>

        {/* ── FÜLLSTAND ───────────────────────────────── */}
        <div style={{
          marginTop: 24,
          background: F.paper, border: `2px solid ${F.rand}`,
          borderRadius: 12, padding: "28px 24px",
        }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, color: F.textHe, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              Aktueller Füllstand
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 96, fontWeight: 900, lineHeight: 1,
              color: balkenF,
            }}>
              {pct}<span style={{ fontSize: 42, color: F.textHe }}>%</span>
            </div>

            <div style={{
              display: "inline-block", marginTop: 10,
              padding: "8px 28px", borderRadius: 999,
              background: istVoll ? F.rot : pct > 0 ? F.gruenMi : F.randHe,
              color: istVoll || pct > 0 ? "#fff" : F.textMi,
              fontSize: 18, fontWeight: 700, letterSpacing: 1,
            }}>
              {istVoll ? "VOLL" : pct > 0 ? "BELEGT" : "LEER"}
            </div>
          </div>

          {/* Balken */}
          <div style={{ height: 22, background: F.randHe, borderRadius: 11, overflow: "hidden", border: `1px solid ${F.rand}` }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 11,
              background: balkenF,
              transition: "width 1.2s cubic-bezier(0.4,0,0.2,1), background 0.8s",
            }} />
          </div>

          {/* Wild-Zähler */}
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
            {WILD.map(w => {
              const n = state.einlagerungen.filter(e => e.groesse === w.value).length;
              return (
                <div key={w.value} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28 }}>{w.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontSize: 13, color: F.textHe }}>{w.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ZOO-HINWEIS ─────────────────────────────── */}
        {istVoll && (
          <div style={{
            marginTop: 16,
            background: F.rotBg, border: `2px solid ${F.rot}`,
            borderRadius: 10, padding: "18px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: F.rot, lineHeight: 1.4 }}>
              Kühlhaus voll –<br />Abholung nötig
            </div>
            <a href={zooMail} style={{
              flexShrink: 0, background: F.rot, color: "#fff",
              padding: "13px 18px", borderRadius: 8,
              textDecoration: "none", fontSize: 15, fontWeight: 700,
              fontFamily: "'Playfair Display', serif", textAlign: "center", lineHeight: 1.3,
            }}>Zoo<br />benachrichtigen →</a>
          </div>
        )}

        {/* ── EINLAGERN: SCHRITT START ─────────────────── */}
        <div style={{ marginTop: 20 }}>
          {schritt === "start" && (
            <button
              onClick={() => !istVoll && setSchritt("name")}
              style={{
                width: "100%", padding: "22px",
                background: istVoll ? F.randHe : F.gruen,
                border: "none", borderRadius: 10,
                color: istVoll ? F.textHe : "#f0ead8",
                fontSize: 22, fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                cursor: istVoll ? "not-allowed" : "pointer",
              }}>
              {istVoll ? "✗  Einlagerung nicht möglich" : "+ Wild einlagern"}
            </button>
          )}

          {/* SCHRITT: NAME ─────────────────────────────── */}
          {schritt === "name" && (
            <div style={{
              background: F.paper, border: `2px solid ${F.rand}`,
              borderRadius: 12, padding: "24px",
            }}>
              <div style={{ fontSize: 14, color: F.textHe, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
                Schritt 1 von 2 – Ihr Name
              </div>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && name.trim() && setSchritt("groesse")}
                placeholder="Name eingeben …"
                style={{
                  width: "100%", padding: "16px",
                  background: "#fff", border: `2px solid ${name.trim() ? F.gruen : F.rand}`,
                  borderRadius: 8, color: F.text,
                  fontFamily: "'Georgia', serif", fontSize: 20,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => name.trim() && setSchritt("groesse")}
                  disabled={!name.trim()}
                  style={{
                    flex: 1, padding: "16px",
                    background: name.trim() ? F.gruen : F.randHe,
                    border: "none", borderRadius: 8,
                    color: name.trim() ? "#f0ead8" : F.textHe,
                    fontSize: 18, fontWeight: 700,
                    fontFamily: "'Playfair Display', serif",
                    cursor: name.trim() ? "pointer" : "not-allowed",
                  }}>Weiter →</button>
                <button
                  onClick={() => { setSchritt("start"); setName(""); }}
                  style={{
                    padding: "16px 20px", background: "none",
                    border: `2px solid ${F.rand}`, borderRadius: 8,
                    color: F.textHe, fontSize: 18, cursor: "pointer",
                  }}>✕</button>
              </div>
            </div>
          )}

          {/* SCHRITT: GRÖSSE ───────────────────────────── */}
          {schritt === "groesse" && (
            <div style={{
              background: F.paper, border: `2px solid ${F.rand}`,
              borderRadius: 12, padding: "24px",
            }}>
              <div style={{ fontSize: 14, color: F.textHe, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                Schritt 2 von 2 – Wildgröße
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: F.gruen, marginBottom: 16 }}>
                Hallo, {name}!
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {WILD.map(w => (
                  <button key={w.value} onClick={() => einlagern(w.value)} style={{
                    padding: "18px 20px",
                    background: "#fff", border: `2px solid ${F.rand}`,
                    borderRadius: 10,
                    display: "flex", alignItems: "center", gap: 16,
                    cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = F.gruen; e.currentTarget.style.background = "#f0f5ee"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = F.rand; e.currentTarget.style.background = "#fff"; }}
                  >
                    <span style={{ fontSize: 36 }}>{w.icon}</span>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: F.text }}>{w.label}</div>
                      <div style={{ fontSize: 15, color: F.textHe, marginTop: 2 }}>{w.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSchritt("name")}
                style={{
                  marginTop: 12, width: "100%", padding: "13px",
                  background: "none", border: `2px solid ${F.rand}`,
                  borderRadius: 8, color: F.textHe,
                  fontSize: 16, cursor: "pointer",
                }}>← Zurück</button>
            </div>
          )}

          {/* SCHRITT: BESTÄTIGT ────────────────────────── */}
          {schritt === "bestaetigt" && (
            <div style={{
              background: "#eef5ee", border: `2px solid ${F.gruenMi}`,
              borderRadius: 12, padding: "28px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✓</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24, fontWeight: 700, color: F.gruen,
              }}>Eingelagert!</div>
              <div style={{ fontSize: 16, color: F.textMi, marginTop: 8 }}>
                Danke. Das Wild wurde vermerkt.
              </div>
            </div>
          )}
        </div>

        {/* ── PROTOKOLL ───────────────────────────────── */}
        {state.einlagerungen.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 13, color: F.textHe, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
              Einlagerungsprotokoll
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {state.einlagerungen.map((e, i) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center",
                  padding: "14px 18px",
                  background: F.paper, border: `1px solid ${F.randHe}`,
                  borderRadius: 8, gap: 14,
                  opacity: Math.max(0.5, 1 - i * 0.08),
                }}>
                  <span style={{ fontSize: 26 }}>{e.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{e.name}</div>
                    <div style={{ fontSize: 14, color: F.textHe, marginTop: 2 }}>
                      {WILD.find(w => w.value === e.groesse)?.sub}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 14, color: F.textHe }}>
                    <div style={{ fontWeight: 700, color: balkenF }}>+{e.einheiten} %</div>
                    <div style={{ marginTop: 3 }}>{datum(e.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESET ───────────────────────────────────── */}
        <div style={{ marginTop: 44, paddingTop: 20, borderTop: `2px solid ${F.randHe}` }}>
          {!zeigeReset ? (
            <button onClick={() => setZeigeReset(true)} style={{
              background: "none", border: "none",
              color: F.textHe, fontFamily: "'Georgia', serif",
              fontSize: 15, cursor: "pointer",
            }}>⟳ Zoo hat abgeholt – Kühlhaus leeren</button>
          ) : (
            <div style={{
              background: F.paper, border: `2px solid ${F.rand}`,
              borderRadius: 10, padding: "20px",
            }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
                Alle Einträge löschen?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setState({ ...leer }); setZeigeReset(false); }} style={{
                  flex: 1, padding: "14px",
                  background: F.gruen, border: "none",
                  borderRadius: 8, color: "#f0ead8",
                  fontSize: 17, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Playfair Display', serif",
                }}>Ja, zurücksetzen</button>
                <button onClick={() => setZeigeReset(false)} style={{
                  flex: 1, padding: "14px",
                  background: "none", border: `2px solid ${F.rand}`,
                  borderRadius: 8, color: F.textHe,
                  fontSize: 17, cursor: "pointer",
                }}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: #a09878; }
        input:focus { border-color: ${F.gruen} !important; box-shadow: 0 0 0 3px ${F.gruen}22; }
      `}</style>
    </div>
  );
}

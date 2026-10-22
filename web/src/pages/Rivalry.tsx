import { useEffect, useState } from "react";
import { usePrefs } from "../prefs.tsx";

type Row = { id: number; name: string; total: number; rank: number };

export function Rivalry({ onOpenManager }: { onOpenManager: (id: number) => void }) {
  const { t } = usePrefs();
  const [rows, setRows] = useState<Row[]>([]);
  const [you, setYou] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/slate")
      .then((response) => response.json())
      .then((body: { rows: Row[]; you: Row | null }) => {
        setRows(body.rows ?? []);
        setYou(body.you?.id ?? null);
      })
      .catch(() => setRows([]));
  }, []);

  const actions = [
    [t.lock, t.lockDetail],
    [t.offer, t.offerDetail],
    [t.exchange, t.exchangeDetail],
    [t.heist, t.heistDetail],
  ] as const;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="kicker">{t.rivalry}</p>
          <h2>{t.slate}</h2>
          <p className="lede">{t.slateLede}</p>
          <hr />
        </div>
      </div>
      <div className="split">
        <section className="card">
          <p className="kicker">{t.yourSlate}</p>
          <table className="standings">
            <thead>
              <tr>
                <th>{t.rank}</th>
                <th>{t.manager}</th>
                <th>{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.id === you ? "you" : ""}>
                  <td>{row.rank}</td>
                  <td>
                    <button type="button" className="name-link" onClick={() => onOpenManager(row.id)}>
                      {row.name}
                    </button>
                    {row.id === you ? ` · ${t.you}` : ""}
                  </td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="card actions">
          <header>
            <h3>{t.actions}</h3>
            <span>
              {t.influence} 2
            </span>
          </header>
          {actions.map(([name, detail]) => (
            <article key={name}>
              <strong>{name}</strong>
              <p>{detail}</p>
            </article>
          ))}
          <p className="rules">{t.slateRules}</p>
        </aside>
      </div>
    </section>
  );
}

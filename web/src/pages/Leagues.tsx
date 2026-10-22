import { useEffect, useState, type FormEvent } from "react";
import { usePrefs } from "../prefs.tsx";

type Member = { id: number; name: string; total: number; rank: number };
type League = { id: number; name: string; code: string; members: Member[] };

export function Leagues({ onOpenManager }: { onOpenManager: (id: number) => void }) {
  const { t } = usePrefs();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    fetch("/api/leagues")
      .then((response) => response.json())
      .then((rows: League[]) => setLeagues(Array.isArray(rows) ? rows : []))
      .catch(() => setLeagues([]));
  }

  useEffect(load, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/leagues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = (await response.json()) as { error?: string; code?: string };
    if (!response.ok) {
      setMessage(body.error ?? "The league was not created.");
      return;
    }
    setName("");
    setMessage(body.code ? `${t.code} ${body.code}` : "");
    load();
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json()) as { error?: string; name?: string };
    if (!response.ok) {
      setMessage(body.error ?? "The league was not joined.");
      return;
    }
    setCode("");
    setMessage(body.name ? `${t.joined} ${body.name}` : t.joined);
    load();
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="kicker">{t.leagues}</p>
          <h2>{t.clubTable}</h2>
          <p className="lede">{t.clubLede}</p>
          <hr />
        </div>
        <div className="league-forms">
          <form className="league-create" onSubmit={(event) => void create(event)}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.leagueName} />
            <button type="submit" className="coral">
              {t.invite}
            </button>
          </form>
          <form className="league-create" onSubmit={(event) => void join(event)}>
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder={t.leagueCode} />
            <button type="submit">{t.join}</button>
          </form>
        </div>
      </div>
      {message && <p className="banner">{message}</p>}
      {leagues.length === 0 && <p className="empty">{t.noLeague}</p>}
      {leagues.map((league) => (
        <section className="card league" key={league.id}>
          <header className="card-head">
            <h3>{league.name}</h3>
            <p>
              {t.code} {league.code}
            </p>
          </header>
          <table className="standings">
            <thead>
              <tr>
                <th>{t.rank}</th>
                <th>{t.manager}</th>
                <th>{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {league.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.rank}</td>
                  <td>
                    <button type="button" className="name-link" onClick={() => onOpenManager(member.id)}>
                      {member.name}
                    </button>
                  </td>
                  <td>{member.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  );
}

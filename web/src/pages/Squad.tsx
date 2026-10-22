import { useState } from "react";
import { Pitch } from "../Pitch.tsx";
import { money, playerMatches, shortPlayerName } from "../format.ts";
import { usePrefs } from "../prefs.tsx";
import type { Eleven } from "../lineup.ts";
import { FORMATIONS, type FormationId, type Person } from "../types.ts";

type Props = {
  formation: FormationId;
  eleven: Eleven;
  players: Person[];
  captainId: number | null;
  viceId: number | null;
  selectedId: number | null;
  note: string;
  onFormation: (formation: FormationId) => void;
  onSelect: (player: Person) => void;
  onBringIn: (player: Person, outgoingId: number | null) => void;
  onCaptain: () => void;
  onVice: () => void;
  onOpen: (player: Person) => void;
  squadValue: number;
  bank: number;
};

export function Squad({
  formation,
  eleven,
  players,
  captainId,
  viceId,
  selectedId,
  note,
  onFormation,
  onSelect,
  onBringIn,
  onCaptain,
  onVice,
  onOpen,
  squadValue,
  bank,
}: Props) {
  const { t } = usePrefs();
  const [query, setQuery] = useState("");
  const found = query.trim()
    ? players.filter((player) => playerMatches(player, query)).slice(0, 12)
    : [];
  const selected = players.find((player) => player.id === selectedId) ?? null;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="kicker">{t.formation}</p>
          <h2>{t.firstTeam}</h2>
          <p className="lede">{t.arrange}</p>
          <hr />
        </div>
      </div>
      <div className="toolbar">
        <div>
          <p className="kicker">{t.formation}</p>
          <div className="formations">
            {FORMATIONS.map((item) => (
              <button key={item} type="button" className={item === formation ? "on" : ""} onClick={() => onFormation(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <dl className="facts">
          <div>
            <dt>{t.value}</dt>
            <dd>{money(squadValue)}</dd>
          </div>
          <div>
            <dt>{t.bank}</dt>
            <dd>{money(bank)}</dd>
          </div>
          <div>
            <dt>{t.perClub}</dt>
            <dd>{t.max3}</dd>
          </div>
        </dl>
      </div>
      <div className="split pitch-split">
        <Pitch
          eleven={eleven}
          captainId={captainId}
          viceId={viceId}
          selectedId={selectedId}
          onSelect={onSelect}
          onOpen={onOpen}
        />
        <aside className="card scout">
          <p className="kicker">{t.recruitment}</p>
          <h3>{t.desk}</h3>
          <p className="hint">{selected ? `${t.out}: ${shortPlayerName(selected.name)}` : t.buildSquad}</p>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          <ul>
            {found.map((player) => (
              <li key={player.id}>
                <button type="button" onClick={() => onBringIn(player, null)}>
                  <span>
                    <strong>{player.name}</strong>
                    <small>
                      {player.club_short} · {player.position} · {money(player.price_tenths)}
                    </small>
                  </span>
                  <em>+</em>
                </button>
                <button type="button" className="view" onClick={() => onOpen(player)}>
                  {t.view}
                </button>
              </li>
            ))}
          </ul>
          <div className="armband-actions">
            <button type="button" onClick={onCaptain} disabled={selectedId === null}>
              {t.captain}
            </button>
            <button type="button" onClick={onVice} disabled={selectedId === null}>
              {t.vice}
            </button>
          </div>
          {note && <p className="note">{note}</p>}
        </aside>
      </div>
    </section>
  );
}

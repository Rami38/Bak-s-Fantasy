import { useMemo, useState } from "react";
import { money, playerMatches, shortPlayerName } from "../format.ts";
import { usePrefs } from "../prefs.tsx";
import type { Person, Position } from "../types.ts";
import { OfferDialog } from "./OfferDialog.tsx";

const POSITIONS: Array<Position | "all"> = ["all", "goalkeeper", "defender", "midfielder", "forward"];

type Props = {
  players: Person[];
  squad: Person[];
  bank: number;
  moves: number;
  half: string;
  note: string;
  onBringIn: (player: Person, outgoingId: number | null) => boolean;
  onOpen: (player: Person) => void;
};

export function Transfers({ players, squad, bank, moves, half, note, onBringIn, onOpen }: Props) {
  const { t } = usePrefs();
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "all">("all");
  const [sort, setSort] = useState<"price" | "name">("price");
  const [offer, setOffer] = useState<Person | null>(null);
  const labels: Record<Position | "all", string> = {
    all: t.all,
    goalkeeper: t.gk,
    defender: t.def,
    midfielder: t.mid,
    forward: t.fwd,
  };
  const squadIds = new Set(squad.map((player) => player.id));
  const clubs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const player of squad) counts.set(player.club_short, (counts.get(player.club_short) ?? 0) + 1);
    return counts;
  }, [squad]);
  const market = players
    .filter((player) => !squadIds.has(player.id))
    .filter((player) => position === "all" || player.position === position)
    .filter((player) => playerMatches(player, query))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.price_tenths ?? 0) - (a.price_tenths ?? 0);
    })
    .slice(0, 40);

  const grouped = (["goalkeeper", "defender", "midfielder", "forward"] as const).map((spot) => ({
    spot,
    players: squad.filter((player) => player.position === spot),
  }));

  return (
    <section className="page transfer-office">
      <div className="page-head">
        <div>
          <p className="kicker">{half}</p>
          <h2>{t.transferTitle}</h2>
          <p className="lede">{t.transferLede}</p>
          <hr />
        </div>
        <p className="moves">
          {t.freeTransfers} <b>{Math.max(0, 1 - moves)}</b>
          <small>{moves <= 1 ? t.thenHit : `${-(moves - 1) * 4}`}</small>
        </p>
      </div>

      <div className="budget">
        <span>{t.squadValue}</span>
        <div>
          <i style={{ width: `${Math.min(100, ((1000 - bank) / 1000) * 100)}%` }} />
        </div>
        <b>{money(bank)}</b>
      </div>

      {note && <p className="banner">{note}</p>}
      <div className="transfer-grid">
        <section className="card book">
          <p className="kicker">{t.yourSquad}</p>
          <h3>{squad.length === 0 ? t.emptySquad : `${squad.length}/15`}</h3>
          {grouped.map((group) => (
            <div key={group.spot}>
              <p className="spot">
                {labels[group.spot]} · {group.players.length}
              </p>
              <ul>
                {group.players.map((player) => (
                  <li key={player.id}>
                    <button type="button" onClick={() => onOpen(player)}>
                      <strong>{shortPlayerName(player.name)}</strong>
                      <small>
                        {player.club_short} · {money(player.price_tenths)}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="card catalogue">
          <p className="kicker">{t.in}</p>
          <h3>{t.theMarket}</h3>
          <div className="filters">
            {POSITIONS.map((spot) => (
              <button key={spot} type="button" className={position === spot ? "on" : ""} onClick={() => setPosition(spot)}>
                {labels[spot]}
              </button>
            ))}
          </div>
          <div className="market-tools">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            <button type="button" onClick={() => setSort(sort === "price" ? "name" : "price")}>
              {sort === "price" ? t.sortPrice : t.sortName}
            </button>
          </div>
          <ul className="market-list">
            {market.map((player) => {
              const held = clubs.get(player.club_short) ?? 0;
              return (
                <li key={player.id}>
                  <button type="button" onClick={() => setOffer(player)}>
                    <span>
                      <strong>{player.name}</strong>
                      <small>
                        {labels[player.position]} · {player.club_short} · {player.age ?? "—"} · #{player.shirt_number ?? "—"} · {held}/3
                      </small>
                    </span>
                    <b>{money(player.price_tenths)}</b>
                  </button>
                  <button type="button" className="view" onClick={() => onOpen(player)}>
                    {t.view}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="cabinet">
        <p className="kicker">{half}</p>
        <h3>{t.cabinet}</h3>
        <div className="chips">
          <article>
            <small>{t.once}</small>
            <strong>Wildcard</strong>
            <p>{t.moveLede}</p>
          </article>
          <article>
            <small>{t.once}</small>
            <strong>Free Hit</strong>
            <p>{t.once}</p>
          </article>
          <article>
            <small>{t.once}</small>
            <strong>Bench Boost</strong>
            <p>{t.bench}</p>
          </article>
          <article>
            <small>{t.once}</small>
            <strong>Triple Captain</strong>
            <p>{t.captain}</p>
          </article>
        </div>
      </section>
      {offer && (
        <OfferDialog
          incoming={offer}
          squad={squad}
          onClose={() => setOffer(null)}
          onConfirm={(outgoingId) => onBringIn(offer, outgoingId)}
        />
      )}
    </section>
  );
}

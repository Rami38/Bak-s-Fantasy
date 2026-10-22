import { useEffect, useState } from "react";
import { money, shortPlayerName } from "../format.ts";
import { SQUAD_CAP } from "../lineup.ts";
import { usePrefs } from "../prefs.tsx";
import type { Person } from "../types.ts";

type Props = {
  incoming: Person;
  squad: Person[];
  onClose: () => void;
  onConfirm: (outgoingId: number | null) => boolean;
};

export function OfferDialog({ incoming, squad, onClose, onConfirm }: Props) {
  const { t } = usePrefs();
  const owned = squad.filter((player) => player.position === incoming.position);
  const room = owned.length < SQUAD_CAP[incoming.position];
  const [outgoingId, setOutgoingId] = useState<number | null>(room ? null : (owned[0]?.id ?? null));
  const outgoing = squad.find((player) => player.id === outgoingId) ?? null;
  const squadValue = squad.reduce((sum, player) => sum + (player.price_tenths ?? 0), 0);
  const sale = outgoing?.price_tenths ?? 0;
  const cost = incoming.price_tenths ?? 0;
  const bankAfter = 1000 - (squadValue - sale + cost);
  const sameClub = squad.filter((player) => player.club_short === incoming.club_short).length;
  const clubAfter = sameClub - (outgoing?.club_short === incoming.club_short ? 1 : 0);
  const labels = { goalkeeper: t.gk, defender: t.def, midfielder: t.mid, forward: t.fwd };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="offer-shade" onClick={onClose}>
      <section
        className="offer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="kicker">{t.theDeal}</p>
        <h2 id="offer-title">{t.offerTitle}</h2>
        <p className="lede">{t.offerLede}</p>
        <div className="offer-people">
          <article>
            <p>{t.arrives}</p>
            <strong>{incoming.name}</strong>
            <small>
              {labels[incoming.position]} · {incoming.club_name} · {money(incoming.price_tenths)}
            </small>
          </article>
          <article>
            <p>{t.leaves}</p>
            <strong>{outgoing ? shortPlayerName(outgoing.name) : t.openPlace}</strong>
            <small>{outgoing ? `${outgoing.club_short} · ${money(outgoing.price_tenths)}` : `${t.placesLeft} ${SQUAD_CAP[incoming.position] - owned.length}`}</small>
          </article>
        </div>
        <fieldset>
          <legend>{t.leaves}</legend>
          {room && (
            <label>
              <input type="radio" name="outgoing" checked={outgoingId === null} onChange={() => setOutgoingId(null)} />
              {t.openPlace}
            </label>
          )}
          {owned.map((player) => (
            <label key={player.id}>
              <input
                type="radio"
                name="outgoing"
                checked={outgoingId === player.id}
                onChange={() => setOutgoingId(player.id)}
              />
              {shortPlayerName(player.name)} · {player.club_short} · {money(player.price_tenths)}
            </label>
          ))}
          {!room && owned.length === 0 && <p className="note">{t.selectFirst}</p>}
        </fieldset>
        <dl className="deal-facts">
          <div>
            <dt>{t.price}</dt>
            <dd>{money(cost)}</dd>
          </div>
          <div>
            <dt>{t.difference}</dt>
            <dd>{money(cost - sale)}</dd>
          </div>
          <div>
            <dt>{t.inBank}</dt>
            <dd>{money(1000 - squadValue)}</dd>
          </div>
          <div>
            <dt>{t.after}</dt>
            <dd>{money(bankAfter)}</dd>
          </div>
        </dl>
        <p className="empty">{t.estimateNote}</p>
        {bankAfter < 0 && <p className="note">{t.tooDear}</p>}
        {clubAfter >= 3 && <p className="note">{t.clubFull}</p>}
        <div className="offer-actions">
          <button type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            type="button"
            className="coral"
            disabled={bankAfter < 0 || clubAfter >= 3 || (!room && !outgoing)}
            onClick={() => {
              if (onConfirm(outgoingId)) onClose();
            }}
          >
            {t.confirmDeal}
          </button>
        </div>
      </section>
    </div>
  );
}

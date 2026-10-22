import { useEffect, useState } from "react";
import { money } from "../format.ts";
import { usePrefs } from "../prefs.tsx";
import type { Person } from "../types.ts";

export function PlayerPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { t } = usePrefs();
  const [player, setPlayer] = useState<Person | null>(null);

  useEffect(() => {
    fetch(`/api/players/${id}`)
      .then((response) => response.json())
      .then((body: Person) => setPlayer(body?.id ? body : null))
      .catch(() => setPlayer(null));
  }, [id]);

  if (!player) return <section className="page"><p className="empty">{t.profile}</p></section>;

  return (
    <section className="page">
      <button type="button" className="text-back" onClick={onBack}>
        {t.back}
      </button>
      <div className="profile">
        <div className="portrait" aria-hidden="true">
          {player.name.slice(0, 1)}
        </div>
        <div>
          <p className="kicker">{t.profile}</p>
          <h2>{player.name}</h2>
          <p className="lede">
            {player.club_name} · {player.position}
          </p>
          <hr />
          <dl className="facts profile-facts">
            <div>
              <dt>{t.age}</dt>
              <dd>{player.age ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.country}</dt>
              <dd>{player.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.number}</dt>
              <dd>{player.shirt_number ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.price}</dt>
              <dd>{money(player.price_tenths)}</dd>
            </div>
          </dl>
          <p className="empty">{t.countryMissing}</p>
          <p className="empty">{t.statsMissing}</p>
        </div>
      </div>
    </section>
  );
}

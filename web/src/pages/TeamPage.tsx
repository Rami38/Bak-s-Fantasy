import { useEffect, useState } from "react";
import { money, shortPlayerName } from "../format.ts";
import { startingEleven } from "../lineup.ts";
import { Pitch } from "../Pitch.tsx";
import { usePrefs } from "../prefs.tsx";
import { FORMATIONS, type FormationId, type Person } from "../types.ts";

type View = {
  manager: { id: number; name: string };
  isYou: boolean;
  formation: string;
  captainId: number | null;
  viceId: number | null;
  players: Person[];
};

function formationOf(value: string): FormationId {
  return (FORMATIONS as readonly string[]).includes(value) ? (value as FormationId) : "4-3-3";
}

export function TeamPage({ id, onBack }: { id: number; onBack: () => void }) {
  const { t } = usePrefs();
  const [view, setView] = useState<View | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let ignore = false;
    setView(null);
    setMissing(false);
    fetch(`/api/managers/${id}/squad`)
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("The squad is not available.");
        return response.json() as Promise<View>;
      })
      .then((body) => {
        if (ignore) return;
        if (!body) {
          setMissing(true);
          return;
        }
        setView(body);
      })
      .catch(() => {
        if (!ignore) setMissing(true);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  const formation = formationOf(view?.formation ?? "4-3-3");
  const players = view?.players ?? [];
  const eleven = startingEleven(players, formation);
  const captain = players.find((player) => player.id === view?.captainId) ?? null;
  const vice = players.find((player) => player.id === view?.viceId) ?? null;
  const squadValue = players.reduce((sum, player) => sum + (player.price_tenths ?? 0), 0);

  return (
    <section className="page">
      <button type="button" className="text-back" onClick={onBack}>
        {t.closeTeam}
      </button>
      <div className="page-head">
        <div>
          <p className="kicker">{t.squad}</p>
          <h2>
            {view?.manager.name ?? t.manager}
            {view?.isYou ? ` · ${t.you}` : ""}
          </h2>
          <p className="lede">{t.theirLede}</p>
          <hr />
        </div>
      </div>
      {missing && <p className="empty">{t.noManager}</p>}
      {view && (
        <>
          <div className="toolbar">
            <div>
              <p className="kicker">{t.formation}</p>
              <p className="formation-read">{formation}</p>
            </div>
            <dl className="facts">
              <div>
                <dt>{t.value}</dt>
                <dd>{money(squadValue)}</dd>
              </div>
              <div>
                <dt>{t.captain}</dt>
                <dd>{captain ? shortPlayerName(captain.name) : "—"}</dd>
              </div>
              <div>
                <dt>{t.vice}</dt>
                <dd>{vice ? shortPlayerName(vice.name) : "—"}</dd>
              </div>
            </dl>
          </div>
          {players.length === 0 ? (
            <p className="empty">{t.emptyTheirs}</p>
          ) : (
            <>
              <p className="kicker">{t.starting}</p>
              <Pitch eleven={eleven} captainId={view.captainId} viceId={view.viceId} readOnly showPrice />
            </>
          )}
        </>
      )}
    </section>
  );
}

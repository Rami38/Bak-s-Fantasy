import { kickoffParts } from "../format.ts";
import { usePrefs } from "../prefs.tsx";
import type { Fixture } from "../types.ts";

export function MatchPage({ fixture, onBack }: { fixture: Fixture | null; onBack: () => void }) {
  const { t, timeZone } = usePrefs();
  if (!fixture) return <section className="page"><p className="empty">{t.match}</p></section>;
  const when = kickoffParts(fixture.kickoff, timeZone);
  const scored = fixture.home_goals != null && fixture.away_goals != null;

  return (
    <section className="page">
      <button type="button" className="text-back" onClick={onBack}>
        {t.back}
      </button>
      <p className="kicker">
        {t.gameweek} {fixture.matchday}
      </p>
      <h2>{t.match}</h2>
      <hr />
      <div className="scoreboard">
        <div>
          <strong>{fixture.home_name}</strong>
          <small>{fixture.home_short}</small>
        </div>
        <b>{scored ? `${fixture.home_goals}–${fixture.away_goals}` : "–"}</b>
        <div>
          <strong>{fixture.away_name}</strong>
          <small>{fixture.away_short}</small>
        </div>
      </div>
      <p className="lede">
        {when.day} {when.time} · {timeZone}
      </p>
      {!scored && <p className="empty">{t.scoreMissing}</p>}
      <p className="empty">{t.lineupsMissing}</p>
    </section>
  );
}

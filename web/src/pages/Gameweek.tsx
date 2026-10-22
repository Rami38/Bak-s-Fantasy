import { deadlineText, kickoffParts, money, shortPlayerName } from "../format.ts";
import { usePrefs } from "../prefs.tsx";
import type { Person, Fixture } from "../types.ts";

type Props = {
  matchday: number;
  fixtures: Fixture[];
  captain: Person | null;
  vice: Person | null;
  totalPoints: number;
  squadValue: number;
  bank: number;
  onMatchday: (matchday: number) => void;
  onOpen: (fixture: Fixture) => void;
};

export function Gameweek({ matchday, fixtures, captain, vice, totalPoints, squadValue, bank, onMatchday, onOpen }: Props) {
  const { t, timeZone } = usePrefs();
  const kickoff = fixtures[0] ? new Date(fixtures[0].kickoff) : null;
  const deadline = kickoff ? deadlineText(kickoff, timeZone) : null;
  const half = matchday <= 17 ? t.firstHalf : t.secondHalf;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="kicker">2026/27 · Matchday {matchday}</p>
          <h2>{t.ledger}</h2>
          <p className="lede">{t.ledgerLede}</p>
          <hr />
        </div>
        {deadline && (
          <aside className="deadline">
            <p>{t.lineupLocks}</p>
            <strong>{deadline.when}</strong>
            <small>
              {timeZone} · {t.rivalryLocks} {deadline.rivalry}
            </small>
          </aside>
        )}
      </div>

      <div className="stats">
        <article className="stat lead">
          <p>{t.totalPoints}</p>
          <b>{totalPoints}</b>
          <small>{half}</small>
        </article>
        <article className="stat">
          <p>{t.gwPoints}</p>
          <b>—</b>
          <small>{half}</small>
        </article>
        <article className="stat">
          <p>{t.squadValue}</p>
          <b>{money(squadValue)}</b>
          <small>{t.pricesSample}</small>
        </article>
        <article className="stat">
          <p>{t.inBank}</p>
          <b>{money(bank)}</b>
          <small>€100.0m</small>
        </article>
        <article className="stat">
          <p>{t.freeTransfers}</p>
          <b>1</b>
          <small>{t.thenHit}</small>
        </article>
      </div>

      <div className="split">
        <section className="card">
          <header className="card-head">
            <div>
              <p className="kicker">{t.programme}</p>
              <h3>
                {t.gameweek} {matchday}
              </h3>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => onMatchday(matchday - 1)} disabled={matchday <= 1}>
                {t.previous}
              </button>
              <button type="button" onClick={() => onMatchday(matchday + 1)} disabled={matchday >= 34}>
                {t.next}
              </button>
            </div>
          </header>
          <ul className="fixtures">
            {fixtures.map((fixture) => {
              const when = kickoffParts(fixture.kickoff, timeZone);
              const score =
                fixture.home_goals != null && fixture.away_goals != null ? `${fixture.home_goals}–${fixture.away_goals}` : "";
              return (
                <li key={fixture.id}>
                  <button type="button" onClick={() => onOpen(fixture)}>
                    <time>
                      {when.day} {when.time}
                    </time>
                    <span>
                      {fixture.home_name} <em>v</em> {fixture.away_name} {score}
                    </span>
                    <small className={fixture.status}>{word(fixture.status, t)}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="rail">
          <section className="card">
            <p className="kicker">{t.armband}</p>
            <Armband player={captain} role={t.captain} mark="C" />
            <Armband player={vice} role={t.vice} mark="V" />
          </section>
          <section className="card influence">
            <p className="kicker">{t.influence}</p>
            <b>2</b>
            <small>{t.influenceNote}</small>
          </section>
        </div>
      </div>
    </section>
  );
}

function word(status: string, t: ReturnType<typeof usePrefs>["t"]) {
  if (status === "finished") return t.played;
  if (status === "live") return t.live;
  if (status === "postponed") return t.postponed;
  if (status === "cancelled") return t.cancelled;
  return t.upcoming;
}

function Armband({ player, role, mark }: { player: Person | null; role: string; mark: string }) {
  return (
    <div className="armband">
      <span>{mark}</span>
      <div>
        <strong>{player ? shortPlayerName(player.name) : "—"}</strong>
        <small>{player ? `${player.club_short} · ${role}` : role}</small>
      </div>
    </div>
  );
}

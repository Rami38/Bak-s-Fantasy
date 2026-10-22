import { useEffect, useMemo, useRef, useState } from "react";
import { LoginPage, SignOutButton, UsernameForm, type Manager } from "./AccountBar.tsx";
import { activeMatchday, firstKickoff, lockLabel } from "./format.ts";
import { onPitch, signPlayer, SQUAD_CAP, startingEleven } from "./lineup.ts";
import { Landing } from "./pages/Landing.tsx";
import { Gameweek } from "./pages/Gameweek.tsx";
import { Leagues } from "./pages/Leagues.tsx";
import { MatchPage } from "./pages/MatchPage.tsx";
import { PlayerPage } from "./pages/PlayerPage.tsx";
import { Rivalry } from "./pages/Rivalry.tsx";
import { Rules } from "./pages/Rules.tsx";
import { Squad } from "./pages/Squad.tsx";
import { TeamPage } from "./pages/TeamPage.tsx";
import { Transfers } from "./pages/Transfers.tsx";
import { usePrefs } from "./prefs.tsx";
import { FORMATIONS, type Fixture, type FormationId, type Page, type Person } from "./types.ts";

function isFormation(value: unknown): value is FormationId {
  return typeof value === "string" && (FORMATIONS as readonly string[]).includes(value);
}

function teamFromHash(hash: string): number | null {
  if (!hash.startsWith("team-")) return null;
  const id = Number(hash.slice(5));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const NAV: Array<[Page, "gameweek" | "squad" | "transfers" | "rivalry" | "leagues" | "rules"]> = [
  ["gameweek", "gameweek"],
  ["squad", "squad"],
  ["transfers", "transfers"],
  ["rivalry", "rivalry"],
  ["leagues", "leagues"],
  ["rules", "rules"],
];

function pageFromHash(): Page {
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("player-") || hash.startsWith("match-")) return "gameweek";
  return NAV.some(([id]) => id === hash) ? (hash as Page) : "gameweek";
}

export function App() {
  const { t, timeZone, lang, setLang, theme, setTheme } = usePrefs();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [fixtureId, setFixtureId] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  function readHash() {
    const hash = window.location.hash.replace("#", "");
    const teamId = teamFromHash(hash);
    if (teamId) {
      setManagerId(teamId);
      setPlayerId(null);
      setFixtureId(null);
      return;
    }
    setManagerId(null);
    if (hash.startsWith("player-")) {
      setPlayerId(Number(hash.slice(7)));
      setFixtureId(null);
      return;
    }
    if (hash.startsWith("match-")) {
      setFixtureId(Number(hash.slice(6)));
      setPlayerId(null);
      return;
    }
    setPlayerId(null);
    setFixtureId(null);
    setPage(pageFromHash());
  }

  function open(next: Page) {
    setPlayerId(null);
    setFixtureId(null);
    setManagerId(null);
    setPage(next);
    window.location.hash = next;
  }

  function openManager(id: number) {
    setReturnPage(page);
    setPlayerId(null);
    setFixtureId(null);
    setManagerId(id);
    window.location.hash = `team-${id}`;
  }

  function openPlayer(id: number) {
    setPlayerId(id);
    setFixtureId(null);
    window.location.hash = `player-${id}`;
  }

  function openMatch(id: number) {
    setFixtureId(id);
    setPlayerId(null);
    window.location.hash = `match-${id}`;
  }

  useEffect(() => {
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);
  const [players, setPlayers] = useState<Person[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [seasonName, setSeasonName] = useState("2026/27");
  const [matchday, setMatchday] = useState<number | null>(null);
  const [formation, setFormation] = useState<FormationId>("4-3-3");
  const [squad, setSquad] = useState<Person[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceId, setViceId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [manager, setManager] = useState<Manager | null | undefined>(undefined);
  const [gate, setGate] = useState<"home" | "sign-in" | "sign-up">("home");
  const [managerId, setManagerId] = useState<number | null>(() => teamFromHash(window.location.hash.replace("#", "")));
  const [returnPage, setReturnPage] = useState<Page>("leagues");
  const [squadReady, setSquadReady] = useState(false);
  const squadGeneration = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/season")
      .then((response) => response.json())
      .then((season: { name?: string } | null) => {
        if (season?.name) setSeasonName(season.name);
      })
      .catch((reason: Error) => setError(reason.message));
    fetch("/api/fixtures")
      .then(async (response) => {
        if (!response.ok) throw new Error("The season API is not responding.");
        return response.json() as Promise<Fixture[]>;
      })
      .then((rows) => {
        setFixtures(rows);
        setMatchday(activeMatchday(rows, new Date()));
      })
      .catch((reason: Error) => setError(reason.message));
    fetch("/api/me")
      .then((response) => response.json())
      .then((body: Manager | null) => setManager(body))
      .catch((reason: Error) => setError(reason.message));
    fetch("/api/players")
      .then(async (response) => {
        if (!response.ok) throw new Error("The player list is not responding.");
        return response.json() as Promise<Person[]>;
      })
      .then((rows) => setPlayers(rows))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    squadGeneration.current += 1;
    const generation = squadGeneration.current;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSquadReady(false);
    if (!manager) {
      setSquad([]);
      setCaptainId(null);
      setViceId(null);
      setFormation("4-3-3");
      return;
    }
    fetch("/api/squad")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { formation?: string; captainId?: number | null; viceId?: number | null; players?: Person[] } | null) => {
        if (squadGeneration.current !== generation || !body) return;
        setFormation(isFormation(body.formation) ? body.formation : "4-3-3");
        setSquad(Array.isArray(body.players) ? body.players : []);
        setCaptainId(body.captainId ?? null);
        setViceId(body.viceId ?? null);
        setSquadReady(true);
      })
      .catch(() => {
        if (squadGeneration.current === generation) setSquadReady(false);
      });
  }, [manager]);

  useEffect(() => {
    if (!squadReady) return;
    const generation = squadGeneration.current;
    const payload = {
      playerIds: squad.map((player) => player.id),
      formation,
      captainId,
      viceId,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (squadGeneration.current !== generation) return;
      void fetch("/api/squad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (response.ok || response.status === 401 || squadGeneration.current !== generation) return;
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? t.squadSave);
        })
        .catch(() => {
          if (squadGeneration.current === generation) setError(t.squadSave);
        });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [squadReady, squad, formation, captainId, viceId, t.squadSave]);

  useEffect(() => {
    if (!manager) return;
    fetch("/api/summary")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { totalPoints?: number } | null) => {
        if (body?.totalPoints != null) setTotalPoints(body.totalPoints);
      })
      .catch(() => setTotalPoints(0));
  }, [manager]);

  const current = matchday ?? 1;
  const week = useMemo(
    () => fixtures.filter((fixture) => fixture.matchday === current).sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    [fixtures, current],
  );
  const eleven = useMemo(() => startingEleven(squad, formation), [squad, formation]);
  const kickoff = firstKickoff(week);
  const half = current <= 17 ? t.firstHalf : t.secondHalf;
  const squadValue = squad.reduce((sum, player) => sum + (player.price_tenths ?? 0), 0);
  const bank = 1000 - squadValue;

  function chooseFormation(next: FormationId) {
    setFormation(next);
    const nextEleven = startingEleven(squad, next);
    const playing = [nextEleven.goalkeeper, ...nextEleven.defenders, ...nextEleven.midfielders, ...nextEleven.forwards];
    if (!playing.some((player) => player?.id === captainId)) {
      setCaptainId(nextEleven.forwards.find((player) => player)?.id ?? null);
    }
    if (!playing.some((player) => player?.id === viceId)) {
      setViceId(nextEleven.defenders.find((player) => player)?.id ?? null);
    }
  }

  function bringIn(incoming: Person, outgoingId: number | null): boolean {
    if (squad.some((player) => player.id === incoming.id)) {
      setNote(t.alreadyOwned);
      return false;
    }
    const outgoing = outgoingId === null ? null : (squad.find((player) => player.id === outgoingId) ?? null);
    if (outgoingId !== null && !outgoing) return false;
    if (outgoing && outgoing.position !== incoming.position) {
      setNote(t.wrongSpot);
      return false;
    }
    const held = squad.filter((player) => player.position === incoming.position).length;
    if (!outgoing && held >= SQUAD_CAP[incoming.position]) {
      setNote(t.selectFirst);
      return false;
    }
    const nextValue =
      squad.reduce((sum, player) => sum + (player.id === outgoing?.id ? 0 : (player.price_tenths ?? 0)), 0) +
      (incoming.price_tenths ?? 0);
    if (nextValue > 1000) {
      setNote(t.tooDear);
      return false;
    }
    const next = signPlayer(squad, incoming, outgoing?.id ?? null);
    if (!next) {
      setNote(t.clubFull);
      return false;
    }
    if (page === "transfers" && outgoing) setMoves((count) => count + 1);
    setSquad(next);
    setSelectedId(incoming.id);
    setNote("");
    if (!captainId || captainId === outgoing?.id) setCaptainId(incoming.id);
    if (viceId === outgoing?.id) setViceId(null);
    return true;
  }

  const captain = squad.find((player) => player.id === captainId) ?? null;
  const vice = squad.find((player) => player.id === viceId) ?? null;

  if (manager === undefined) return <main className="gate" />;
  if (manager === null) {
    if (gate === "home") return <Landing onEnter={setGate} />;
    return <LoginPage mode={gate} onSignedIn={setManager} onHome={() => setGate("home")} />;
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/logo.jpg" alt="" />
          <div>
            <strong>Bak's Fantasy</strong>
            <span>{t.office}</span>
          </div>
        </div>
        <p className="season">
          {t.season} {seasonName}
        </p>
        <p className="lock">{kickoff ? lockLabel(current, kickoff, timeZone) : "GW"}</p>
        <button type="button" className="coral" onClick={() => open("squad")}>
          {t.setLineup}
        </button>
      </header>
      <div className="shell">
        <nav>
          <div className="nav-links">
            <p>{t.centre}</p>
            {NAV.map(([id, label]) => (
              <button key={id} type="button" className={page === id && managerId === null && playerId === null && fixtureId === null ? "on" : ""} onClick={() => open(id)}>
                {t[label]}
              </button>
            ))}
          </div>
          <div className="nav-foot">
            <p className="nav-name">
              <strong>{manager.username ?? manager.name}</strong>
              {manager.isCommissioner && <small>{t.commissioner}</small>}
            </p>
            {!manager.username && manager.email && <UsernameForm onSaved={setManager} />}
            <div className="prefs">
              <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
                EN
              </button>
              <button type="button" className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>
                FR
              </button>
              <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? t.light : t.dark}
              </button>
            </div>
            <SignOutButton
              onSignedOut={() => {
                setManager(null);
                setGate("home");
              }}
            />
          </div>
        </nav>
        <main>
          <p className="watermark">Match book</p>
          {error && <p className="banner">{error}</p>}
          {managerId !== null && <TeamPage id={managerId} onBack={() => open(returnPage)} />}
          {managerId === null && playerId !== null && <PlayerPage id={playerId} onBack={() => open("squad")} />}
          {managerId === null && fixtureId !== null && <MatchPage fixture={fixtures.find((fixture) => fixture.id === fixtureId) ?? null} onBack={() => open("gameweek")} />}
          {managerId === null && playerId === null && fixtureId === null && page === "gameweek" && (
            <Gameweek
              matchday={current}
              fixtures={week}
              captain={captain && onPitch(eleven, captain.id) ? captain : null}
              vice={vice && onPitch(eleven, vice.id) ? vice : null}
              totalPoints={totalPoints}
              squadValue={squadValue}
              bank={bank}
              onMatchday={(day) => setMatchday(Math.min(34, Math.max(1, day)))}
              onOpen={(fixture) => openMatch(fixture.id)}
            />
          )}
          {managerId === null && playerId === null && fixtureId === null && page === "squad" && (
            <Squad
              formation={formation}
              eleven={eleven}
              players={players}
              captainId={captainId}
              viceId={viceId}
              selectedId={selectedId}
              note={note}
              onFormation={chooseFormation}
              onSelect={(player) => {
                setSelectedId(player.id);
                setNote("");
              }}
              onBringIn={bringIn}
              onCaptain={() => selectedId !== null && setCaptainId(selectedId)}
              onVice={() => selectedId !== null && setViceId(selectedId)}
              onOpen={(player) => openPlayer(player.id)}
              squadValue={squadValue}
              bank={bank}
            />
          )}
          {managerId === null && playerId === null && fixtureId === null && page === "transfers" && (
            <Transfers
              players={players}
              squad={squad}
              bank={bank}
              moves={moves}
              half={half}
              note={note}
              onBringIn={bringIn}
              onOpen={(player) => openPlayer(player.id)}
            />
          )}
          {managerId === null && playerId === null && fixtureId === null && page === "rivalry" && <Rivalry onOpenManager={openManager} />}
          {managerId === null && playerId === null && fixtureId === null && page === "leagues" && <Leagues onOpenManager={openManager} />}
          {managerId === null && playerId === null && fixtureId === null && page === "rules" && <Rules />}
        </main>
      </div>
    </>
  );
}

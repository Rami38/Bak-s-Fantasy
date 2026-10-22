import { money, shortPlayerName } from "./format.ts";
import type { Eleven } from "./lineup.ts";
import { usePrefs } from "./prefs.tsx";
import type { Person } from "./types.ts";

type Props = {
  eleven: Eleven;
  captainId: number | null;
  viceId: number | null;
  selectedId?: number | null;
  compact?: boolean;
  readOnly?: boolean;
  showPrice?: boolean;
  onSelect?: (player: Person) => void;
  onOpen?: (player: Person) => void;
};

export function Pitch({ eleven, captainId, viceId, selectedId = null, compact, readOnly, showPrice, onSelect, onOpen }: Props) {
  const { t } = usePrefs();
  const line = { captainId, viceId, selectedId, readOnly, showPrice, onSelect, onOpen };
  return (
    <div className="pitch-wrap">
      <div className={compact ? "pitch compact" : "pitch"}>
        <PitchLines />
        <Line players={eleven.forwards} {...line} />
        <Line players={eleven.midfielders} {...line} />
        <Line players={eleven.defenders} {...line} />
        <Line players={[eleven.goalkeeper]} {...line} keeper />
      </div>
      {!compact && (
        <div className="bench">
          <p>{t.bench}</p>
          <div className="bench-row">
            {eleven.bench.map((player, index) =>
              player ? (
                <Card
                  key={player.id}
                  player={player}
                  captainId={captainId}
                  viceId={viceId}
                  selectedId={selectedId}
                  readOnly={readOnly}
                  showPrice={showPrice}
                  onSelect={onSelect}
                  onOpen={onOpen}
                />
              ) : (
                <div key={`bench-${index}`} className="shirt empty" />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PitchLines() {
  const line = { fill: "none", stroke: "rgba(255,255,255,0.82)", strokeWidth: 2, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg className="pitch-svg" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">
      <rect x="6" y="8" width="88" height="134" {...line} />
      <line x1="6" y1="75" x2="94" y2="75" {...line} />
      <circle cx="50" cy="75" r="10" {...line} />
      <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.9)" />
      <rect x="24" y="8" width="52" height="24" {...line} />
      <rect x="36" y="8" width="28" height="9" {...line} />
      <circle cx="50" cy="24" r="0.7" fill="rgba(255,255,255,0.9)" />
      <path d="M38 32 A12 12 0 0 0 62 32" {...line} />
      <rect x="38" y="2" width="24" height="6" {...line} />
      <line x1="41" y1="2" x2="41" y2="8" {...line} />
      <line x1="50" y1="2" x2="50" y2="8" {...line} />
      <line x1="59" y1="2" x2="59" y2="8" {...line} />
      <rect x="24" y="118" width="52" height="24" {...line} />
      <rect x="36" y="133" width="28" height="9" {...line} />
      <circle cx="50" cy="126" r="0.7" fill="rgba(255,255,255,0.9)" />
      <path d="M38 118 A12 12 0 0 1 62 118" {...line} />
      <rect x="38" y="142" width="24" height="6" {...line} />
      <line x1="41" y1="142" x2="41" y2="148" {...line} />
      <line x1="50" y1="142" x2="50" y2="148" {...line} />
      <line x1="59" y1="142" x2="59" y2="148" {...line} />
      <path d="M6 14 A6 6 0 0 0 12 8" {...line} />
      <path d="M88 8 A6 6 0 0 0 94 14" {...line} />
      <path d="M6 136 A6 6 0 0 1 12 142" {...line} />
      <path d="M88 142 A6 6 0 0 1 94 136" {...line} />
    </svg>
  );
}

function Line({
  players,
  captainId,
  viceId,
  selectedId,
  readOnly,
  showPrice,
  onSelect,
  onOpen,
  keeper = false,
}: {
  players: Array<Person | null>;
  captainId: number | null;
  viceId: number | null;
  selectedId: number | null;
  readOnly?: boolean;
  showPrice?: boolean;
  onSelect?: (player: Person) => void;
  onOpen?: (player: Person) => void;
  keeper?: boolean;
}) {
  return (
    <div className={keeper ? "line line-gk" : "line"}>
      {players.map((player, index) =>
        player ? (
          <Card
            key={player.id}
            player={player}
            captainId={captainId}
            viceId={viceId}
            selectedId={selectedId}
            readOnly={readOnly}
            showPrice={showPrice}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ) : (
          <div key={`slot-${index}`} className="shirt empty" />
        ),
      )}
    </div>
  );
}

function Card({
  player,
  captainId,
  viceId,
  selectedId,
  readOnly,
  showPrice,
  onSelect,
  onOpen,
}: {
  player: Person;
  captainId: number | null;
  viceId: number | null;
  selectedId: number | null;
  readOnly?: boolean;
  showPrice?: boolean;
  onSelect?: (player: Person) => void;
  onOpen?: (player: Person) => void;
}) {
  const { t } = usePrefs();
  const mark = player.id === captainId ? "C" : player.id === viceId ? "V" : "";
  const title = player.id === captainId ? t.captain : player.id === viceId ? t.vice : undefined;
  const body = (
    <>
      {mark && (
        <span className="mark" title={title}>
          {mark}
        </span>
      )}
      {readOnly || !onOpen ? (
        <strong>{shortPlayerName(player.name)}</strong>
      ) : (
        <strong
          onClick={(event) => {
            event.stopPropagation();
            onOpen(player);
          }}
        >
          {shortPlayerName(player.name)}
        </strong>
      )}
      <small>{player.club_short}</small>
      {showPrice && <small>{money(player.price_tenths)}</small>}
    </>
  );
  if (readOnly) return <div className="shirt read-only">{body}</div>;
  return (
    <button type="button" className={player.id === selectedId ? "shirt selected" : "shirt"} onClick={() => onSelect?.(player)}>
      {body}
    </button>
  );
}

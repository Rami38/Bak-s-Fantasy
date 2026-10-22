import { usePrefs } from "../prefs.tsx";

const EN = [
  ["The squad", "15 players: 2 goalkeepers, 5 defenders, 5 midfielders, 3 forwards. Budget €100.0m. At most 3 from one club."],
  ["The lineup", "Formations 4-4-2, 4-3-3, 3-5-2, 3-4-3, 5-3-2, 5-4-1 and 4-5-1. The captain scores double. The vice-captain scores double only if the captain plays 0 minutes."],
  ["Transfers", "One free transfer each gameweek, then −4 points. Wildcard, Free Hit, Bench Boost and Triple Captain, each once per half. The half changes after gameweek 17."],
  ["Deadlines", "The lineup locks at the first kickoff. Rivalry locks 60 minutes earlier. Times follow the clock of the person looking at the page."],
  ["Private leagues", "The same squad, ranked by match points only. Influence never enters this table."],
  ["The slate", "Up to 8 rivals: four ranked just above you and four just below. Influence starts at 2. Awards are 0 without a lineup, 1 for a lineup, 2 if at least half the slate is outscored, 4 if at least three quarters are."],
  ["Actions", "One free Lock, plus one offensive action: Offer, Exchange, or Heist. Bench players only. A squad loses at most one player in a gameweek. Heist minimum bid is 2. The highest bid wins, and an earlier bid breaks a tie. There is no dice roll."],
];

const FR = [
  ["L'effectif", "15 joueurs : 2 gardiens, 5 défenseurs, 5 milieux, 3 attaquants. Budget 100,0 M€. Au plus 3 d'un même club."],
  ["La compo", "Formations 4-4-2, 4-3-3, 3-5-2, 3-4-3, 5-3-2, 5-4-1 et 4-5-1. Le capitaine marque double. Le vice-capitaine marque double seulement si le capitaine joue 0 minute."],
  ["Transferts", "Un transfert gratuit par journée, puis −4 points. Joker, Free Hit, Bench Boost et Triple Captain, une fois par moitié. La moitié change après la journée 17."],
  ["Heures limites", "La compo se ferme au premier coup d'envoi. La rivalité se ferme 60 minutes plus tôt. Les heures suivent l'horloge de la personne qui regarde la page."],
  ["Ligues privées", "Le même effectif, classé sur les points de match seulement. L'Influence n'entre pas dans cette table."],
  ["L'ardoise", "Jusqu'à 8 rivaux : quatre juste au-dessus et quatre juste en dessous. L'Influence commence à 2. Les gains sont 0 sans compo, 1 avec une compo, 2 si au moins la moitié de l'ardoise est dépassée, 4 si au moins les trois quarts le sont."],
  ["Actions", "Un Verrou gratuit, plus une action offensive : Offre, Échange ou Casse. Banc seulement. Un effectif perd au plus un joueur par journée. Mise minimale du Casse : 2. La plus haute mise gagne, la plus ancienne départage. Pas de dé."],
];

export function Rules() {
  const { t, lang } = usePrefs();
  const sections = lang === "fr" ? FR : EN;
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="kicker">{t.rules}</p>
          <h2>{t.rulesTitle}</h2>
          <p className="lede">{t.rulesLede}</p>
          <hr />
        </div>
      </div>
      <div className="rule-list">
        {sections.map(([title, body]) => (
          <article key={title} className="card">
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

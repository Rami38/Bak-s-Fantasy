const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  ImageRun,
} = require("docx");
const fs = require("fs");

const NAVY = "1B3A4B";
const GOLD = "8C6A2F";
const INK = "1A1A1A";
const MUTED = "5C6B73";
const RULE = "D5DDE2";
const ALT = "F4F7F8";
const WHITE = "FFFFFF";
const CONTENT = 9890;

const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
const hair = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const grid = { top: hair, bottom: hair, left: hair, right: hair };
const clear = { top: none, bottom: none, left: none, right: none };

function runs(text, extra = {}) {
  const size = extra.size || 22;
  const color = extra.color || INK;
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const bold = part.startsWith("**") || extra.bold;
      const value = part.startsWith("**") ? part.slice(2, -2) : part;
      return new TextRun({
        text: value,
        bold,
        italics: extra.italics,
        font: "Calibri",
        size,
        color,
      });
    });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 0, after: opts.after ?? 160, line: 276 },
    children: runs(text, opts),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 1 },
    },
    spacing: { before: 400, after: 180 },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: 32, color: NAVY })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: 26, color: NAVY })],
  });
}

function rulePara(reference, text) {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { before: 40, after: 120, line: 276 },
    children: runs(text),
  });
}

function bullet(reference, text) {
  return new Paragraph({
    numbering: { reference, level: 0 },
    spacing: { before: 20, after: 80, line: 276 },
    children: runs(text),
  });
}

function cell(text, width, opts = {}) {
  const fill = opts.fill || WHITE;
  const paragraphs = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: opts.borders || grid,
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.span,
    children: paragraphs.map(
      (line, index) =>
        new Paragraph({
          spacing: { after: index === paragraphs.length - 1 ? 0 : 40 },
          children: runs(line, {
            bold: opts.bold,
            size: opts.size || 20,
            color: opts.color || (opts.bold ? WHITE : INK),
          }),
        })
    ),
  });
}

function table(widths, rows) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (cols, rowIndex) =>
        new TableRow({
          tableHeader: rowIndex === 0,
          cantSplit: true,
          children: cols,
        })
    ),
  });
}

function headerRow(labels, widths) {
  return labels.map((label, i) =>
    cell(label, widths[i], { bold: true, fill: NAVY, color: WHITE })
  );
}

function dataRow(values, widths, shade) {
  return values.map((value, i) =>
    cell(value, widths[i], { fill: shade ? ALT : WHITE })
  );
}

function spacer(after = 120) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function diagram(file, width, height, caption) {
  return [
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        new ImageRun({
          type: "png",
          data: fs.readFileSync(file),
          transformation: { width, height },
          altText: { title: caption, description: caption, name: caption },
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: caption, italics: true, font: "Calibri", size: 18, color: MUTED }),
      ],
    }),
  ];
}

function level(reference, text) {
  return {
    reference,
    levels: [
      {
        level: 0,
        format: text.includes("%") ? LevelFormat.DECIMAL : LevelFormat.BULLET,
        text,
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 720, hanging: 720 } },
          run: { font: "Calibri", size: 22, bold: true, color: NAVY },
        },
      },
    ],
  };
}

function bulletLevel(reference) {
  return {
    reference,
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: 720, hanging: 360 } },
        },
      },
    ],
  };
}

const pointsW = [4690, 1300, 1300, 1300, 1300];
const pointRows = [
  ["Played 1–59 minutes", "1", "1", "1", "1"],
  ["Played 60 or more minutes", "2", "2", "2", "2"],
  ["Goal scored", "10", "6", "5", "4"],
  ["Assist", "3", "3", "3", "3"],
  ["Clean sheet, if 60 or more minutes", "4", "4", "1", "0"],
  ["Goals conceded, per 2, if 60 or more minutes", "−1", "−1", "0", "0"],
  ["Every 3 saves", "1", "0", "0", "0"],
  ["Penalty save", "5", "5", "5", "5"],
  ["Penalty miss", "−2", "−2", "−2", "−2"],
  ["Yellow card", "−1", "−1", "−1", "−1"],
  ["Red card", "−3", "−3", "−3", "−3"],
  ["Own goal", "−2", "−2", "−2", "−2"],
];

const chipW = [1800, 4545, 3545];
const failW = [4245, 5645];
const timeW = [1700, 2500, 5690];
const entityW = [2100, 4590, 3200];
const screenW = [1600, 4690, 3600];
const sliceW = [900, 4495, 4495];
const awardW = [6245, 3645];

const doc = new Document({
  creator: "Ligue 1 Fantasy",
  title: "Ligue 1 Fantasy System Design",
  description: "Version 0.3 system design for a free local Ligue 1 fantasy game.",
  styles: {
    default: {
      document: {
        styles: [
          {
            id: "Normal",
            run: { font: "Calibri", size: 22, color: INK },
          },
        ],
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Calibri", size: 32, bold: true, color: NAVY },
        paragraph: { spacing: { before: 400, after: 180 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Calibri", size: 26, bold: true, color: NAVY },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      level("base", "B%1"),
      level("rival", "R%1"),
      level("time", "T%1"),
      level("pipe", "P%1"),
      bulletLevel("read"),
      bulletLevel("scope"),
      bulletLevel("out"),
      bulletLevel("heist"),
      bulletLevel("arch"),
      bulletLevel("open"),
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1008, bottom: 1008, left: 1008, right: 1008, header: 576, footer: 576 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } },
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: "Ligue 1 Fantasy",
                  bold: true,
                  font: "Calibri",
                  size: 18,
                  color: NAVY,
                }),
                new TextRun({
                  text: "   ·   System design v0.3",
                  font: "Calibri",
                  size: 18,
                  color: MUTED,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
              spacing: { before: 80 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Page ", font: "Calibri", size: 18, color: MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: MUTED }),
                new TextRun({ text: " of ", font: "Calibri", size: 18, color: MUTED }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Table({
          width: { size: CONTENT, type: WidthType.DXA },
          columnWidths: [CONTENT],
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: CONTENT, type: WidthType.DXA },
                  borders: clear,
                  shading: { type: ShadingType.CLEAR, fill: NAVY },
                  margins: { top: 240, bottom: 240, left: 280, right: 280 },
                  children: [
                    new Paragraph({
                      spacing: { after: 80 },
                      children: [
                        new TextRun({
                          text: "LIGUE 1 FANTASY",
                          bold: true,
                          font: "Calibri",
                          size: 44,
                          color: WHITE,
                        }),
                      ],
                    }),
                    new Paragraph({
                      spacing: { after: 60 },
                      children: [
                        new TextRun({
                          text: "System design",
                          font: "Calibri",
                          size: 28,
                          color: "E4C98A",
                        }),
                      ],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Version 0.3    ·    10 October 2026    ·    Season 2026/27",
                          font: "Calibri",
                          size: 20,
                          color: "D5DDE2",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        spacer(200),
        body(
          "Managers build a 15-player Ligue 1 squad under a budget, set a weekly lineup, and score points from real match stats. Before each lineup deadline, a manager can lock a player, buy one, exchange one, or take a bench player from a rival on a public slate of eight nearby managers. The overall ranking is the sum of match points. Influence is never added to it."
        ),
        body(
          "This document is the decision record for version 1. Rules are numbered so later edits can cite them. If two sentences disagree, the numbered rule wins and the other sentence must be corrected."
        ),

        h1("1. Purpose and scope"),
        h2("How to read it"),
        bullet("read", "Sections 2 and 3 are the game. Build them as written."),
        bullet("read", "Sections 4 to 6 say how a gameweek moves from an open squad to a published score."),
        bullet("read", "Section 7 is the architecture: a free local monolith, with the C4 and use-case diagrams."),
        bullet("read", "Sections 8 and 9 are the screens and the build order."),
        bullet("read", "Section 10 lists the choices that can still change without a new design."),

        h2("Who it is for"),
        body(
          "The reader is the person implementing the game. The document names the product, the rules, the data, and the weekly jobs. It does not specify visual design, marketing, or a mobile client."
        ),

        h2("In version 1"),
        bullet("scope", "One season: 2026/27 Ligue 1, 18 clubs, 34 matchdays."),
        bullet("scope", "Accounts, a budget squad, weekly lineups, transfers, and four chips."),
        bullet("scope", "Points from finished matches, with a per-player breakdown."),
        bullet("scope", "An overall ranking and private leagues."),
        bullet("scope", "Lock, Offer, Exchange, and Heist on the public game, against a weekly slate of eight nearby managers."),

        h2("Not in version 1"),
        bullet("out", "Live points while a match is in progress. Scores update when a fixture is finished, and again if a stat is corrected."),
        bullet("out", "Bonus points and weekly price changes."),
        bullet("out", "Cash prizes, draft leagues, and a rivalry action against a manager who is not on your slate."),
        bullet("out", "LFP logos, the competition logo, club crests, and player photographs."),
        bullet("out", "A paid host, a paid database, or a paid stats plan."),

        h1("2. Base game"),
        body(
          "The base game is a full season on its own. Rivalry, in section 3, changes who owns a player. It does not add a second scoring system."
        ),

        h2("Season, squad, and money"),
        rulePara(
          "base",
          "**Season.** The version-1 season is 2026/27 Ligue 1: 18 clubs and 34 matchdays. Each matchday is one gameweek, numbered 1 to 34. The season opens on the weekend of 23 August 2026 and ends on matchday 34."
        ),
        rulePara(
          "base",
          "**Squad size.** A manager owns exactly 15 players: 2 goalkeepers, 5 defenders, 5 midfielders, and 3 forwards."
        ),
        rulePara(
          "base",
          "**Budget.** The squad budget is €100.0 million. Money is stored as an integer count of €0.1 million, so 1000 means €100.0 million. A purchase that would make the remaining budget negative is rejected."
        ),
        rulePara(
          "base",
          "**Club limit.** A squad holds at most 3 players from the same club. The club is the one on the player’s current stint for that gameweek."
        ),
        rulePara(
          "base",
          "**Prices.** An editor sets each price, in €0.1 million steps, before gameweek 1. Public market-value lists, including Transfermarkt, may inform that meeting. They are not imported by a job. A price changes only when the player moves between Ligue 1 clubs, and the new price is set before the next gameweek opens. Version 1 has no automatic weekly price change."
        ),
        rulePara(
          "base",
          "**Players who leave.** A player who leaves Ligue 1 is ineligible. If the manager has not sold that player before the next lineup deadline, the game sells the player at list price and leaves an empty slot. An empty slot scores 0. A lineup cannot be submitted while the squad has fewer than 15 eligible players."
        ),

        h2("Lineup"),
        rulePara(
          "base",
          "**Formations.** The starting XI uses one of 4-4-2, 4-3-3, 3-5-2, 3-4-3, 5-3-2, 5-4-1, or 4-5-1. The other 4 players are the bench, in order 1 to 4. A starting goalkeeper can be replaced only by a goalkeeper."
        ),
        rulePara(
          "base",
          "**Captain.** The captain’s points are doubled, including a negative total. The vice-captain’s points are doubled only when the captain plays 0 minutes. Played means more than 0 minutes. Triple Captain sets the captain multiplier to 3 and leaves the vice-captain at 2."
        ),
        rulePara(
          "base",
          "**Deadline.** The lineup deadline is the kickoff of the first fixture in the gameweek. Market transfers close at that same instant. The rivalry window closes 60 minutes earlier, as rule R7 states. Every deadline is stored in UTC and shown to managers in Europe/Paris."
        ),

        h2("Transfers and chips"),
        rulePara(
          "base",
          "**Free transfers.** Each gameweek includes 1 free transfer. Each further transfer in that gameweek costs −4 points on that gameweek’s score. A transfer is one sale and one purchase. Unused free transfers do not roll over. Before the gameweek 1 deadline, transfers are unlimited and free, and any unspent budget remains."
        ),
        rulePara(
          "base",
          "**Sale price.** The sale price and the purchase price on the open market are the current list price."
        ),
        rulePara(
          "base",
          "**Chips.** A manager may play Wildcard, Free Hit, Bench Boost, and Triple Captain once across gameweeks 1–17, and once again across gameweeks 18–34. The chip sits on the lineup. It is consumed at the lineup deadline and can be removed before that deadline."
        ),
        spacer(80),
        table(chipW, [
          headerRow(["Chip", "What it does this gameweek", "What remains afterward"], chipW),
          dataRow(
            ["Wildcard", "Unlimited transfers, and no points hit.", "The new squad persists."],
            chipW,
            false
          ),
          dataRow(
            [
              "Free Hit",
              "Unlimited transfers, and no points hit. Those transfers edit a temporary squad.",
              "The temporary squad is discarded. The persistent squad remains, including any heist, accepted offer, or accepted exchange from that week.",
            ],
            chipW,
            true
          ),
          dataRow(
            ["Bench Boost", "All 15 players can score. Automatic substitutions do not run.", "The squad is unchanged."],
            chipW,
            false
          ),
          dataRow(
            [
              "Triple Captain",
              "The captain multiplier is 3. The vice-captain is still doubled only if the captain plays 0 minutes.",
              "The squad is unchanged.",
            ],
            chipW,
            true
          ),
        ]),
        spacer(140),
        rulePara(
          "base",
          "**Free Hit and the persistent squad.** Selecting Free Hit copies the persistent squad into a temporary squad. Transfers made while the chip is selected edit only the copy. Removing the chip before the deadline discards the copy. Rivalry resolution edits the persistent squad. If that removes a player who is still in the copy, the copy’s slot is emptied and must be filled before the lineup deadline."
        ),
        rulePara(
          "base",
          "**Automatic substitutions.** They run only when Bench Boost is off. Once a starter’s fixture is finished or cancelled, a starter with 0 minutes is replaced by the first bench player who played more than 0 minutes and leaves a legal formation. The bench is tried in order. A postponed fixture is not finished, so that starter is not replaced yet."
        ),

        h2("Points"),
        rulePara(
          "base",
          "**Points table.** A player scores only the events below. Appearance points use a single band: 0 minutes scores 0, 1–59 minutes scores 1, and 60 or more scores 2. The bands do not stack. Version 1 does not award bonus points."
        ),
        spacer(60),
        table(pointsW, [
          headerRow(["Event", "GK", "DEF", "MID", "FWD"], pointsW),
          ...pointRows.map((row, i) => dataRow(row, pointsW, i % 2 === 1)),
        ]),
        spacer(140),
        body(
          "Saves use integer division: 5 saves score 1 point, and 2 saves score 0. A penalty goal counts as a goal, and an assist on it still scores. An own goal does not create an assist. A clean sheet requires 60 or more minutes and 0 team goals in that match."
        ),
        rulePara(
          "base",
          "**Goals conceded.** Version 1 uses the team’s full-match total. The deduction of 1 point per 2 goals applies only when the player played 60 or more minutes. It does not track the minute the player left the pitch."
        ),
        rulePara(
          "base",
          "**Cards.** A yellow card is −1. A red card is −3. Two yellow cards in the same match are stored as one red card and zero yellow cards, so the total is −3."
        ),
        rulePara(
          "base",
          "**When the multiplier applies.** Automatic substitutions run first. Event points are totaled next. The captain multiplier is applied to that total. If the captain played 0 minutes, the captain scores 0 and the vice-captain is doubled when the vice-captain played more than 0 minutes. If both played 0 minutes, no multiplier is applied."
        ),
        rulePara(
          "base",
          "**Postponed and cancelled matches.** A postponed match stays in its original gameweek and scores when it is played. The gameweek is not final until every fixture is finished or cancelled. A cancelled fixture scores 0 for every player and is not moved."
        ),
        rulePara(
          "base",
          "**One squad, every table.** A manager has one squad for the season. That squad’s match points count in the overall ranking and in every private league the manager has joined. A heist, an accepted offer, or an accepted exchange does not add points. It can change which players are owned, and those players then score in every table."
        ),

        h1("3. Public rivalry"),
        body(
          "Rivalry is the interactive layer on the public game. Before the lineup locks, a manager can protect a player, agree a sale, agree a same-position exchange, or take an unlocked bench player if they can pay and the squad stays legal. Nothing is decided by a random roll. Private leagues do not run a second copy of these actions."
        ),

        h2("The slate and Influence"),
        rulePara(
          "rival",
          "**Where it exists.** Lock, Offer, Exchange, and Heist are played on the one public squad. A private league ranks that same squad by match points. It has no Influence balance and no rivalry actions of its own."
        ),
        rulePara(
          "rival",
          "**Private leagues.** Any manager can create a private league and receives a join code of at least 8 random characters. The code is enough to join. A manager may belong to more than one private league."
        ),
        rulePara(
          "rival",
          "**One balance.** Each manager has one Influence balance for the season. Influence is not added to a score, and it is not split across leagues."
        ),
        rulePara(
          "rival",
          "**Opening balance.** Every manager starts at 2 Influence, so a heist can be attempted before gameweek 1 has been scored."
        ),
        rulePara(
          "rival",
          "**Weekly slate.** When the rivalry window opens, each manager receives up to eight rivals: the four overall places above them and the four below them. Overall order is total match points, then points in the latest final gameweek, then earlier account creation. Before any gameweek is final, the slate is the eight accounts created nearest in time. The slate is stored for that gameweek and is not rebuilt if a later stat correction moves the rank. If you can act on a manager, that manager can see your bench and act on you."
        ),
        rulePara(
          "rival",
          "**Awards.** When a gameweek becomes final, Influence is awarded from that stored slate. A legal lineup awards 1. Outscoring at least half of the slate, rounded up, awards 1 more. Outscoring at least three quarters of the slate, rounded up, awards 2 more on top of that. On a full slate of eight, half is 4 and three quarters is 6, so the awards are 1, 2, and 4. A manager with no legal lineup receives 0."
        ),
        spacer(60),
        table(awardW, [
          headerRow(["Result against the stored slate", "Influence awarded"], awardW),
          dataRow(["No legal lineup", "0"], awardW, false),
          dataRow(["Legal lineup, and fewer than half the slate outscored", "1"], awardW, true),
          dataRow(["Legal lineup, and at least half the slate outscored", "2"], awardW, false),
          dataRow(["Legal lineup, and at least three quarters of the slate outscored", "4"], awardW, true),
        ]),
        spacer(160),

        h2("The rivalry window"),
        rulePara(
          "rival",
          "**Rivalry deadline.** The window closes 60 minutes before the lineup deadline. The game then resolves actions in the order in section 4. The manager has those 60 minutes to field a legal XI after a squad change."
        ),
        rulePara(
          "rival",
          "**What the slate can see.** During the window, a manager can see each slate rival’s squad split into the saved starting XI and the bench. Captain, vice-captain, and the selected chip stay hidden until the lineup deadline."
        ),
        rulePara(
          "rival",
          "**Action limit.** In one gameweek, a manager may play one Lock and one offensive action. The offensive action is one Offer, one Exchange, or one Heist. Accepting another manager’s Offer or Exchange does not use this action."
        ),

        h2("The four actions"),
        rulePara(
          "rival",
          "**Lock.** A Lock names one of the manager’s own players. It costs nothing and does not use the offensive action. A locked player cannot be taken by a heist that resolves that gameweek. A Lock does not stop an Offer or an Exchange the owner accepts. A manager may Lock a player and still play an offensive action."
        ),
        rulePara(
          "rival",
          "**Offer.** An Offer names a bench player on the slate, a price at least equal to the list price, and one of the buyer’s own players of the same position to release to the market. The owner may accept, refuse, or counter with a higher price before the rivalry deadline. Refusal is free and final. A counter replaces the price; if the buyer does not accept it before the deadline, the Offer expires. On success, the buyer pays the agreed price, the owner receives that price, and the named player goes to the market at list price. The buyer’s budget must cover the agreed price minus the released player’s list price."
        ),
        rulePara(
          "rival",
          "**Exchange.** An Exchange names one of the proposer’s bench players and one bench player of the same position on a slate rival. The rival may accept, refuse, or counter with a different bench player of that position. Accepting is free. The manager who receives the higher list price pays the other manager the difference and must have that money. Both squads must stay inside the club limit and the position counts. Both players move directly. Neither is listed on the market. A player received in an Exchange cannot be the target of a Heist in the next gameweek."
        ),
        rulePara(
          "rival",
          "**Heist.** A Heist names a bench player on the slate, an Influence bid of at least 2, and one of the taker’s own players of the same position to release. The bid is reserved when the Heist is submitted. Success is entirely conditional. There is no die roll and no hidden chance."
        ),
        rulePara(
          "rival",
          "**Heist success.** A Heist succeeds at the rivalry deadline only when all of the following are true. If any one fails, the squad is unchanged and the reserved Influence is refunded."
        ),
        bullet("heist", "The target manager is on the taker’s stored slate."),
        bullet("heist", "The target is on the owner’s saved bench at the deadline."),
        bullet("heist", "The target is not locked."),
        bullet("heist", "That player was not taken by a successful Heist or Exchange in the previous gameweek."),
        bullet("heist", "The owner has not already lost a player this gameweek to an accepted Offer, an accepted Exchange, or a Heist."),
        bullet("heist", "The taker still owns the named release player."),
        bullet("heist", "After the swap, the budget is at least 0, no club has more than 3 players, and the position counts are still 2, 5, 5, and 3."),
        bullet("heist", "The bid is the winning bid against that squad. The higher bid wins. An equal bid loses to the earlier submission."),
        rulePara(
          "rival",
          "**Heist result.** On success, the taker spends the reserved Influence. The taker’s budget changes by the released player’s list price minus the target’s list price. The owner receives the target’s list price. The released player returns to the market at list price. The taken player cannot be the target of a Heist in the next gameweek. An Offer or an Exchange for that player is still allowed."
        ),
        rulePara(
          "rival",
          "**Bench only.** Offer, Exchange, and Heist name bench players. A player who is in the saved starting XI at the rivalry deadline cannot be taken. Moving either player in an Exchange into the XI before that deadline makes the Exchange fail. Moving a Heist or Offer target into the XI makes that action fail."
        ),
        rulePara(
          "rival",
          "**One player lost.** A squad loses at most one player per gameweek. Accepted Offers and Exchanges are applied before Heists. If one of those has already removed a player, every Heist against that squad fails."
        ),
        rulePara(
          "rival",
          "**Several heists.** If several Heists name the same player, only the winning bid is applied and the others are refunded. If they name different players in the same squad, only the single winning bid against that squad is applied."
        ),
        rulePara(
          "rival",
          "**Persistent ownership.** A Heist, an accepted Offer, or an accepted Exchange changes the persistent squad. It is not undone when a Free Hit ends."
        ),
        rulePara(
          "rival",
          "**Forbidden targets.** A manager cannot target a player they already own, or a manager who is not on their slate. An action against a player whose fixture has already kicked off is rejected. The rivalry window is not reopened after its deadline, including when a postponed match is later given a new kickoff."
        ),

        h2("Failure cases"),
        body("These are the same rules as above, stated as outcomes an implementer can test."),
        spacer(40),
        table(failW, [
          headerRow(["Situation at resolution", "Outcome"], failW),
          dataRow(
            ["The buyer cannot cover the price after the release.", "The action fails. The squad is unchanged. A Heist refunds its Influence."],
            failW,
            false
          ),
          dataRow(
            ["The swap would break the club limit or the position counts.", "The action fails. The squad is unchanged."],
            failW,
            true
          ),
          dataRow(
            ["The target is locked.", "The Heist fails and its Influence is refunded. The owner can still accept an Offer or an Exchange for that player."],
            failW,
            false
          ),
          dataRow(
            ["A named player is in the starting XI at the rivalry deadline.", "The Offer, Exchange, or Heist fails. A Heist refunds its Influence."],
            failW,
            true
          ),
          dataRow(
            ["The other manager is not on the stored slate.", "The action is rejected when it is submitted."],
            failW,
            false
          ),
          dataRow(
            ["Two Heists name one player, or two Heists hit one squad.", "The higher bid wins. The other Influence is refunded. A tie goes to the earlier submission."],
            failW,
            true
          ),
          dataRow(
            ["The same player was taken by a Heist or an Exchange in the previous gameweek.", "The new Heist fails and its Influence is refunded."],
            failW,
            false
          ),
          dataRow(
            ["The owner refuses the Offer or the Exchange, or nobody answers it.", "No move. Nobody pays."],
            failW,
            true
          ),
          dataRow(
            ["The receiver of the more expensive player in an Exchange cannot pay the difference.", "The Exchange fails. Both squads stay as they are."],
            failW,
            false
          ),
          dataRow(
            ["The taker no longer owns the player they promised to release.", "The action fails. A Heist refunds its Influence."],
            failW,
            true
          ),
        ]),
        spacer(180),
        h2("Worked examples"),
        body(
          "Before gameweek 6, Sam has €2.0 million free and 4 Influence. Sam’s slate includes a rival four places above. Sam releases a bench midfielder listed at €5.5 million and bids 2 Influence for that rival’s unlocked bench midfielder listed at €7.0 million. The budget after the swap would be €2.0 + €5.5 − €7.0 = €0.5 million, and Sam would still be inside the three-player club limit. No higher bid targets that squad. The Heist succeeds. The rival receives €7.0 million. Sam has 2 Influence left. The taken player cannot be heisted in gameweek 7."
        ),
        body(
          "If, before the rivalry deadline, the rival moves that player into the starting XI, the Heist fails and Sam’s 2 Influence is refunded. Sam still has 60 minutes to set a lineup. The same refund happens if the rival used Lock on that player."
        ),
        body(
          "In the same window, Ines offers a bench forward listed at €6.0 million for a slate rival’s bench forward listed at €8.5 million. The rival accepts. Ines pays the €2.5 million difference. Both squads still have 3 forwards. Neither forward can be heisted in gameweek 7. Ines has used her offensive action. Accepting did not use the rival’s."
        ),

        h1("4. Gameweek timeline"),
        body(
          "A gameweek is a timestamped state machine. The worker may run late. The deadline that counts is the stored timestamp, not the moment the job happens to start."
        ),
        spacer(40),
        table(timeW, [
          headerRow(["Phase", "When it starts", "What is allowed"], timeW),
          dataRow(
            ["Open", "The previous lineup deadline has passed, or the season has opened.", "Market transfers, lineup edits, Lock, Offer, Exchange, and Heist."],
            timeW,
            false
          ),
          dataRow(
            ["Rivalry closed", "60 minutes before the first kickoff.", "No new rivalry actions. Offers, Exchanges, and Heists for this week are resolved. Lineups and market transfers stay open."],
            timeW,
            true
          ),
          dataRow(
            ["Lineup locked", "Kickoff of the first fixture.", "The lineup is frozen, the chip is consumed, and transfer hits are charged. No sales."],
            timeW,
            false
          ),
          dataRow(
            ["Scoring", "The first finished fixture has stats.", "Published points update as further fixtures finish. A postponed fixture contributes 0 until it is played."],
            timeW,
            true
          ),
          dataRow(
            ["Final", "Every fixture is finished or cancelled.", "The breakdown is stable except for a stat correction. Influence for this gameweek is awarded."],
            timeW,
            false
          ),
        ]),
        spacer(160),
        rulePara(
          "time",
          "**Resolution order.** At the rivalry deadline the worker does four things, in this order. It expires Offers, Exchanges, and counters that were not accepted. It applies accepted Offers and Exchanges in the order they were accepted. It resolves Heists using rules R14 to R18. It refunds every failed or losing bid."
        ),
        rulePara(
          "time",
          "**Scoring input.** Points are computed only from PlayerMatchStat. A person does not type a total. The published total is the sum of the breakdown."
        ),
        rulePara(
          "time",
          "**Stat corrections.** If a stat changes after publication, the worker recomputes every breakdown that used that fixture and replaces the total. The previous total is stored in an audit row. A heist or an exchange is not undone, and the stored slate is not rebuilt. Influence awards are recomputed from the corrected scores against that slate. A balance may become negative. A new bid is rejected when the balance cannot cover it. Influence already spent stays spent."
        ),
        rulePara(
          "time",
          "**Postponement beside the next week.** Lineups in the postponed gameweek stay locked. The next gameweek opens on its own dates. Influence for the postponed gameweek is awarded only when that gameweek becomes final. Until then, a starter whose only match is postponed is not automatically substituted."
        ),
        rulePara(
          "time",
          "**A lineup that names a sold player.** If the saved lineup still names a player the manager no longer owns, the game keeps the saved formation, keeps the starters who are still owned, and fills holes from the bench in bench order. Any slot that still cannot be filled scores 0."
        ),

        h1("5. Domain model"),
        body(
          "Names below are the names to use in the database and the API. Money columns are integers of €0.1 million. A clean sheet is not stored: it is 60 or more minutes and zero goals conceded in that fixture."
        ),
        spacer(40),
        table(entityW, [
          headerRow(["Entity", "Responsibility", "Uniqueness"], entityW),
          dataRow(
            ["Season", "The 2026/27 competition: 34 gameweeks and its date range.", "One row per season name."],
            entityW,
            false
          ),
          dataRow(
            ["Club", "A Ligue 1 club for this season.", "One row per club per season."],
            entityW,
            true
          ),
          dataRow(
            ["Player", "Identity and position: goalkeeper, defender, midfielder, or forward.", "One row per player."],
            entityW,
            false
          ),
          dataRow(
            ["PlayerClubStint", "Which club the player belongs to, from which gameweek, and at what list price.", "No overlapping stints for one player."],
            entityW,
            true
          ),
          dataRow(
            ["Fixture", "Home club, away club, kickoff, matchday, and status.", "One fixture per match. Status is scheduled, live, finished, postponed, or cancelled."],
            entityW,
            false
          ),
          dataRow(
            ["PlayerMatchStat", "Minutes and the scoring events for one player in one fixture.", "One row per player per fixture."],
            entityW,
            true
          ),
          dataRow(
            ["Gameweek", "Number 1–34, rivalry deadline, lineup deadline, and phase.", "One row per season and number."],
            entityW,
            false
          ),
          dataRow(
            ["User", "The manager’s account.", "One row per email."],
            entityW,
            true
          ),
          dataRow(
            ["Squad", "The persistent 15, the remaining budget, and the season.", "One squad per user per season."],
            entityW,
            false
          ),
          dataRow(
            ["SquadPlayer", "A player on that squad, the price paid, and how they were acquired: initial, market, offer, exchange, or heist.", "One row per squad and player. At most 3 share a club."],
            entityW,
            true
          ),
          dataRow(
            ["Lineup", "Formation, captain, vice-captain, chip, and submission time for one gameweek.", "One lineup per user per gameweek."],
            entityW,
            false
          ),
          dataRow(
            ["LineupSlot", "Starting or bench, and bench order 1–4.", "Eleven starters and four bench players."],
            entityW,
            true
          ),
          dataRow(
            ["Transfer", "Market sale and purchase, the gameweek, and any −4 hit.", "Hits are rows, not a handwritten total."],
            entityW,
            false
          ),
          dataRow(
            ["ChipUse", "Which chip was consumed in which half and gameweek.", "One use of each chip per user per half."],
            entityW,
            true
          ),
          dataRow(
            ["League", "Private league name, owner, and join code.", "One code per league."],
            entityW,
            false
          ),
          dataRow(
            ["LeagueMembership", "A manager inside one league.", "One membership per user per league."],
            entityW,
            true
          ),
          dataRow(
            ["RivalrySlate", "The rivals a manager may act on in one gameweek, frozen when the window opens.", "One row per user, rival, and gameweek. At most eight rivals."],
            entityW,
            false
          ),
          dataRow(
            ["InfluenceLedger", "Award, reserve, spend, refund, or correction, with a signed amount, for one manager.", "Append-only. The balance is the sum. There is one balance per user, not per league."],
            entityW,
            true
          ),
          dataRow(
            ["RivalryAction", "Lock, Offer, Exchange, or Heist: actor, target, release player, bid or price difference, status, and time.", "At most one Lock and one offensive action per user per gameweek."],
            entityW,
            false
          ),
          dataRow(
            ["GameweekScore", "The manager’s total for one gameweek, and whether it is final.", "One score per user per gameweek."],
            entityW,
            false
          ),
          dataRow(
            ["GameweekScoreLine", "One player’s events, base total, and multiplier.", "The score total equals the sum of its lines, plus transfer hits."],
            entityW,
            true
          ),
          dataRow(
            ["ScoreAudit", "The previous total, the reason, and the time of a correction.", "Written only when a published total changes."],
            entityW,
            false
          ),
        ]),
        spacer(160),
        h2("Fields that the rules depend on"),
        body(
          "**PlayerMatchStat** stores player, fixture, minutes, goals, assists, goals conceded, saves, penalties saved, penalties missed, yellow cards, red cards, and own goals. Ingest normalizes two yellow cards in one match to zero yellow cards and one red card before scoring reads the row."
        ),
        body(
          "**RivalryAction** stores the gameweek, the actor, the type, the target player, the release player when there is one, the Influence bid when it is a Heist, the agreed price when it is an Offer, the list-price difference when it is an Exchange, the status, and the creation time. Status is submitted, accepted, countered, refused, expired, succeeded, or failed. The creation time is the tie-break in rule R14. The action is legal only when the other manager is on the actor’s RivalrySlate for that gameweek."
        ),
        body(
          "**GameweekScoreLine** stores enough of the breakdown to explain the total on screen: minutes band, goals, assists, clean sheet, goals conceded, saves, penalty events, cards, own goals, the base total, and the multiplier. A manager can see why a player scored what they scored without reading the raw stat row."
        ),

        h1("6. Scoring pipeline"),
        body(
          "The worker owns this pipeline. A web request may read the latest published rows. It does not compute an official total."
        ),
        rulePara(
          "pipe",
          "**Ingest.** On a schedule, the worker pulls fixtures and player match stats for the current gameweeks from one stats provider and upserts Fixture and PlayerMatchStat. It also normalizes cards, as section 5 requires."
        ),
        rulePara(
          "pipe",
          "**Close rivalry.** At the rivalry deadline, the worker runs the resolution order in rule T1, writes InfluenceLedger rows, and refuses any later action for that gameweek."
        ),
        rulePara(
          "pipe",
          "**Lock lineups.** At the lineup deadline, the worker stores the lineup that was valid at that timestamp, consumes the chip, and writes transfer-hit rows."
        ),
        rulePara(
          "pipe",
          "**Score.** For each locked lineup, the worker applies automatic substitutions, the points table, and the captain multiplier. A starter whose fixture is still postponed is left in place and scores 0 for now."
        ),
        rulePara(
          "pipe",
          "**Publish.** The worker writes GameweekScore and one GameweekScoreLine per contributing slot. League tables and the overall table read these rows and add nothing else."
        ),
        rulePara(
          "pipe",
          "**Correct.** When a stat changes, the worker repeats scoring and publication for the affected fixtures, writes ScoreAudit, and recomputes Influence if the gameweek is final. Running scoring twice on the same stats produces the same rows."
        ),
        body(
          "Ingest does not poll during the match. On a match day the worker makes one fixtures call for the gameweek, then one player-stat call for each finished fixture. It repeats that pair the next morning for corrections. A postponed fixture is fetched again after its new kickoff. The worker stops for the day when fewer than 10 of the free plan’s 100 daily requests remain."
        ),

        h1("7. Architecture"),
        body(
          "Version 1 is a modular monolith that costs nothing to run. The web app, the API, and the worker are one codebase. Inside it, accounts, squad, rivalry, scoring, and the stats adapter stay in separate modules and share one Postgres database. The worker is a second process in that codebase. A web request reads published scores. It does not compute them. Microservices, a paid host, and a paid database are out of version 1. The install is the developer’s own computer."
        ),
        h2("Diagrams"),
        ...diagram(
          "C:\\Users\\Yacoub\\Documents\\Transfermarkt\\.sdd-build\\diagrams\\c4-context.png",
          620,
          230,
          "Figure 1. System context. The manager uses the game. The game pulls match data from API-Football."
        ),
        ...diagram(
          "C:\\Users\\Yacoub\\Documents\\Transfermarkt\\.sdd-build\\diagrams\\c4-containers.png",
          620,
          337,
          "Figure 2. Containers. One codebase. The API and the worker both use Postgres. Only the worker calls API-Football."
        ),
        ...diagram(
          "C:\\Users\\Yacoub\\Documents\\Transfermarkt\\.sdd-build\\diagrams\\use-cases.png",
          500,
          602,
          "Figure 3. Use cases. The manager plays. The worker imports, resolves, scores, and corrects."
        ),
        h2("Processes"),
        bullet("arch", "**Web app.** The screens in section 8. It is served by the same project as the API."),
        bullet("arch", "**API.** Auth, squad commands, lineup commands, league commands, and reads of gameweeks and scores."),
        bullet("arch", "**Worker.** Ingest, rivalry resolution, lineup lock, scoring, and corrections. It is a separate process, started beside the API."),
        bullet("arch", "**Postgres.** Installed locally. The entities in section 5. Deadlines, prices, points, and Influence are integers or timestamps, not strings."),
        body(
          "A cache, a queue, or a second region is not required. The worker polls the local database for deadlines that have passed."
        ),

        h2("Match data"),
        body(
          "The only external service is the free plan of API-Football, at api-football.com. It includes fixtures, squads, lineups, and per-player match statistics, with a limit of 100 requests per day and 10 per minute. The free plan covers recent seasons, which is the 2026/27 season this game scores. The worker confirms Ligue 1 from the leagues endpoint for France before the first import, and it stores that provider fixture id on Fixture."
        ),
        body(
          "The adapter is the only code that knows the vendor’s field names. Before the season import, it checks that player statistics are marked available for that season. If they are not, ingest stops and reports the gap. Version 1 does not add a second stats vendor, and it does not scrape Transfermarkt, Sofascore, or the league site."
        ),
        body(
          "The daily budget is 90 requests, leaving 10 in reserve. A match day spends one fixtures call plus one player-stat call per finished fixture, and the same pair again the next morning. The full player list is fetched once a week, on a day with no Ligue 1 match. Transfermarkt remains a manual reference for spellings and for the meeting that sets initial prices."
        ),

        h2("Names, images, and accounts"),
        body(
          "Club and player names are stored as text because the game cannot be played without them. Version 1 does not display LFP logos, the competition logo, club crests, or player photographs, including image URLs returned by the stats API."
        ),
        body(
          "An account is an email and a password. The password is stored only as a slow hash. The session cookie is httpOnly. A private-league join code is the secret that admits a manager to that league, so codes are random and at least 8 characters."
        ),

        h2("Properties the build has to keep"),
        bullet("arch", "Official points can be recomputed from PlayerMatchStat and the locked lineup."),
        bullet("arch", "Scoring and rivalry resolution are idempotent."),
        bullet("arch", "Deadlines are instants in UTC."),
        bullet("arch", "A failed Heist never changes the squad and always returns the reserved Influence."),

        h1("8. Screens and commands"),
        body(
          "Each screen talks to the API with the commands below. Reads are safe to repeat. Commands that change a squad, a lineup, or a rivalry action are rejected when the relevant deadline has passed."
        ),
        spacer(40),
        table(screenW, [
          headerRow(["Screen", "What the manager does", "Command"], screenW),
          dataRow(["Sign in", "Create an account or sign in.", "POST /auth/register and POST /auth/login"], screenW, false),
          dataRow(["Season", "See the next deadline and season points.", "GET /season"], screenW, true),
          dataRow(["Players", "Filter the list by club, position, and price.", "GET /players"], screenW, false),
          dataRow(["Squad", "Read the 15 players, the budget, and the club counts.", "GET /squad"], screenW, true),
          dataRow(["Transfers", "Sell one player and buy one.", "POST /transfers"], screenW, false),
          dataRow(
            ["Lineup", "Set the formation, XI, bench order, captain, vice-captain, and chip.", "PUT /lineups/{gameweek}"],
            screenW,
            true
          ),
          dataRow(
            ["Leagues", "Create a league, join with a code, and read the table.", "POST /leagues, POST /leagues/join, GET /leagues/{id}"],
            screenW,
            false
          ),
          dataRow(
            ["Rivalry", "See the slate, then lock, offer, exchange, counter, accept, refuse, or heist.", "POST /rivalry/actions and POST /rivalry/actions/{actionId}/respond"],
            screenW,
            true
          ),
          dataRow(
            ["Result", "Read the gameweek total and each player’s breakdown.", "GET /gameweeks/{gameweek}/score"],
            screenW,
            false
          ),
        ]),
        spacer(160),
        body(
          "The rivalry screen is part of the public game, and it is available only while that gameweek is open. It shows the caller’s Influence, their slate, their pending action, and each slate rival’s saved XI and bench. It does not show captains or chips. Private-league screens show match-point tables only."
        ),

        h1("9. Build slices"),
        body(
          "Each slice is playable on its own. Rivalry is last because it needs a legal squad, a locked lineup, and a league already in place. Do not start slice 5 by stubbing a random chance of success. The Heist rules are deterministic."
        ),
        spacer(40),
        table(sliceW, [
          headerRow(["Slice", "What ships", "What is still absent"], sliceW),
          dataRow(
            ["1", "Clubs, players, prices, and fixtures for 2026/27, with a read-only browser.", "Accounts and squads."],
            sliceW,
            false
          ),
          dataRow(
            ["2", "Accounts, the initial 15, market transfers, and a lineup with a deadline.", "Points."],
            sliceW,
            true
          ),
          dataRow(
            ["3", "Full-time scoring, the breakdown screen, postponed matches, and stat corrections.", "Leagues."],
            sliceW,
            false
          ),
          dataRow(
            ["4", "The overall table and private leagues with a join code. Standings are match points only.", "The slate, Lock, Offer, Exchange, and Heist."],
            sliceW,
            true
          ),
          dataRow(
            ["5", "The weekly slate, Influence, Lock, Offer, Exchange, and Heist, including the failure cases in section 3.", "Live points, bonus points, and weekly price changes."],
            sliceW,
            false
          ),
        ]),
        spacer(160),

        h1("10. Decisions still open"),
        body(
          "The numbered rules are enough to build version 1. The three items below are the ones a later edit is expected to revisit. Until that edit, the rules cited here are in force. Change the cited rule. Do not leave a second answer in a comment or in this section."
        ),
        body(
          "Version 0.3 locks the modular monolith, the local install, and the free API-Football budget. The diagrams in section 7 are part of that decision. Version 0.2 had moved rivalry onto the public slate and added Exchange."
        ),
        bullet(
          "open",
          "**Influence amounts.** Rules R4, R6, and R13 set a starting balance of 2, slate awards of 0 / 1 / 2 / 4, and a minimum bid of 2. If play shows that heists are too rare or too common, change those numbers only. Do not add a random roll to tune how often a Heist succeeds."
        ),
        bullet(
          "open",
          "**Slate size.** Rule R5 sets four places above and four places below. A later edit may change that width. It should still be a stored, mutual window on the overall rank, so a manager cannot act on the whole public game."
        ),
        bullet(
          "open",
          "**Chip boundary.** Rule B12 splits the season after gameweek 17, the halfway point of 34 matchdays. Move that boundary only if the published Ligue 1 calendar no longer has 34 matchdays."
        ),
        spacer(80),
        body(
          "Document version 0.2. The next edit should bump the version on the cover and say, in one line at the top of this section, which rule numbers changed.",
          { italics: true, color: MUTED }
        ),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = "C:\\Users\\Yacoub\\Documents\\Transfermarkt\\.sdd-build\\Ligue1-Fantasy-System-Design.docx";
  fs.writeFileSync(out, buffer);
  console.log("wrote", out, buffer.length);
});

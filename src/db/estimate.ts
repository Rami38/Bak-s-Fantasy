const NAMED: Record<string, { tenths: number; also?: string }> = {
  doue: { tenths: 135 },
  kvaratskhelia: { tenths: 145 },
  dembele: { tenths: 140 },
  barcola: { tenths: 130 },
  hakimi: { tenths: 95 },
  vitinha: { tenths: 105 },
  ruiz: { tenths: 95, also: "fabian" },
  chevalier: { tenths: 62 },
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function estimatePriceTenths(id: number, name: string, position: string): number {
  const folded = fold(name);
  const last = folded.split(/\s+/).at(-1) ?? folded;
  const named = NAMED[last];
  if (named && (!named.also || folded.includes(named.also))) return named.tenths;
  if (position === "goalkeeper") return 40 + (id % 10);
  if (position === "defender") return 42 + (id % 16);
  if (position === "midfielder") return 48 + (id % 20);
  return 55 + (id % 18);
}

export default function Sparkline({
  paceNums,
  width = 120,
  height = 28,
}: {
  paceNums: number[];
  width?: number;
  height?: number;
}) {
  if (!paceNums || paceNums.length < 2) return null;
  const min   = Math.min(...paceNums);
  const max   = Math.max(...paceNums);
  const range = max - min || 1;
  const padX  = 2, padY = 3;

  const pts = paceNums.map((s, i) => ({
    x: padX + (i / (paceNums.length - 1)) * (width - padX * 2),
    y: padY + ((s - min) / range) * (height - padY * 2),
  }));

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <line
        x1={padX} x2={width - padX}
        y1={height / 2} y2={height / 2}
        stroke="var(--rule-soft)" strokeWidth="0.75" strokeDasharray="1 2"
      />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r="2" fill="var(--accent)" />
    </svg>
  );
}

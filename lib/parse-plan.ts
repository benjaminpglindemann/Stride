export interface DayPlan {
  kind: 'quality' | 'long' | 'steady' | 'recovery' | 'rest';
  label: string;
  summary: string;
  detail: string;
}

export interface PlanTemplate {
  cycle: string;
  days: Record<string, DayPlan>;
  notes: string;
}

const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_REGEX = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b[:\s]/i;

function inferKind(text: string): DayPlan['kind'] {
  const t = text.toLowerCase();
  if (/rest/.test(t) && !/easy|recovery/.test(t)) return 'rest';
  if (/long\s*run|22km|20km|18km|16km/.test(t)) return 'long';
  if (/vo2|interval|threshold|fartlek|track|reps/.test(t)) return 'quality';
  if (/tempo|mp\+/.test(t)) return 'quality';
  if (/steady|z2|base|aerobic/.test(t)) return 'steady';
  if (/recovery|easy|z1|jog/.test(t)) return 'recovery';
  return 'steady';
}

function inferLabel(text: string): string {
  const t = text.toLowerCase();
  if (/rest/.test(t) && !/easy/.test(t)) return 'Rest';
  if (/long/.test(t)) return 'Long run';
  if (/vo2|interval/.test(t)) return 'Intervals';
  if (/threshold/.test(t)) return 'Threshold';
  if (/tempo/.test(t)) return 'Tempo';
  if (/steady/.test(t)) return 'Steady';
  if (/recovery|easy/.test(t)) return 'Recovery';
  return 'Run';
}

export function parsePlanText(planText: string): PlanTemplate {
  const lines = planText.split('\n').map(l => l.trim()).filter(Boolean);

  // First non-day line is the cycle description
  const cycle = lines.find(l => !DAY_REGEX.test(l)) ?? 'Training plan';

  const days: Record<string, DayPlan> = {};
  for (const line of lines) {
    const match = line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b[:\s]+(.+)$/i);
    if (!match) continue;
    const key = match[1].charAt(0).toUpperCase() + match[1].slice(1, 3).toLowerCase();
    const body = match[2].trim();
    days[key] = {
      kind:    inferKind(body),
      label:   inferLabel(body),
      summary: body.length > 50 ? body.slice(0, 47) + '…' : body,
      detail:  body,
    };
  }

  // Fill any missing days as rest
  for (const key of DAY_KEYS) {
    if (!days[key]) {
      days[key] = { kind: 'rest', label: 'Rest', summary: 'No session planned', detail: '' };
    }
  }

  return { cycle, days, notes: '' };
}

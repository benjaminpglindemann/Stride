export interface Athlete {
  name: string;
  initials: string;
  sport: string;
  goal: string;
  units: string;
  plan: string;
}

export interface Week {
  km: number;
  sessions: number;
  avgHr: number;
  avgCadence: number;
  bestPace: string;
  vo: number;
  avgPace: string;
  label: string;
  idx: number;
}

export interface Session {
  day: string;
  date?: string;
  type: string;
  detail: string;
  distance: number;
  pace: string;
  hr: number;
  cadence: number;
  route?: string;
}

export interface Prescription {
  type: string;
  tag: string;
  distance: string;
  paceRange: string;
  hrTarget: string;
  focus: string[];
}

export interface PlannerRec {
  type: string;
  when: string;
  distance: string;
  pace: string;
  hr: string;
  focus: string;
}

export interface Split {
  km: number;
  pace: string;
  hr: number;
  cadence: number;
  paceFrac: number;
}

export interface ParsedWorkout {
  filename: string;
  type: string;
  date: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHr: number;
  maxHr: number;
  avgCadence: number;
  elevation: number;
  verticalOscillation: number;
  groundContactTime: number;
  splits: Split[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

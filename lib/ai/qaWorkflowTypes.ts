export type QaPhase = 'intake' | 'interview' | 'review';

export type InterviewAnswer = { question: string; answer: string };
export type ScoreItem = { label: string; score: number; evidence: string; advice: string };
export type Scorecard = { items: ScoreItem[]; summary: string; provisional: boolean };

export type QaSessionState = {
  phase: QaPhase;
  intakeTurns: number;
  profileNotes: string[];
  questions: string[];
  questionIndex: number;
  followUpCount: number;
  pendingAnswer: string;
  answers: InterviewAnswer[];
  scorecard?: Scorecard;
};

export const initialQaSession: QaSessionState = {
  phase: 'intake',
  intakeTurns: 0,
  profileNotes: [],
  questions: [],
  questionIndex: 0,
  followUpCount: 0,
  pendingAnswer: '',
  answers: [],
};

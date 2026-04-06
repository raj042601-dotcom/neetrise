export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option (0-3)
  explanation: string;
  type?: string;
}

export interface Chapter {
  id: string;
  name: string;
  questions: Question[];
}

export interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

export interface QuizState {
  currentQuestionIndex: number;
  userAnswers: (number | null)[];
  isSubmitted: boolean;
  timeLeft: number;
  isStarted: boolean;
}

export interface BlogPost {
  category: string;
  title: string;
  slug: string;
  description: string;
  meta: string;
  content: string;
  id?: string;
  createdAt?: any;
}

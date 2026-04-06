import { Subject, Question } from '../types';
import allQuestionsRaw from './all_questions.json';

// Define the raw structure of the JSON
interface RawQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface RawChapter {
  chapter: string;
  questions: RawQuestion[];
}

interface RawSubject {
  subject: string;
  chapters: RawChapter[];
}

const allQuestions = allQuestionsRaw as RawSubject[];

// Helper to slugify names for IDs
const slugify = (text: string) => 
  text.toLowerCase()
    .replace(/ /g, '-')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/'/g, '')
    .replace(/&/g, 'and');

export const subjects: Subject[] = allQuestions.map(subjectRaw => ({
  id: subjectRaw.subject.toLowerCase(),
  name: subjectRaw.subject,
  chapters: subjectRaw.chapters.map((chapterRaw: RawChapter) => ({
    id: slugify(chapterRaw.chapter),
    name: chapterRaw.chapter,
    questions: chapterRaw.questions.map((q: RawQuestion, idx: number) => {
      const correctAnswerIndex = q.options.indexOf(q.answer);
      return {
        id: `${subjectRaw.subject.toLowerCase()}-${slugify(chapterRaw.chapter)}-${idx}`,
        text: q.question,
        options: q.options,
        correctAnswer: correctAnswerIndex === -1 ? 0 : correctAnswerIndex,
        explanation: q.explanation,
        type: "Conceptual"
      };
    })
  }))
}));

// Export mock arrays for backward compatibility and specific UI needs
export const mockPhysicsQuestions = subjects.find(s => s.id === 'physics')?.chapters[0]?.questions || [];
export const mockChemistryQuestions = subjects.find(s => s.id === 'chemistry')?.chapters[0]?.questions || [];
export const mockBiologyQuestions = subjects.find(s => s.id === 'biology')?.chapters[0]?.questions || [];

// Daily practice questions - a curated set of 10 questions from different subjects
export const dailyPracticeQuestions: Question[] = [
  ...(subjects.find(s => s.id === 'physics')?.chapters[0]?.questions.slice(0, 3) || []),
  ...(subjects.find(s => s.id === 'chemistry')?.chapters[0]?.questions.slice(0, 4) || []),
  ...(subjects.find(s => s.id === 'biology')?.chapters[0]?.questions.slice(0, 3) || [])
];

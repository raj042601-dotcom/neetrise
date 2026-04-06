import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, ArrowRight, ChevronLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../main';
import { subjectsMetadata } from '../data/subject_metadata';
import { Question } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ChapterSEOPage = () => {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const [chapterData, setChapterData] = useState<{ name: string; id: string; questions: Question[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug log (temporary)
  console.log("Route Params:", subjectId, chapterId);

  // Map metadata array to object for easier access
  const SUBJECT_METADATA = Object.fromEntries(subjectsMetadata.map(s => [s.id, s]));

  useEffect(() => {
    let unsubscribe: () => void;

    const loadChapterData = async () => {
      setIsLoading(true);
      try {
        const { subjects } = await import('../data/questions');
        const subject = subjects.find(s => s.id === subjectId);
        const chapter = subject?.chapters.find(c => c.id === chapterId);

        if (chapter) {
          // Fetch additional questions from Firestore
          const q = query(
            collection(db, 'subject_questions'),
            orderBy('createdAt', 'asc')
          );

          unsubscribe = onSnapshot(q, (snapshot) => {
            const firestoreQuestions = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as any))
              .filter(q => q.subjectId === subjectId && q.chapterId === chapter.id)
              .map(q => {
                const correctIdx = q.correct_option ? (q.correct_option.charCodeAt(0) - 65) : q.options.indexOf(q.answer);
                return {
                  id: q.id,
                  text: q.question,
                  options: q.options,
                  correctAnswer: correctIdx >= 0 ? correctIdx : 0,
                  explanation: q.reason || '',
                  type: "Conceptual"
                };
              });

            setChapterData({
              name: chapter.name,
              id: chapter.id,
              questions: [...chapter.questions, ...firestoreQuestions]
            });
            setIsLoading(false);
          }, (error) => {
            console.error("Error fetching firestore questions:", error);
            setChapterData({
              name: chapter.name,
              id: chapter.id,
              questions: chapter.questions
            });
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load chapter data:", error);
        setIsLoading(false);
      }
    };

    loadChapterData();
    return () => unsubscribe && unsubscribe();
  }, [subjectId, chapterId]);

  // Find subject in metadata for basic info
  const subject = SUBJECT_METADATA[subjectId || ''];
  const chapter = subject?.chapters.find(ch => ch.id === chapterId);

  if (!isLoading && !subject) return <div className="py-20 text-center">Subject Not Found</div>;
  if (!isLoading && !chapter) return <div className="py-20 text-center">Chapter Not Found</div>;
  
  const formatTitle = (id: string) => {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const chapterName = chapterData?.name || (chapter ? chapter.name : formatTitle(chapterId || ''));
  const questions = chapterData?.questions || [];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Loading Chapter Content...</h2>
      </div>
    );
  }

  // SEO dynamic content
  const pageTitle = `NEET ${chapterName} NCERT-Based Questions with Solutions 2026`;
  const pageDescription = `Practice NEET ${chapterName} NCERT-based questions with answers. Comprehensive MCQ bank with detailed explanations for NEET 2026 preparation.`;

  if (!subject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subject Not Found</h1>
        <Link to="/subjects" className="mt-4 text-blue-600 hover:underline">Back to Subjects</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>

      {/* Breadcrumbs */}
      <div className="mb-8 flex items-center gap-3">
        <Link to={`/subject/${subjectId}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
          <ChevronLeft size={16} />
        </Link>
        <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-wider">
          <Link to="/subjects" className="hover:underline">NEETRise</Link>
          <span className="text-slate-300">/</span>
          <Link to={`/subject/${subjectId}`} className="hover:underline">{subject.name}</Link>
        </div>
      </div>

      {/* Header Section */}
      <div className="mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          NEET {chapterName} NCERT-Based Questions
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Master {chapterName} for NEET 2026 with our curated collection of NCERT-based questions. 
          Each question is strictly based on the NCERT pattern and includes detailed solutions to help you understand the core concepts.
        </p>
        
        {chapterData && (
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={`/quiz/${subjectId}/${chapterData.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-95"
            >
              Start Quiz Mode
              <ArrowRight size={18} />
            </Link>
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <BookOpen size={18} />
              {questions.length} Questions Available
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-10">
        {questions.length > 0 ? (
          questions.map((question, index) => (
            <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  Question {index + 1}
                </span>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <Info size={14} />
                  <span>NEET Pattern</span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold leading-relaxed text-slate-900 dark:text-white whitespace-pre-wrap">
                {question.text}
              </h3>
              
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {question.options.map((option, optIndex) => (
                  <div 
                    key={optIndex}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-sm font-medium",
                      optIndex === question.correctAnswer
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                      optIndex === question.correctAnswer
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                    )}>
                      {String.fromCharCode(65 + optIndex)}
                    </div>
                    {option}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Correct Answer: {String.fromCharCode(65 + question.correctAnswer)}</span>
                </div>
                {question.explanation && (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                    {question.explanation}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Questions Coming Soon</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              We are currently updating our question bank for this chapter. Check back soon for the latest NCERT-based questions.
            </p>
            <Link to={`/subject/${subjectId}`} className="mt-6 inline-flex items-center gap-2 font-bold text-blue-600 hover:underline">
              Explore Other Chapters <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-20 rounded-[2rem] bg-slate-950 p-8 text-center text-white sm:p-16 dark:bg-blue-950/20">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to test your knowledge?</h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Practice makes perfect. Take a timed quiz on {chapterName} to simulate the real NEET exam environment.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to={chapterData ? `/quiz/${subjectId}/${chapterData.id}` : `/subject/${subjectId}`}
            className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white transition-all hover:bg-blue-500 active:scale-95"
          >
            Start Practice Quiz
          </Link>
          <Link
            to="/subjects"
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition-all hover:bg-white/10"
          >
            Browse All Subjects
          </Link>
        </div>
      </div>

      {/* Chapter Quick Access */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">More {subject.name} NCERT Questions</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Quick access to other chapters for {subject.name}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {subject.chapters.slice(0, 6).map((ch) => (
            <Link
              key={ch.id}
              to={`/subject/${subjectId}/${ch.id}`}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-bold transition-all",
                ch.id === chapterId
                  ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
              )}
            >
              {ch.name} NCERT
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-20 border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Access to Other Subjects</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Switch between subjects to explore more NEET preparation material.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {subjectsMetadata.map((s) => (
            <Link
              key={s.id}
              to={`/subject/${s.id}`}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-6 transition-all hover:shadow-lg",
                s.id === subjectId 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" 
                  : "border-slate-200 bg-white hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
              )}
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg",
                s.id === 'physics' ? "bg-blue-600" : s.id === 'chemistry' ? "bg-emerald-600" : "bg-purple-600"
              )}>
                <BookOpen size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{s.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.chapters.length} Chapters</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChapterSEOPage;

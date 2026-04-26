import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Home as HomeIcon, 
  LayoutDashboard, 
  Menu, 
  Moon, 
  Sun, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  BarChart3, 
  Zap,
  Info,
  ArrowRight,
  Dna,
  Atom,
  FlaskConical,
  Stethoscope,
  Star,
  Check,
  Search,
  Edit,
  Trash2,
  Plus,
  FileText,
  Save,
  Lock,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './main';
import ChapterSEOPage from './components/ChapterSEOPage';
import { subjects, mockPhysicsQuestions, mockChemistryQuestions, mockBiologyQuestions, dailyPracticeQuestions } from './data/questions';
import { Question, Chapter, Subject, QuizState, BlogPost } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const CHAPTER_SEO_LIST: Record<string, string[]> = {
  physics: [
    "units-and-measurements",
    "motion-in-a-straight-line",
    "motion-in-a-plane",
    "laws-of-motion",
    "work-energy-and-power",
    "system-of-particles-and-rotational-motion",
    "gravitation",
    "mechanical-properties-of-solids",
    "mechanical-properties-of-fluids",
    "thermal-properties-of-matter",
    "thermodynamics",
    "kinetic-theory",
    "oscillations",
    "waves"
  ],
  chemistry: [
    "some-basic-concepts-of-chemistry",
    "structure-of-atom",
    "periodic-table",
    "chemical-bonding-and-molecular-structure",
    "states-of-matter",
    "thermodynamics",
    "equilibrium",
    "redox-reactions",
    "hydrogen",
    "s-block-elements",
    "p-block-elements",
    "general-organic-chemistry-goc",
    "hydrocarbons",
    "environmental-chemistry"
  ],
  biology: [
    "the-living-world",
    "biological-classification",
    "plant-kingdom",
    "animal-kingdom",
    "morphology-of-flowering-plants",
    "anatomy-of-flowering-plants",
    "structural-organisation-in-animals",
    "cell:-the-unit-of-life",
    "biomolecules",
    "cell-cycle-and-cell-division",
    "transport-in-plants",
    "mineral-nutrition",
    "photosynthesis",
    "respiration-in-plants",
    "plant-growth-and-development",
    "digestion-and-absorption",
    "breathing-and-exchange-of-gases",
    "body-fluids-and-circulation",
    "excretory-products-and-elimination",
    "locomotion-and-movement",
    "neural-control-and-coordination",
    "chemical-coordination-and-integration"
  ]
};

// --- Hooks ---
function useBlogs() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    try {
      const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const fetchedBlogs = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Link Correction: Replace neet@nta.ac.in with https://neet.nta.nic.in/
            const sanitize = (text: any) => typeof text === 'string' ? text.replace(/neet@nta\.ac\.in/g, 'https://neet.nta.nic.in/') : text;

            return {
              id: doc.id,
              ...data,
              title: sanitize(data.title),
              description: sanitize(data.description),
              content: sanitize(data.content),
              formattedDate: data?.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : 'Recently Updated'
            };
          }) as any[];
          
          setBlogs(fetchedBlogs);
          setLoading(false);
        } catch (err) {
          console.error("Error processing blog snapshot:", err);
          setLoading(false);
        }
      }, (error) => {
        console.error("Error fetching blogs:", error);
        setBlogs([]);
        setLoading(false);
      });
    } catch (err) {
      console.error("Error setting up blog listener:", err);
      setLoading(false);
    }

    return () => unsubscribe && unsubscribe();
  }, []);

  return { blogs, loading };
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- Components ---

// --- Streak Logic ---
const updateStreak = () => {
  const today = new Date().toISOString().split('T')[0];
  const lastActiveDate = localStorage.getItem('lastActiveDate');
  const streakCount = parseInt(localStorage.getItem('streakCount') || '0', 10);

  if (!lastActiveDate) {
    localStorage.setItem('lastActiveDate', today);
    localStorage.setItem('streakCount', '1');
    window.dispatchEvent(new Event('streakUpdated'));
    return;
  }

  if (lastActiveDate === today) {
    return;
  }

  const lastDate = new Date(lastActiveDate);
  const currentDate = new Date(today);
  const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    localStorage.setItem('streakCount', (streakCount + 1).toString());
  } else {
    localStorage.setItem('streakCount', '1');
  }
  
  localStorage.setItem('lastActiveDate', today);
  window.dispatchEvent(new Event('streakUpdated'));
};

const Streak = () => {
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('streakCount') || '0', 10));

  useEffect(() => {
    const handleUpdate = () => {
      setStreak(parseInt(localStorage.getItem('streakCount') || '0', 10));
    };

    window.addEventListener('streakUpdated', handleUpdate);
    return () => window.removeEventListener('streakUpdated', handleUpdate);
  }, []);

  if (streak === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600 sm:gap-1.5 sm:px-3 sm:text-sm dark:bg-orange-900/30 dark:text-orange-400">
      <span>🔥</span>
      <span>{streak}<span className="hidden sm:inline"> Day Streak</span></span>
    </div>
  );
};

const BookmarkButton = ({ questionId }: { questionId: string }) => {
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>('bookmarks', []);
  const isBookmarked = bookmarks.includes(questionId);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarked) {
      setBookmarks(bookmarks.filter(id => id !== questionId));
    } else {
      setBookmarks([...bookmarks, questionId]);
    }
  };

  return (
    <button
      onClick={toggleBookmark}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-90",
        isBookmarked 
          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
          : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
      )}
      title={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
    >
      <Star size={20} fill={isBookmarked ? "currentColor" : "none"} />
    </button>
  );
};

const SavedQuestions = () => {
  const [bookmarks] = useLocalStorage<string[]>('bookmarks', []);
  const allQuestions = useMemo(() => {
    try {
      return subjects?.flatMap(s => s?.chapters?.flatMap(c => c?.questions || []) || []) || [];
    } catch (err) {
      console.error("Error flattening questions:", err);
      return [];
    }
  }, []);
  const savedQuestions = allQuestions.filter(q => bookmarks?.includes(q?.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 min-h-stable">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">My Library</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Saved Questions</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Review your bookmarked questions for quick revision.</p>
      </div>

      {savedQuestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Star size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Saved Questions</h2>
          <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
            Bookmark questions during practice to see them here for later review.
          </p>
          <Link to="/subjects" className="mt-8 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700">
            Start Practice
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {savedQuestions.map((question, index) => (
            <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  Question {index + 1}
                </span>
                <BookmarkButton questionId={question.id} />
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
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                  {question.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = ({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Subjects', path: '/subjects', icon: BookOpen },
    { name: 'Mock Test', path: '/mock-test', icon: LayoutDashboard },
    { name: 'Daily Practice', path: '/daily-practice', icon: Clock },
    { name: 'Blogs', path: '/blog', icon: FileText },
    { name: 'About', path: '/about', icon: Info },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/70">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110">
            <BookOpen className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <span className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            NEET<span className="text-blue-600">Rise</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <Streak />
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-500",
                location.pathname === link.path
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              {link.name}
              {location.pathname === link.path && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400"
                />
              )}
            </Link>
          ))}
          <div className="ml-4 flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-800">
            <button
              onClick={toggleDarkMode}
              className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link 
              to="/subjects"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1.5 sm:gap-3 lg:hidden">
          <Streak />
          <button
            onClick={toggleDarkMode}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 sm:p-2.5 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun size={18} className="sm:size-5" /> : <Moon size={18} className="sm:size-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 sm:p-2.5 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isOpen ? <X size={20} className="sm:size-6" /> : <Menu size={20} className="sm:size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-0 right-0 top-full border-b bg-white p-4 shadow-2xl lg:hidden dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-bold transition-all",
                    location.pathname === link.path
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  <link.icon size={22} />
                  {link.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-24 sm:py-40">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(64rem_64rem_at_top,theme(colors.blue.100),transparent)] dark:bg-[radial-gradient(64rem_64rem_at_top,theme(colors.blue.950),transparent)]" />
      <div className="absolute inset-0 -z-10 bg-[grid-slate-100/[0.03]] bg-[center_top_-1px] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:bg-[grid-slate-900/[0.05]]" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-600 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400"
          >
            <Zap size={16} />
            <span>Built for Serious NEET Aspirants</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-7xl dark:text-white"
          >
            NEETRise – Free NEET Practice & <br className="hidden sm:block" />
            <span className="text-gradient">Mock Tests</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 sm:mt-8 max-w-3xl text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-400"
          >
            Practice NEET mock tests, previous year questions, and chapter-wise MCQs based on NCERT.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-4 max-w-2xl text-base text-slate-500 dark:text-slate-500"
          >
            Improve accuracy, speed, and confidence with smart practice.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto"
          >
            <Link
              to="/subjects"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold text-white shadow-2xl transition-all hover:bg-slate-800 hover:shadow-blue-500/20 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500 w-full sm:w-auto"
            >
              Start Free Practice
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              to="/mock-test" 
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 w-full sm:w-auto"
            >
              Take Mock Test
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ title, description, icon: Icon, color, path }: { title: string; description: string; icon: any; color: string; path: string }) => {
  return (
    <Link to={path} className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:border-blue-500 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500">
      <div className={cn("mb-8 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xl transition-transform group-hover:scale-110", color)}>
        <Icon size={32} />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      <div className="mt-8 flex items-center gap-2 text-sm font-bold text-blue-600">
        Explore Module <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

const BlogSection = () => {
  const { blogs, loading } = useBlogs();
  
  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-slate-950 cv-auto">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-left">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            NEET Preparation Blogs
          </h2>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Expert strategies, study plans, and preparation tips to crack NEET effectively
          </p>
        </div>

        {loading ? (
          <div className="space-y-8 min-h-[400px]">
            {[1, 2, 3].map(i => (
              <div key={i} className="py-8 first:pt-0">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No blogs found. Check back later!</div>
        ) : (
          <div className="space-y-0">
            {blogs.slice(0, 3).map((post, index) => (
              <div key={post.slug || (post as any).id} className="group relative py-8 first:pt-0 last:pb-0">
                {index !== 0 && <div className="absolute top-0 left-0 right-0 h-px bg-slate-100 dark:bg-slate-800" />}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                    {post.category}
                  </span>
                  <Link 
                    to={`/blog/${post.slug || (post as any).id}`}
                    className="inline-block group-hover:text-blue-600 transition-colors"
                  >
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white decoration-blue-600/30 underline-offset-4 group-hover:underline">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="mt-2 text-base leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                    {post.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                    <span>{post.meta}</span>
                    <span>•</span>
                    <span>{(post as any).formattedDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-center sm:justify-end">
          <Link 
            to="/blog" 
            className="group relative inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            View All Blogs
            <span className="transition-transform group-hover:translate-x-1">→</span>
            <div className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
          </Link>
        </div>
      </div>
    </section>
  );
};

const AllBlogsPage = () => {
  const { blogs, loading } = useBlogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'STRATEGY', 'BOOKS', 'TIPS', 'MISTAKES', 'NEWS'];

  const filteredBlogs = blogs.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 min-h-stable">
      <div className="mb-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-6">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          All NEETRise Blogs
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Expert advice, study strategies, and the latest updates for NEET 2026 aspirants.
        </p>
      </div>

      <div className="mb-10 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-lg focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-all",
                selectedCategory === cat 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={cn("space-y-8 skeleton-container")}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="text-center py-20 min-h-[400px]">
          <p className="text-xl text-slate-500">No blogs found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-8 dynamic-section">
          {filteredBlogs.map((post) => (
            <div key={post.slug || (post as any).id} className="group relative rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:border-blue-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  {post.category}
                </span>
                <Link 
                  to={`/blog/${post.slug || (post as any).id}`}
                  className="inline-block group-hover:text-blue-600 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:underline decoration-blue-600/30 underline-offset-4">
                    {post.title}
                  </h2>
                </Link>
                <p className="mt-2 text-base leading-relaxed text-slate-500 dark:text-slate-400">
                  {post.description}
                </p>
                <div className="mt-4 meta-row text-xs font-medium text-slate-400 dark:text-slate-500">
                  <span>{post.meta}</span>
                  <span className="mx-2">•</span>
                  <span>{(post as any).formattedDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800", className)} />
);

const BlogPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { blogs, loading } = useBlogs();
  const post = blogs.find(p => (p.slug === slug) || ((p as any).id === slug));

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 min-h-stable skeleton-container">
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="mt-6 flex gap-4 meta-row">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4 prose prose-slate dark:prose-invert">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <div className="pt-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) return <div className="py-20 text-center min-h-[70vh]">Blog post not found</div>;

  // Extract first image URL for LCP optimization
  const firstImageMatch = post.content.match(/!\[.*?\]\((.*?)\)/);
  const firstImageUrl = firstImageMatch ? firstImageMatch[1] : null;

  let imageCount = 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 min-h-stable">
      <Helmet>
        <title>{post.title} - NEETRise Blog</title>
        <meta name="description" content={post.description} />
        {firstImageUrl && (
          <link rel="preload" as="image" href={firstImageUrl} fetchPriority="high" />
        )}
      </Helmet>
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-6">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <span className="block text-xs font-bold tracking-widest text-slate-400 uppercase mb-3">
          {post.category}
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {post.title}
        </h1>
        <div className="mt-6 meta-row text-sm text-slate-500 dark:text-slate-400">
          <span>{post.meta}</span>
          <span className="mx-2">•</span>
          <span>{(post as any).formattedDate}</span>
        </div>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-300 italic mb-8">
          {post.description}
        </p>
        <div className="space-y-6 text-lg leading-relaxed text-slate-700 dark:text-slate-400">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ node, ...props }) => {
                const isFirst = props.src === firstImageUrl;
                return (
                  <img 
                    {...props} 
                    width="800"
                    height="450"
                    loading={isFirst ? "eager" : "lazy"}
                    fetchPriority={isFirst ? "high" : "low"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="rounded-2xl shadow-lg my-8 w-full h-auto aspect-video object-cover"
                  />
                );
              },
              a: ({ node, ...props }) => (
                <a 
                  {...props} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline font-medium hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors break-all"
                />
              )
            }}
          >
            {post.content}
          </Markdown>
        </div>
      </div>

      {/* Explore More Articles Section */}
      <div className="mt-16 border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="rounded-3xl border border-slate-200 p-8 text-center dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            📘 Explore More Articles
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Discover more NEET preparation blogs, strategies, and chapter-wise guides.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
          >
            View All Blogs
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>

      {/* Practice CTA Section */}
      <div className="mt-16 border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="rounded-3xl bg-slate-50 p-8 text-center dark:bg-slate-900/50">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Ready to Practice?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            Put your knowledge to the test with our comprehensive NCERT-based question bank.
          </p>
          <Link
            to="/subjects"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
          >
            Get Started
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "What is NEETRise?",
      a: "NEETRise is a free online platform for NEET aspirants that provides NCERT-based MCQs, chapter-wise practice, and mock tests for Physics, Chemistry, and Biology."
    },
    {
      q: "Is NEETRise free to use?",
      a: "Yes, NEETRise is completely free. There are no hidden charges, subscriptions, or login requirements for practice."
    },
    {
      q: "Are the questions based on NCERT?",
      a: "Yes, all questions on NEETRise are strictly based on NCERT, which is essential for cracking NEET."
    },
    {
      q: "How many questions are available on NEETRise?",
      a: "NEETRise offers hundreds of MCQs across all NEET chapters, and new questions are added regularly."
    },
    {
      q: "Can I practice chapter-wise questions?",
      a: "Yes, you can practice chapter-wise MCQs for all subjects including Physics, Chemistry, and Biology."
    },
    {
      q: "Does NEETRise provide mock tests?",
      a: "Yes, NEETRise includes mock tests designed according to the NEET exam pattern to help improve accuracy and speed."
    },
    {
      q: "Do I need to sign up to use NEETRise?",
      a: "No, you can start practicing instantly without any registration."
    },
    {
      q: "Is NEETRise useful for NEET 2026 preparation?",
      a: "Yes, NEETRise is designed specifically for NEET 2026 aspirants with updated and relevant practice questions."
    },
    {
      q: "Does NEETRise provide solutions?",
      a: "Yes, each question includes a detailed solution to help you understand the concept clearly."
    },
    {
      q: "Which subjects are covered on NEETRise?",
      a: "NEETRise covers all three major subjects: Physics, Chemistry, and Biology."
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/50 cv-auto">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Everything you need to know about NEETRise and your NEET preparation.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={false}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="text-lg font-bold text-slate-900 dark:text-white">{faq.q}</span>
                <ChevronRight
                  size={20}
                  className={cn(
                    "text-slate-400 transition-transform duration-300",
                    openIndex === index && "rotate-90"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="border-t border-slate-100 p-6 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const [scores] = useLocalStorage<any[]>('neet-scores', []);
  const recentScores = [...scores].reverse().slice(0, 3);

  return (
    <div className="pb-20">
      <Helmet>
        <title>NEETRise - Free NEET Practice & Mock Tests</title>
        <meta name="description" content="Practice NEET mock tests, previous year questions, and chapter-wise MCQs based on NCERT. Improve accuracy, speed, and confidence with smart practice." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is NEETRise?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "NEETRise is a free online platform for NEET aspirants that provides NCERT-based MCQs, chapter-wise practice, and mock tests for Physics, Chemistry, and Biology."
                }
              },
              {
                "@type": "Question",
                "name": "Is NEETRise free to use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, NEETRise is completely free. There are no hidden charges, subscriptions, or login requirements for practice."
                }
              },
              {
                "@type": "Question",
                "name": "Are the questions based on NCERT?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, all questions on NEETRise are strictly based on NCERT, which is essential for cracking NEET."
                }
              },
              {
                "@type": "Question",
                "name": "How many questions are available on NEETRise?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "NEETRise offers hundreds of MCQs across all NEET chapters, and new questions are added regularly."
                }
              },
              {
                "@type": "Question",
                "name": "Can I practice chapter-wise questions?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, you can practice chapter-wise MCQs for all subjects including Physics, Chemistry, and Biology."
                }
              },
              {
                "@type": "Question",
                "name": "Does NEETRise provide mock tests?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, NEETRise includes mock tests designed according to the NEET exam pattern to help improve accuracy and speed."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need to sign up to use NEETRise?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, you can start practicing instantly without any registration."
                }
              },
              {
                "@type": "Question",
                "name": "Is NEETRise useful for NEET 2026 preparation?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, NEETRise is designed specifically for NEET 2026 aspirants with updated and relevant practice questions."
                }
              },
              {
                "@type": "Question",
                "name": "Does NEETRise provide solutions?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, each question includes a detailed solution to help you understand the concept clearly."
                }
              },
              {
                "@type": "Question",
                "name": "Which subjects are covered on NEETRise?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "NEETRise covers all three major subjects: Physics, Chemistry, and Biology."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <Hero />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard 
            title="Mock Tests" 
            description="Full-length tests simulating the real NEET exam environment."
            icon={LayoutDashboard}
            color="bg-purple-600 shadow-purple-500/20"
            path="/mock-test"
          />
          <FeatureCard 
            title="Rank Predictor" 
            description="Estimate your potential NEET rank based on test scores."
            icon={BarChart3}
            color="bg-emerald-600 shadow-emerald-500/20"
            path="/rank-predictor"
          />
          <FeatureCard 
            title="Daily Practice" 
            description="10 fresh questions every day to keep your streak alive."
            icon={Clock}
            color="bg-orange-600 shadow-orange-500/20"
            path="/daily-practice"
          />
        </div>

        <div className="mt-12 sm:mt-24">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Explore by Subject</h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 px-4">Deep dive into each subject with previous NEET practice modules.</p>
          </div>
          <div className="grid gap-4 sm:gap-8 sm:grid-cols-3">
            {subjects.filter(s => s.id !== 'pyq').map((subject) => (
              <Link
                key={subject.id}
                to={`/subject/${subject.id}`}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 transition-all hover:border-blue-500 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 sm:mb-6 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
                  <BookOpen size={24} className="sm:hidden" />
                  <BookOpen size={28} className="hidden sm:block" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{subject.name}</h3>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">{subject.chapters.length} Chapters • NCERT Based</p>
                <div className="mt-6 sm:mt-8 flex items-center gap-2 text-sm font-bold text-blue-600">
                  Start Learning <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {recentScores.length > 0 && (
          <div className="mt-12 sm:mt-24">
            <div className="mb-8 sm:mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Recent Performance</h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">Track your progress and identify areas for improvement.</p>
              </div>
              <Link 
                to="/history" 
                className="group relative inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                View All History
                <span className="transition-transform group-hover:translate-x-1">→</span>
                <div className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
              </Link>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:block dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                  <tr>
                    <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">Test Module</th>
                    <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">NEET Score</th>
                    <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">Completion Date</th>
                    <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentScores.map((score) => score && (
                    <tr key={score.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Zap size={18} />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white capitalize">
                            {score.type} {score.subjectId ? `• ${score.subjectId}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div 
                              className="h-full bg-blue-600" 
                              style={{ width: `${(score.score / score.total) * 100}%` }} 
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {score.score}/{score.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <Link to={`/history/${score.id}`} className="text-sm font-bold text-blue-600 hover:underline">Details</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-3 sm:gap-4 md:hidden">
              {recentScores.map((score) => score && (
                <Link key={score.id} to={`/history/${score.id}`} className="block rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Zap size={16} className="sm:hidden" />
                        <Zap size={18} className="hidden sm:block" />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white capitalize">
                        {score.type}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                      {new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {score.subjectId && (
                    <div className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                      Subject: <span className="text-slate-900 dark:text-white capitalize">{score.subjectId}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-400">NEET Score</span>
                      <span className="font-bold text-slate-900 dark:text-white">{score.score}/{score.total}</span>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${(score.score / score.total) * 100}%` }} 
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BlogSection />
      <FAQSection />
    </div>
  );
};

const SubjectPage = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [firestoreCounts, setFirestoreCounts] = useState<Record<string, number>>({});
  const subject = subjects.find(s => s.id === subjectId);

  useEffect(() => {
    if (!subjectId) return;
    let unsubscribe: () => void;
    
    try {
      const q = query(collection(db, 'subject_questions'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const counts: Record<string, number> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data?.subjectId === subjectId) {
              counts[data.chapterId] = (counts[data.chapterId] || 0) + 1;
            }
          });
          setFirestoreCounts(counts);
        } catch (err) {
          console.error("Error processing subject questions snapshot:", err);
        }
      }, (error) => {
        console.error("Error fetching firestore counts:", error);
      });
    } catch (err) {
      console.error("Error setting up subject questions listener:", err);
    }
    
    return () => unsubscribe && unsubscribe();
  }, [subjectId]);

  if (!subject) return <div className="py-20 text-center">Subject not found</div>;

  const filteredChapters = subject.chapters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const seoChapters = CHAPTER_SEO_LIST[subjectId || ''] || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 min-h-stable">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Subject Syllabus</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{subject.name}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Complete coverage of NCERT {subject.name} for NEET.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          <BookOpen className="absolute left-3 top-3 text-slate-400" size={18} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredChapters.map((chapter) => (
          <motion.div
            key={chapter.id}
            whileHover={{ y: -2 }}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <h3 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                {chapter.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {(chapter.questions.length + (firestoreCounts[chapter.id] || 0))} Questions • Level: NEET
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to={`/quiz/${subject.id}/${chapter.id}`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                Start Practice
              </Link>
              <Link
                to={`/subject/${subject.id}/${chapter.id}`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-slate-50 px-4 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
              >
                NCERT Questions
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Chapter-wise NCERT Questions</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Quick access to NCERT-based questions for {subject.name}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {subject.chapters.slice(0, 6).map((ch) => (
            <Link
              key={ch.id}
              to={`/subject/${subject.id}/${ch.id}`}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition-all hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              {ch.name} NCERT
            </Link>
          ))}
        </div>
      </div>

      {filteredChapters.length === 0 && (
        <div className="py-20 text-center text-slate-500">No chapters found matching your search.</div>
      )}
    </div>
  );
};

const SubjectQuestionsPage = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'subject_questions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Subject <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Questions</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Practice with our curated list of subject-specific questions.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {subjects.find(s => s.id === q.subjectId)?.name || q.subjectId}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {subjects.find(s => s.id === q.subjectId)?.chapters.find(c => c.id === q.chapterId)?.name || q.chapterId}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Question {questions.length - idx}
                </span>
              </div>
              <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">{q.question}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {q.options.map((opt: string, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-2xl border border-slate-100 p-4 text-slate-700 dark:border-slate-800 dark:text-slate-300",
                      String.fromCharCode(65 + i) === q.answer && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                    )}
                  >
                    <span className="mr-2 font-bold text-slate-400">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </div>
                ))}
              </div>
              {q.reason && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white">Explanation:</span> {q.reason}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
          {questions.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
              <p className="text-slate-500">No questions added yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Quiz = ({ type = 'chapter' }: { type?: 'chapter' | 'mock' | 'daily' }) => {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const navigate = useNavigate();
  
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    userAnswers: [],
    isSubmitted: false,
    timeLeft: type === 'mock' ? 3600 : type === 'daily' ? 600 : 3600, // 1 hour for mock, 10 mins for daily, 1 hour for chapter
    isStarted: false,
  });

  const [scores, setScores] = useLocalStorage<any>('neet-scores', []);

  useEffect(() => {
    let unsubscribe: () => void;

    // Reset state when type or route changes
    setIsLoading(true);
    setState({
      currentQuestionIndex: 0,
      userAnswers: [],
      isSubmitted: false,
      timeLeft: type === 'mock' ? 3600 : type === 'daily' ? 600 : 3600,
      isStarted: false,
    });
    setQuizQuestions([]);

    const fetchQuestions = async () => {
      try {
        if (type === 'chapter') {
          const q = query(
            collection(db, 'subject_questions'),
            orderBy('createdAt', 'asc')
          );
          
          unsubscribe = onSnapshot(q, (snapshot) => {
            try {
              const firestoreQuestions = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(q => q?.subjectId === subjectId && q?.chapterId === chapterId)
                .map(q => {
                  const correctIdx = q?.correct_option ? (q.correct_option.charCodeAt(0) - 65) : q?.options?.indexOf(q?.answer);
                  return {
                    id: q?.id,
                    text: q?.question || '',
                    options: q?.options || [],
                    correctAnswer: correctIdx >= 0 ? correctIdx : 0,
                    explanation: q?.reason || ''
                  };
                });

              const subject = subjects.find(s => s.id === subjectId);
              const chapter = subject?.chapters?.find(c => c.id === chapterId);
              const hardcodedQuestions = chapter?.questions || [];
              
              const questions = [...hardcodedQuestions, ...firestoreQuestions];
              setQuizQuestions(questions);
              setIsLoading(false);
              setState(prev => ({ 
                ...prev, 
                userAnswers: prev.userAnswers.length === questions.length ? prev.userAnswers : new Array(questions.length).fill(null)
              }));
            } catch (err) {
              console.error("Error processing chapter quiz snapshot:", err);
              setIsLoading(false);
            }
          }, (error) => {
            console.error("Firestore snapshot error:", error);
            setIsLoading(false);
          });
        } else {
          const collectionName = type === 'mock' ? 'mock_tests' : 'daily_practice';
          const q = query(collection(db, collectionName));
          
          unsubscribe = onSnapshot(q, (snapshot) => {
            try {
              const questions = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .sort((a, b) => {
                  const aNum = parseInt(a?.id?.replace(/\D/g, '') || '0');
                  const bNum = parseInt(b?.id?.replace(/\D/g, '') || '0');
                  return aNum - bNum;
                })
                .map(q => {
                  const correctIdx = q?.correct_option ? (q.correct_option.charCodeAt(0) - 65) : q?.options?.indexOf(q?.answer);
                  return {
                    id: q?.id,
                    text: q?.question || '',
                    options: q?.options || [],
                    correctAnswer: correctIdx >= 0 ? correctIdx : 0,
                    explanation: q?.reason || ''
                  };
                });

              setQuizQuestions(questions);
              setIsLoading(false);
              setState(prev => ({ 
                ...prev, 
                userAnswers: prev.userAnswers.length === questions.length ? prev.userAnswers : new Array(questions.length).fill(null)
              }));
            } catch (err) {
              console.error("Error processing quiz snapshot:", err);
              setIsLoading(false);
            }
          }, (error) => {
            console.error("Firestore snapshot error:", error);
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.error("Error in fetchQuestions:", err);
        setIsLoading(false);
      }
    };

    fetchQuestions();
    return () => unsubscribe && unsubscribe();
  }, [subjectId, chapterId, type]);

  useEffect(() => {
    const shouldTimerRun = type === 'chapter' ? true : state.isStarted;
    if (state.timeLeft > 0 && !state.isSubmitted && shouldTimerRun) {
      const timer = setInterval(() => {
        setState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearInterval(timer);
    } else if (state.timeLeft === 0 && !state.isSubmitted) {
      handleSubmit();
    }
  }, [state.timeLeft, state.isSubmitted, state.isStarted, type]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.currentQuestionIndex, state.isSubmitted]);

  const handleAnswer = (optionIndex: number) => {
    if (state.isSubmitted) return;
    updateStreak();
    const newAnswers = [...state.userAnswers];
    newAnswers[state.currentQuestionIndex] = optionIndex;
    setState(prev => ({ ...prev, userAnswers: newAnswers, isStarted: true }));
  };

  const handleSubmit = () => {
    setState(prev => ({ ...prev, isSubmitted: true }));
    
    const stats = state.userAnswers.reduce((acc, ans, idx) => {
      if (ans === null) acc.unattempted++;
      else if (ans === quizQuestions[idx].correctAnswer) acc.correct++;
      else acc.incorrect++;
      return acc;
    }, { correct: 0, incorrect: 0, unattempted: 0 });

    const neetScore = (stats.correct * 4) - (stats.incorrect * 1);
    const totalPossible = quizQuestions.length * 4;

    const newScore = {
      id: Date.now(),
      type,
      subjectId,
      chapterId,
      score: neetScore,
      total: totalPossible,
      stats,
      date: new Date().toISOString(),
    };
    setScores([...scores, newScore]);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-500 animate-pulse">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (quizQuestions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
          <BookOpen size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Questions Not Found</h2>
        <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
          We couldn't find any questions for this module. Please try another chapter or contact support.
        </p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-8 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = quizQuestions[state.currentQuestionIndex];
  
  if (!currentQuestion && quizQuestions.length > 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const progress = ((state.currentQuestionIndex + 1) / quizQuestions.length) * 100;
  const currentSubject = subjects.find(s => s.id === subjectId);
  const currentChapter = currentSubject?.chapters.find(c => c.id === chapterId);

  if (state.isSubmitted) {
    const stats = state.userAnswers.reduce((acc, ans, idx) => {
      if (ans === null) acc.unattempted++;
      else if (ans === quizQuestions[idx].correctAnswer) acc.correct++;
      else acc.incorrect++;
      return acc;
    }, { correct: 0, incorrect: 0, unattempted: 0 });

    const neetScore = (stats.correct * 4) - (stats.incorrect * 1);
    const totalPossible = quizQuestions.length * 4;

    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Trophy size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Quiz Completed!</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Here's how you performed</p>
          
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">NEET Score</p>
              <p className="text-2xl font-bold text-blue-600">{neetScore}/{totalPossible}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">Correct</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.correct}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">Incorrect</p>
              <p className="text-2xl font-bold text-red-600">{stats.incorrect}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">Unattempted</p>
              <p className="text-2xl font-bold text-slate-600">{stats.unattempted}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500">Time Taken</p>
              <p className="text-2xl font-bold text-orange-600">{formatTime((type === 'mock' ? 3600 : type === 'daily' ? 600 : 3600) - state.timeLeft)}</p>
            </div>
          </div>

          <div className="mt-10 space-y-8 text-left">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detailed Analysis</h3>
            {quizQuestions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border p-6 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                      {idx + 1}
                    </span>
                    <BookmarkButton questionId={q.id} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white whitespace-pre-wrap">{q.text}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oIdx) => (
                        <div 
                          key={oIdx}
                          className={cn(
                            "rounded-xl border p-3 text-sm",
                            oIdx === q.correctAnswer ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : 
                            oIdx === state.userAnswers[idx] ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : 
                            "border-slate-200 dark:border-slate-800"
                          )}
                        >
                          <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      <p className="font-bold">Explanation:</p>
                      <p className="mt-1">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="rounded-xl border border-slate-200 px-6 py-3 font-semibold transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              Back to Home
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Retake Quiz
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Quiz Header */}
      <div className="sticky top-0 z-20 border-b bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {type === 'mock' ? 'Full Mock Test' : type === 'daily' ? 'Daily Practice' : currentChapter?.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Question {state.currentQuestionIndex + 1} of {quizQuestions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-bold",
              state.timeLeft < 300 && state.isStarted ? "bg-red-50 text-red-600 animate-pulse dark:bg-red-900/20" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            )}>
              <Clock size={16} />
              {type !== 'chapter' && !state.isStarted ? "Ready" : formatTime(state.timeLeft)}
            </div>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <motion.div
              key={state.currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {currentQuestion.id.length < 8 ? `Question ${currentQuestion.id}` : `Question ${state.currentQuestionIndex + 1}`}
                  </span>
                  <BookmarkButton questionId={currentQuestion.id} />
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Marks: +4 / -1
                </span>
              </div>

              <h3 className="text-xl font-bold leading-relaxed text-slate-900 dark:text-white whitespace-pre-wrap">
                {currentQuestion.text}
              </h3>

              <div className="mt-10 space-y-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = state.userAnswers[state.currentQuestionIndex] === index;

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      className={cn(
                        "group flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99]",
                        isSelected
                          ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
                          : "border-slate-100 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors",
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={cn(
                        "text-base font-semibold",
                        isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-12 flex items-center justify-between border-t pt-8 dark:border-slate-800">
                <button
                  onClick={() => setState(prev => ({ ...prev, currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1) }))}
                  disabled={state.currentQuestionIndex === 0}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, currentQuestionIndex: Math.min(quizQuestions.length - 1, prev.currentQuestionIndex + 1) }))}
                  disabled={state.currentQuestionIndex === quizQuestions.length - 1}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-30 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Next Question
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Question Palette</h4>
              <div className="grid grid-cols-5 gap-2">
                {quizQuestions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setState(prev => ({ ...prev, currentQuestionIndex: index }))}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all",
                      state.currentQuestionIndex === index
                        ? "bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900"
                        : state.userAnswers[index] !== null
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-2 border-t pt-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="h-3 w-3 rounded-sm bg-blue-600" />
                  <span>Current</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Subjects = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 min-h-stable">
      <Helmet>
        <title>Subjects - NEETRise Practice Modules</title>
        <meta name="description" content="Explore NEET practice modules for Physics, Chemistry, and Biology. Chapter-wise MCQs and detailed explanations." />
      </Helmet>
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Choose a Subject</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Select a subject to explore previous NEET practice modules.</p>
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {subjects.filter(s => s.id !== 'pyq').map((subject) => (
          <Link
            key={subject.id}
            to={`/subject/${subject.id}`}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 transition-all hover:border-blue-500 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
              <BookOpen size={40} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{subject.name}</h3>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{subject.chapters.length} Chapters • NCERT Based</p>
            <div className="mt-10 flex items-center gap-2 text-base font-bold text-blue-600">
              Explore Chapters <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const HistoryPage = () => {
  const [scores] = useLocalStorage<any[]>('neet-scores', []);
  const sortedScores = [...scores].reverse().slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 min-h-[80vh]">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800">
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Performance Tracking</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Test History</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Review your past performance and track your growth.</p>
      </div>

      {sortedScores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Clock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No History Yet</h2>
          <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
            Start practicing to see your performance history here.
          </p>
          <Link to="/subjects" className="mt-8 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700">
            Start Practice
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Desktop View */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:block dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">Test Module</th>
                  <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">NEET Score</th>
                  <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedScores.map((score) => score && (
                  <tr key={score.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <Zap size={18} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                          {score.type} {score.subjectId ? `• ${score.subjectId}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div 
                            className="h-full bg-blue-600" 
                            style={{ width: `${(score.score / score.total) * 100}%` }} 
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {score.score}/{score.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link to={`/history/${score.id}`} className="rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-400">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="grid gap-4 md:hidden">
            {sortedScores.map((score) => score && (
              <Link key={score.id} to={`/history/${score.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Zap size={18} />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{score.type}</span>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Score</span>
                    <span className="font-bold text-slate-900 dark:text-white">{score.score}/{score.total}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className="h-full bg-blue-600" 
                      style={{ width: `${(score.score / score.total) * 100}%` }} 
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryDetail = () => {
  const { scoreId } = useParams<{ scoreId: string }>();
  const [scores] = useLocalStorage<any[]>('neet-scores', []);
  const score = scores.find(s => s.id === Number(scoreId));
  const navigate = useNavigate();

  if (!score) return <div className="py-20 text-center">Result not found</div>;

  const stats = score.stats || { correct: 0, incorrect: 0, unattempted: 0 };
  const percentage = score?.total ? ((score.score / score.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 min-h-stable">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline mb-4">
          <ChevronLeft size={16} /> Back to History
        </button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Test Analysis</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Detailed breakdown of your performance on {score?.date ? new Date(score.date).toLocaleDateString() : 'N/A'}.</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Trophy size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white">{score?.score || 0} <span className="text-xl font-bold text-slate-400">/ {score?.total || 0}</span></h2>
            <p className="mt-2 text-lg font-bold text-blue-600">{percentage}% Accuracy</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Module: <span className="capitalize">{score?.type || 'N/A'}</span> {score?.subjectId && `• ${score.subjectId}`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-6 text-center dark:bg-emerald-900/10">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Correct</p>
              <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">{stats.correct}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-6 text-center dark:bg-rose-900/10">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Incorrect</p>
              <p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-400">{stats.incorrect}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-800/50 sm:col-span-1 col-span-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Unattempted</p>
              <p className="mt-2 text-3xl font-black text-slate-700 dark:text-slate-300">{stats.unattempted}</p>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-10 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Performance Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl bg-blue-50/50 p-5 dark:bg-blue-900/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Score Breakdown</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    You scored {stats.correct * 4} marks from correct answers and lost {stats.incorrect} marks due to negative marking.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-emerald-50/50 p-5 dark:bg-emerald-900/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Strength Analysis</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {Number(percentage) > 70 ? 'Great job! You have a strong grasp of this module.' : 'Keep practicing! Focus on the topics you missed to improve your accuracy.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const About = () => (
  <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="space-y-8"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Fuel your ambition <br />
            <span className="text-blue-600">Your Medical Dream Starts Here</span>
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-slate-600 dark:text-slate-400">
            Join thousands of students who are using NEETRise to achieve their medical dreams. Our platform provides the most relevant, NCERT-based content to ensure you stay ahead of the competition.
          </p>
        </div>

        <ul className="space-y-4">
          {[
            "10,000+ NCERT-based Questions",
            "Real-time AI Performance Analysis",
            "Simulated NEET Exam Environment"
          ].map((item, i) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-lg font-medium text-slate-700 dark:text-slate-300"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Check size={14} strokeWidth={3} />
              </div>
              {item}
            </motion.li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-8 pt-4">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">98%</div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Syllabus</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">10k+</div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">MCQs</div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-slate-50 p-8 text-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">N</div>
            <div>
              <div className="font-bold">NEET Aspirants</div>
              <div className="text-slate-500 text-sm dark:text-slate-400">NEET 2025 Topper</div>
            </div>
          </div>
          <p className="text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
            "NEETRise's NCERT-based practice was the key to my 680+ score in NEET 2025!"
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">Daily Wisdom</div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              "Success is the sum of small efforts, repeated day in and day out."
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-600">Success Milestone</div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              50,000+ Students Mastered
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-50 p-8 dark:bg-slate-800/50">
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400 text-center italic">
            "The future belongs to those who believe in the beauty of their dreams. Every question you solve today is a step closer to your white coat."
          </p>
        </div>
      </div>
    </div>
  </div>
);

const RankPredictor = () => {
  const [marks, setMarks] = useState<number | ''>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'tough'>('moderate');
  const [result, setResult] = useState<{
    rankRange: string;
    mbbsChance: 'High' | 'Medium' | 'Low';
    explanation: string;
  } | null>(null);

  const predictRank = (e: React.FormEvent) => {
    e.preventDefault();
    if (marks === '' || marks < 0 || marks > 720) return;

    let baseRankMin = 0;
    let baseRankMax = 0;
    let chance: 'High' | 'Medium' | 'Low' = 'Low';
    let explanation = "";

    // Trends
    if (marks >= 650) {
      baseRankMin = 1;
      baseRankMax = 5000;
      chance = 'High';
    } else if (marks >= 600) {
      baseRankMin = 5000;
      baseRankMax = 20000;
      chance = 'High';
    } else if (marks >= 550) {
      baseRankMin = 20000;
      baseRankMax = 50000;
      chance = 'Medium';
    } else if (marks >= 500) {
      baseRankMin = 50000;
      baseRankMax = 100000;
      chance = 'Medium';
    } else if (marks >= 450) {
      baseRankMin = 100000;
      baseRankMax = 200000;
      chance = 'Low';
    } else if (marks >= 400) {
      baseRankMin = 200000;
      baseRankMax = 350000;
      chance = 'Low';
    } else {
      baseRankMin = 350000;
      baseRankMax = 1000000; // Arbitrary upper bound
      chance = 'Low';
    }

    // Adjust for difficulty
    let multiplier = 1;
    if (difficulty === 'easy') multiplier = 1.2; // Ranks go higher (worse) for same marks
    if (difficulty === 'tough') multiplier = 0.8; // Ranks go lower (better) for same marks

    const finalMin = Math.floor(baseRankMin * multiplier);
    const finalMax = Math.floor(baseRankMax * multiplier);

    const rankRangeStr = marks >= 650 && difficulty === 'tough' 
      ? `Under ${finalMax}` 
      : marks < 400 
        ? `Above ${finalMin}` 
        : `${finalMin.toLocaleString()} - ${finalMax.toLocaleString()}`;

    if (marks >= 610) {
      explanation = "Excellent score! You are well-positioned for a seat in top government medical colleges.";
    } else if (marks >= 550) {
      explanation = "Good score. You have a very strong chance for government MBBS seats, especially in state quotas.";
    } else if (marks >= 500) {
      explanation = "Competitive score. You might get a government seat in later rounds or have good options in private colleges.";
    } else {
      explanation = "Consider focusing on state-specific quotas or private medical colleges. Improving score by 100+ marks could significantly change your prospects.";
    }

    setResult({
      rankRange: rankRangeStr,
      mbbsChance: chance,
      explanation: explanation
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <BarChart3 size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">NEET Rank Predictor</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Estimate your All India Rank based on recent trends and paper difficulty.</p>
        </div>

        <form onSubmit={predictRank} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Your NEET Marks (out of 720)
            </label>
            <input 
              type="number" 
              required
              min="0"
              max="720"
              value={marks}
              onChange={(e) => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              placeholder="e.g. 620"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Paper Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['easy', 'moderate', 'tough'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    "rounded-xl py-3 text-sm font-bold capitalize transition-all",
                    difficulty === level 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Predict My Rank
          </button>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-12 overflow-hidden border-t border-slate-100 pt-8 dark:border-slate-800"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-6 dark:bg-blue-900/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Expected Rank Range</p>
                  <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{result.rankRange}</p>
                </div>
                <div className={cn(
                  "rounded-2xl p-6",
                  result.mbbsChance === 'High' ? "bg-emerald-50 dark:bg-emerald-900/20" : 
                  result.mbbsChance === 'Medium' ? "bg-amber-50 dark:bg-amber-900/20" : 
                  "bg-rose-50 dark:bg-rose-900/20"
                )}>
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    result.mbbsChance === 'High' ? "text-emerald-600 dark:text-emerald-400" : 
                    result.mbbsChance === 'Medium' ? "text-amber-600 dark:text-amber-400" : 
                    "text-rose-600 dark:text-rose-400"
                  )}>Chance of MBBS</p>
                  <p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{result.mbbsChance}</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 p-6 dark:bg-slate-800/50">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">Analysis: </span>
                  {result.explanation}
                </p>
              </div>
              <p className="mt-4 text-center text-[10px] text-slate-400 dark:text-slate-500 italic">
                *This is an estimate based on previous trends. Actual ranks may vary based on the official NEET 2026 results.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const PrivacyPolicy = () => (
  <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
    <div className="mt-8 space-y-6 text-slate-600 dark:text-slate-400">
      <p className="font-medium">Last Updated: April 2026</p>
      <p>Welcome to NeetRise. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our website.</p>
      
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
      <p>We may collect the following types of information:</p>
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">a) Personal Information (only if you provide it):</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Name (if submitted)</li>
            <li>Email address (if you contact us or sign up)</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">b) Non-Personal Information:</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Browser type</li>
            <li>Device information</li>
            <li>Pages visited</li>
            <li>Time spent on the website</li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Improve website performance and content</li>
        <li>Respond to your queries</li>
        <li>Provide better user experience</li>
        <li>Analyze traffic and usage trends</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Cookies</h2>
      <p>We may use cookies to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Improve website functionality</li>
        <li>Understand user behavior</li>
        <li>Show relevant content or ads (if enabled in future)</li>
      </ul>
      <p>You can disable cookies in your browser settings.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Third-Party Services</h2>
      <p>We may use third-party services such as:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Google Analytics (for traffic analysis)</li>
        <li>Google AdSense (for ads in future)</li>
      </ul>
      <p>These services may collect and process your data according to their own privacy policies.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Data Protection</h2>
      <p>We take reasonable steps to protect your information. However, no method of transmission over the internet is 100% secure.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Children’s Privacy</h2>
      <p>Our website is intended for students preparing for exams like NEET. We do not knowingly collect personal data from children under 13.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. External Links</h2>
      <p>Our website may contain links to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Study resources</li>
        <li>Other educational websites</li>
      </ul>
      <p>We are not responsible for the privacy practices of those external sites.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">8. Your Consent</h2>
      <p>By using our website, you agree to this Privacy Policy.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy at any time. Changes will be posted on this page.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">10. Contact Us</h2>
      <p>If you have any questions, contact us at:</p>
      <p className="font-medium">📧 supportwork1@gmail.com</p>
    </div>
  </div>
);

const TermsOfService = () => (
  <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
    <div className="mt-8 space-y-6 text-slate-600 dark:text-slate-400">
      <p className="font-medium">Last Updated: April 2026</p>
      <p>Welcome to NeetRise. By accessing or using our website, you agree to comply with and be bound by the following Terms of Service.</p>
      
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
      <p>By using this website, you agree to these Terms. If you do not agree, please do not use our website.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Use of Website</h2>
      <p>NeetRise provides:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Educational content for NEET preparation</li>
        <li>Practice questions and mock tests</li>
        <li>Study blogs and resources</li>
      </ul>
      <p>You agree to use this website only for lawful purposes.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Educational Disclaimer</h2>
      <p>All content on NeetRise is provided for educational and informational purposes only.</p>
      <p>We do not guarantee:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Selection in NEET</li>
        <li>Any specific rank or marks</li>
        <li>Complete accuracy of all questions or solutions</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. User Conduct</h2>
      <p>You agree NOT to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Post spam or harmful content</li>
        <li>Attempt to hack or damage the website</li>
        <li>Misuse mock tests or data</li>
        <li>Violate any applicable laws</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Intellectual Property</h2>
      <p>All content on this website, including:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Questions</li>
        <li>Blogs</li>
        <li>Mock tests</li>
        <li>Design and branding</li>
      </ul>
      <p>is the property of NeetRise.</p>
      <p>You may NOT:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Copy or reproduce content</li>
        <li>Sell or redistribute material</li>
      </ul>
      <p>without permission.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">6. Admin Rights</h2>
      <p>We reserve the right to:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Add, edit, or remove content at any time</li>
        <li>Modify or discontinue features (mock tests, daily practice, etc.)</li>
        <li>Restrict access to users who violate these terms</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">7. Third-Party Links</h2>
      <p>Our website may contain links to external websites. We are not responsible for:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Their content</li>
        <li>Their policies</li>
        <li>Any loss or damage</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">8. Limitation of Liability</h2>
      <p>NeetRise is not responsible for:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Your exam results</li>
        <li>Any decisions made based on our content</li>
        <li>Technical issues or website downtime</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">9. Privacy</h2>
      <p>Your use of the website is also governed by our Privacy Policy.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">10. Changes to Terms</h2>
      <p>We may update these Terms at any time. Continued use of the website means you accept the updated terms.</p>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white">11. Contact Us</h2>
      <p>For any questions regarding these Terms:</p>
      <p className="font-medium">📧 supportwork1@gmail.com</p>
    </div>
  </div>
);

const Footer = () => (
  <footer className="mt-auto border-t bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <BookOpen className="text-blue-600" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">NEETRise</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © 2026 NEETRise. Built for aspirants.
        </p>
        <div className="flex gap-6">
          <Link to="/privacy" className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-white">Terms of Service</Link>
          <a 
            href="https://t.me/neetrise" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            Follow Us
          </a>
        </div>
      </div>
    </div>
  </footer>
);

const ADMIN_PASSWORD = "Shubham@2006";

const AdminPanel = ({ showToast }: { showToast: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'blogs' | 'subject' | 'daily' | 'mock'>('blogs');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem("admin_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_auth", "true");
      showToast("Logged in successfully", "success");
    } else {
      showToast("Access Denied", "error");
      window.location.href = "/";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
  };

  // Blog State
  const [blogForm, setBlogForm] = useState({
    title: '',
    category: 'STRATEGY',
    description: '',
    content: ''
  });

  // Subject Question State
  const [subjectForm, setSubjectForm] = useState({
    subjectId: subjects[0].id,
    chapterId: subjects[0].chapters[0].id,
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    reason: ''
  });

  // Daily Practice & Mock Test State
  const [fixedIdForm, setFixedIdForm] = useState({
    id: '',
    subject: 'Physics',
    chapter: '',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    reason: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [pastedJson, setPastedJson] = useState('');

  // Data fetching for DP, MT and Subjects
  const [dailyQuestions, setDailyQuestions] = useState<any[]>([]);
  const [mockQuestions, setMockQuestions] = useState<any[]>([]);
  const [subjectQuestions, setSubjectQuestions] = useState<any[]>([]);

  useEffect(() => {
    let unsubDaily: () => void;
    let unsubMock: () => void;
    let unsubSubject: () => void;

    try {
      unsubDaily = onSnapshot(collection(db, 'daily_practice'), (snapshot) => {
        try {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDailyQuestions(data);
        } catch (err) {
          console.error("Error processing daily questions:", err);
        }
      }, (err) => console.error("Daily questions listener error:", err));

      unsubMock = onSnapshot(collection(db, 'mock_tests'), (snapshot) => {
        try {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMockQuestions(data);
        } catch (err) {
          console.error("Error processing mock questions:", err);
        }
      }, (err) => console.error("Mock questions listener error:", err));

      unsubSubject = onSnapshot(collection(db, 'subject_questions'), (snapshot) => {
        try {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSubjectQuestions(data);
        } catch (err) {
          console.error("Error processing subject questions:", err);
        }
      }, (err) => console.error("Subject questions listener error:", err));
    } catch (err) {
      console.error("Error setting up admin listeners:", err);
    }

    return () => {
      unsubDaily?.();
      unsubMock?.();
      unsubSubject?.();
    };
  }, []);

  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.content || !blogForm.description) return;
    setLoading(true);
    try {
      const slug = blogForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await addDoc(collection(db, 'blogs'), {
        ...blogForm,
        slug,
        meta: `${Math.ceil(blogForm.content.split(' ').length / 200)} min read • Added by Admin`,
        createdAt: serverTimestamp()
      });
      showToast('Blog Added Successfully', 'success');
      setBlogForm({ title: '', category: 'STRATEGY', description: '', content: '' });
    } catch (error) {
      console.error(error);
      showToast('Failed to add blog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubjectQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.question || !subjectForm.optionA || !subjectForm.optionB) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'subject_questions'), {
        subjectId: subjectForm.subjectId,
        chapterId: subjectForm.chapterId,
        question: subjectForm.question,
        options: [subjectForm.optionA, subjectForm.optionB, subjectForm.optionC, subjectForm.optionD],
        answer: subjectForm.correctAnswer,
        reason: subjectForm.reason,
        createdAt: serverTimestamp()
      });
      alert('Subject Question Added Successfully');
      setSubjectForm({ ...subjectForm, question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', reason: '' });
    } catch (error) {
      console.error(error);
      alert('Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const handleFixedIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const collectionName = activeTab === 'daily' ? 'daily_practice' : 'mock_tests';
    const prefix = activeTab === 'daily' ? 'DP' : 'MT';
    const maxLimit = activeTab === 'daily' ? 10 : 60;
    const currentQuestions = activeTab === 'daily' ? dailyQuestions : mockQuestions;

    if (!isEditing && currentQuestions.length >= maxLimit) {
      alert(`Maximum limit of ${maxLimit} questions reached for ${activeTab === 'daily' ? 'Daily Practice' : 'Mock Test'}.`);
      return;
    }

    let idNum = parseInt(fixedIdForm.id);
    if (!isEditing) {
      // Auto-assign next serial number
      const existingIds = currentQuestions.map(q => parseInt(q.id.replace(prefix, ''))).sort((a, b) => a - b);
      let nextId = 1;
      for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] === nextId) {
          nextId++;
        } else {
          break;
        }
      }
      idNum = nextId;
    }

    if (isNaN(idNum) || idNum < 1 || idNum > maxLimit) {
      alert(`Invalid ID. Must be between 1 and ${maxLimit}`);
      return;
    }

    const docId = `${prefix}${idNum}`;
    setLoading(true);
    try {
      await setDoc(doc(db, collectionName, docId), {
        serial_no: idNum,
        subject: fixedIdForm.subject,
        chapter: fixedIdForm.chapter,
        question: fixedIdForm.question,
        options: [fixedIdForm.optionA, fixedIdForm.optionB, fixedIdForm.optionC, fixedIdForm.optionD],
        answer: fixedIdForm.correctAnswer === 'A' ? fixedIdForm.optionA : 
                fixedIdForm.correctAnswer === 'B' ? fixedIdForm.optionB : 
                fixedIdForm.correctAnswer === 'C' ? fixedIdForm.optionC : fixedIdForm.optionD,
        correct_option: fixedIdForm.correctAnswer,
        reason: fixedIdForm.reason,
        updatedAt: serverTimestamp()
      });
      alert(`Question ${idNum} ${isEditing ? 'Updated' : 'Added'} Successfully`);
      setFixedIdForm({ id: '', subject: 'Physics', chapter: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', reason: '' });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const reorderSerialNumbers = async (collectionName: string, prefix: string) => {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a, b) => (a.serial_no || 0) - (b.serial_no || 0));

    for (let i = 0; i < docs.length; i++) {
      const newSerialNo = i + 1;
      const newDocId = `${prefix}${newSerialNo}`;
      if (docs[i].id !== newDocId || docs[i].serial_no !== newSerialNo) {
        // If ID changed, we need to delete old and create new
        await deleteDoc(doc(db, collectionName, docs[i].id));
        await setDoc(doc(db, collectionName, newDocId), {
          ...docs[i],
          id: newDocId,
          serial_no: newSerialNo,
          updatedAt: serverTimestamp()
        });
      }
    }
  };

  const handleDelete = async (id: string, collectionName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${id}?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, collectionName, id));
      
      // Reorder if it's daily or mock
      if (collectionName === 'daily_practice') {
        await reorderSerialNumbers('daily_practice', 'DP');
      } else if (collectionName === 'mock_tests') {
        await reorderSerialNumbers('mock_tests', 'MT');
      }
      
      alert('Deleted successfully');
    } catch (error) {
      console.error(error);
      alert('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const processJsonData = async (json: any) => {
    const key = activeTab === 'daily' ? 'daily_practice' : 
                activeTab === 'mock' ? 'mock_tests' : 'subject_questions';
    const questions = json[key];
    const maxLimit = activeTab === 'daily' ? 10 : 60;
    const prefix = activeTab === 'daily' ? 'DP' : 'MT';

    if (!questions || !Array.isArray(questions)) {
      throw new Error(`JSON must contain an array under the key "${key}"`);
    }

    if (activeTab !== 'subject' && questions.length > maxLimit) {
      throw new Error(`Maximum limit of ${maxLimit} questions exceeded.`);
    }

    setLoading(true);
    
    // Delete existing
    const collectionName = activeTab === 'daily' ? 'daily_practice' : 
                           activeTab === 'mock' ? 'mock_tests' : 'subject_questions';
    
    if (activeTab !== 'subject') {
      const existingSnapshot = await getDocs(collection(db, collectionName));
      for (const d of existingSnapshot.docs) {
        await deleteDoc(doc(db, collectionName, d.id));
      }
    } else {
      // For subject questions, only delete questions for the CURRENTLY SELECTED subject/chapter
      const q = query(
        collection(db, 'subject_questions'), 
        where('subjectId', '==', subjectForm.subjectId),
        where('chapterId', '==', subjectForm.chapterId)
      );
      const existingSnapshot = await getDocs(q);
      for (const d of existingSnapshot.docs) {
        await deleteDoc(doc(db, 'subject_questions', d.id));
      }
    }

    // Add new
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Strict validation
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.answer) {
        console.warn(`Skipping invalid question at index ${i}`);
        continue;
      }

      const isLetter = (val: string) => ['A', 'B', 'C', 'D'].includes(val);
      const letter = isLetter(q.answer) ? q.answer : 
                     (q.options.indexOf(q.answer) === 0 ? 'A' : q.options.indexOf(q.answer) === 1 ? 'B' : q.options.indexOf(q.answer) === 2 ? 'C' : 'D');
      const answerText = isLetter(q.answer) ? q.options[q.answer.charCodeAt(0) - 65] : q.answer;

      if (activeTab === 'subject') {
        await addDoc(collection(db, 'subject_questions'), {
          subjectId: subjectForm.subjectId,
          chapterId: subjectForm.chapterId,
          question: q.question,
          options: q.options,
          answer: letter,
          correct_option: letter,
          reason: q.reason || '',
          createdAt: serverTimestamp()
        });
      } else {
        const serialNo = i + 1;
        const docId = `${prefix}${serialNo}`;
        
        await setDoc(doc(db, collectionName, docId), {
          serial_no: serialNo,
          subject: q.subject || 'General',
          chapter: q.chapter || 'General',
          question: q.question,
          options: q.options,
          answer: answerText,
          correct_option: q.correct_option || letter,
          reason: q.reason || '',
          createdAt: serverTimestamp()
        });
      }
    }

    alert(`${activeTab === 'daily' ? 'Daily Practice' : activeTab === 'mock' ? 'Mock Test' : 'Subject Questions'} updated. ${questions.length} questions processed.`);
  };

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await processJsonData(json);
      } catch (error: any) {
        alert(`Upload failed: ${error.message}`);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePasteJson = async () => {
    if (!pastedJson.trim()) {
      alert('Please paste JSON first');
      return;
    }
    try {
      const json = JSON.parse(pastedJson);
      await processJsonData(json);
      setPastedJson('');
    } catch (error: any) {
      alert(`Processing failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonExport = () => {
    const key = activeTab === 'daily' ? 'daily_practice' : 
                activeTab === 'mock' ? 'mock_tests' : 'subject_questions';
    
    let questionsToExport = [];
    if (activeTab === 'daily') {
      questionsToExport = dailyQuestions.sort((a, b) => (a.serial_no || 0) - (b.serial_no || 0))
        .map(q => ({
          serial_no: q.serial_no,
          subject: q.subject,
          chapter: q.chapter,
          question: q.question,
          options: q.options,
          answer: q.answer,
          reason: q.reason
        }));
    } else if (activeTab === 'mock') {
      questionsToExport = mockQuestions.sort((a, b) => (a.serial_no || 0) - (b.serial_no || 0))
        .map(q => ({
          serial_no: q.serial_no,
          subject: q.subject,
          chapter: q.chapter,
          question: q.question,
          options: q.options,
          answer: q.answer,
          reason: q.reason
        }));
    } else {
      questionsToExport = subjectQuestions
        .filter(q => q.subjectId === subjectForm.subjectId && q.chapterId === subjectForm.chapterId)
        .map(q => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          reason: q.reason
        }));
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ [key]: questionsToExport }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${key}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleEdit = (q: any) => {
    const idNum = q.id.replace('DP', '').replace('MT', '');
    setFixedIdForm({
      id: idNum,
      subject: q.subject || 'Physics',
      chapter: q.chapter || '',
      question: q.question,
      optionA: q.options[0],
      optionB: q.options[1],
      optionC: q.options[2],
      optionD: q.options[3],
      correctAnswer: q.correct_option || (q.options.indexOf(q.answer) === 0 ? 'A' : q.options.indexOf(q.answer) === 1 ? 'B' : q.options.indexOf(q.answer) === 2 ? 'C' : 'D'),
      reason: q.reason || ''
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRename = async (id: string, collectionName: string) => {
    const newText = window.prompt('Enter new question text:');
    if (!newText) return;
    try {
      await updateDoc(doc(db, collectionName, id), { question: newText });
      alert('Renamed successfully');
    } catch (error) {
      console.error(error);
      alert('Rename failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Please enter the password to continue.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!passwordInput}
              className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              Enter Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <LayoutDashboard size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your NEET preparation content.</p>
        <button
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
        {[
          { id: 'blogs', label: 'Blogs', icon: FileText },
          { id: 'subject', label: 'Subjects', icon: BookOpen },
          { id: 'daily', label: 'Daily Practice', icon: Clock },
          { id: 'mock', label: 'Mock Test', icon: Zap }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setIsEditing(false);
              setFixedIdForm({ id: '', subject: 'Physics', chapter: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', reason: '' });
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all",
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8">
        {/* Form Section */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Question' : 
             activeTab === 'blogs' ? 'Add New Blog' : 
             activeTab === 'subject' ? 'Add New Subject Question' : 
             `Add New ${activeTab === 'daily' ? 'Daily Practice' : 'Mock Test'} Question`}
          </h2>

          {activeTab === 'blogs' && (
            <form onSubmit={handleAddBlog} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Title</label>
                  <input type="text" required value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                    <option value="STRATEGY">STRATEGY</option>
                    <option value="BOOKS">BOOKS</option>
                    <option value="TIPS">TIPS</option>
                    <option value="MISTAKES">MISTAKES</option>
                    <option value="NEWS">NEWS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Short Description</label>
                <input type="text" required value={blogForm.description} onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Content (Markdown supported)</label>
                <textarea required rows={8} value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Blog'}
              </button>
            </form>
          )}

          {activeTab === 'subject' && (
            <form onSubmit={handleAddSubjectQuestion} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                  <select 
                    value={subjectForm.subjectId} 
                    onChange={(e) => {
                      const subId = e.target.value;
                      const sub = subjects.find(s => s.id === subId);
                      setSubjectForm({ 
                        ...subjectForm, 
                        subjectId: subId, 
                        chapterId: sub?.chapters[0].id || '' 
                      });
                    }} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
                  <select 
                    value={subjectForm.chapterId} 
                    onChange={(e) => setSubjectForm({ ...subjectForm, chapterId: e.target.value })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {subjects.find(s => s.id === subjectForm.subjectId)?.chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Question</label>
                <input type="text" required value={subjectForm.question} onChange={(e) => setSubjectForm({ ...subjectForm, question: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <div key={opt}>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Option {opt}</label>
                    <input type="text" required value={(subjectForm as any)[`option${opt}`]} onChange={(e) => setSubjectForm({ ...subjectForm, [`option${opt}`]: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                  </div>
                ))}
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Correct Answer</label>
                  <select value={subjectForm.correctAnswer} onChange={(e) => setSubjectForm({ ...subjectForm, correctAnswer: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Reason (Optional)</label>
                <textarea rows={2} value={subjectForm.reason} onChange={(e) => setSubjectForm({ ...subjectForm, reason: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Question to Subject'}
              </button>
            </form>
          )}

          {(activeTab === 'subject' || activeTab === 'daily' || activeTab === 'mock') && (
            <div className="space-y-8 mt-12 border-t border-slate-100 pt-12 dark:border-slate-800">
              {/* JSON Actions */}
              <div className="space-y-4 rounded-2xl bg-slate-50 p-6 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Plus size={16} />
                      Upload JSON File
                      <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
                    </label>
                    <button onClick={handleJsonExport} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      <Save size={16} />
                      Export JSON
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowJson(!showJson)} 
                    className="text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {showJson ? 'Hide JSON Preview' : 'Show JSON Preview'}
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Paste JSON Content {activeTab === 'subject' && `(for ${subjects.find(s => s.id === subjectForm.subjectId)?.name} - ${subjects.find(s => s.id === subjectForm.subjectId)?.chapters.find(c => c.id === subjectForm.chapterId)?.name})`}
                  </label>
                  <textarea 
                    rows={4}
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                    placeholder={`{ "${activeTab === 'daily' ? 'daily_practice' : activeTab === 'mock' ? 'mock_tests' : 'subject_questions'}": [...] }`}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-400"
                  />
                  <button 
                    onClick={handlePasteJson}
                    disabled={loading || !pastedJson.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                  >
                    {loading ? 'Processing...' : 'Process Pasted JSON'}
                  </button>
                </div>
              </div>

              {showJson && (
                <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-60">
                  <pre>{JSON.stringify({ [activeTab === 'daily' ? 'daily_practice' : activeTab === 'mock' ? 'mock_tests' : 'subject_questions']: 
                    activeTab === 'daily' ? dailyQuestions.sort((a, b) => (a.serial_no || 0) - (b.serial_no || 0)).map(q => ({ serial_no: q.serial_no, subject: q.subject, chapter: q.chapter, question: q.question, options: q.options, answer: q.answer, reason: q.reason })) :
                    activeTab === 'mock' ? mockQuestions.sort((a, b) => (a.serial_no || 0) - (b.serial_no || 0)).map(q => ({ serial_no: q.serial_no, subject: q.subject, chapter: q.chapter, question: q.question, options: q.options, answer: q.answer, reason: q.reason })) :
                    subjectQuestions.filter(q => q.subjectId === subjectForm.subjectId && q.chapterId === subjectForm.chapterId).map(q => ({ question: q.question, options: q.options, answer: q.answer, reason: q.reason }))
                  }, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subject' && (
            <div className="mt-12 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Existing Subject Questions</h3>
                <div className="grid gap-4">
                  {subjectQuestions.filter(q => q.subjectId === subjectForm.subjectId && q.chapterId === subjectForm.chapterId).map((q) => (
                    <div key={q.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{q.question}</p>
                        <p className="text-xs text-slate-500">Answer: {q.answer}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRename(q.id, 'subject_questions')} className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(q.id, 'subject_questions')} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {subjectQuestions.filter(q => q.subjectId === subjectForm.subjectId && q.chapterId === subjectForm.chapterId).length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">No questions added for this chapter yet.</p>
                  )}
                </div>
              </div>
          )}

          {(activeTab === 'daily' || activeTab === 'mock') && (
            <div className="space-y-8 mt-12">
              <form onSubmit={handleFixedIdSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Serial No.</label>
                    <input 
                      type="number" 
                      disabled={!isEditing} 
                      placeholder={isEditing ? "" : "Auto-assigned"}
                      value={fixedIdForm.id} 
                      onChange={(e) => setFixedIdForm({ ...fixedIdForm, id: e.target.value })} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                    <select 
                      value={fixedIdForm.subject} 
                      onChange={(e) => setFixedIdForm({ ...fixedIdForm, subject: e.target.value })} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Chapter</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Units and Measurements"
                      value={fixedIdForm.chapter} 
                      onChange={(e) => setFixedIdForm({ ...fixedIdForm, chapter: e.target.value })} 
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Question</label>
                  <input type="text" required value={fixedIdForm.question} onChange={(e) => setFixedIdForm({ ...fixedIdForm, question: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <div key={opt}>
                      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Option {opt}</label>
                      <input type="text" required value={(fixedIdForm as any)[`option${opt}`]} onChange={(e) => setFixedIdForm({ ...fixedIdForm, [`option${opt}`]: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                    </div>
                  ))}
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Correct Answer</label>
                    <select value={fixedIdForm.correctAnswer} onChange={(e) => setFixedIdForm({ ...fixedIdForm, correctAnswer: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Reason (Optional)</label>
                  <textarea rows={2} value={fixedIdForm.reason} onChange={(e) => setFixedIdForm({ ...fixedIdForm, reason: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                </div>
                <div className="flex gap-4">
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Saving...' : isEditing ? 'Update Question' : 'Add Question'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(false); setFixedIdForm({ id: '', subject: 'Physics', chapter: '', question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', reason: '' }); }} className="rounded-xl border border-slate-200 px-8 py-4 font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </motion.div>

        {/* Table Section for DP and MT */}
        {(activeTab === 'daily' || activeTab === 'mock') && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ID</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Chapter</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Question</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Answer</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(activeTab === 'daily' ? dailyQuestions : mockQuestions)
                    .sort((a, b) => {
                      const aNum = parseInt(a.id.replace(/\D/g, ''));
                      const bNum = parseInt(b.id.replace(/\D/g, ''));
                      return aNum - bNum;
                    })
                    .map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-bold text-blue-600">{q.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{q.subject}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{q.chapter}</td>
                      <td className="px-6 py-4 max-w-md truncate text-slate-700 dark:text-slate-300">{q.question}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{q.answer}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(q)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleRename(q.id, activeTab === 'daily' ? 'daily_practice' : 'mock_tests')} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                            <Plus size={18} />
                          </button>
                          <button onClick={() => handleDelete(q.id, activeTab === 'daily' ? 'daily_practice' : 'mock_tests')} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'daily' ? dailyQuestions : mockQuestions).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No questions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
    <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
      <X size={40} />
    </div>
    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">404</h1>
    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Oops! The page you're looking for doesn't exist.</p>
    <Link to="/" className="mt-8 rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95">
      Back to Home
    </Link>
  </div>
);

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.9 }}
    className={cn(
      "fixed bottom-8 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl",
      type === 'success' ? "bg-emerald-500/90 text-white" : 
      type === 'error' ? "bg-red-500/90 text-white" : 
      "bg-slate-900/90 text-white"
    )}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
    <span className="text-sm font-bold">{message}</span>
    <button onClick={onClose} className="ml-2 rounded-lg p-1 hover:bg-white/20">
      <X size={16} />
    </button>
  </motion.div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
          <p className="mt-2 max-w-md text-slate-600 dark:text-slate-400">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (err) {
      return false;
    }
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (err) {
      console.error("Error updating theme:", err);
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
          <ScrollToTop />
          <div className={cn("flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950", darkMode && "dark")}>
            <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
            <AnimatePresence>
              {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/subject/:subjectId" element={<SubjectPage />} />
                <Route path="/subject/:subjectId/:chapterId" element={<ChapterSEOPage />} />
                <Route path="/quiz/:subjectId/:chapterId" element={<Quiz type="chapter" />} />
                <Route path="/mock-test" element={<Quiz type="mock" />} />
                <Route path="/rank-predictor" element={<RankPredictor />} />
                <Route path="/daily-practice" element={<Quiz type="daily" />} />
                <Route path="/saved" element={<SavedQuestions />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:scoreId" element={<HistoryDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/blog/:slug" element={<BlogPage />} />
                <Route path="/blog" element={<AllBlogsPage />} />
                <Route path="/subject-questions" element={<SubjectQuestionsPage />} />
                <Route path="/admin" element={<AdminPanel showToast={showToast} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

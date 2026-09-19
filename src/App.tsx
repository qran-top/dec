import { useState, useEffect, useRef } from 'react';
import { 
  Search, Moon, Sun, Loader2, History, SlidersHorizontal, Trash2, ArrowUp, 
  Book, Sparkles, Code, Globe, PawPrint, Copy, Check, Share2, 
  BookOpen, Shuffle, Filter, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'home' | 'privacy' | 'terms' | 'help';

interface DictionaryResult {
  id: string;
  dictionaryId: string;
  dictionaryName: string;
  author: string;
  era: string;
  eraLabel: string;
  word: string;
  root: string;
  definition: string;
}

interface DictionaryMeta {
  id: string;
  name: string;
  shortName: string;
  author: string;
  era: 'classical' | 'modern' | 'quranic' | 'english';
  eraLabel: string;
  description: string;
  totalEntries: number;
}

const DEFAULT_DICTIONARIES: DictionaryMeta[] = [
  {
    id: "lisanularab",
    name: "لسان العرب",
    shortName: "اللسان",
    author: "ابن منظور (ت 711هـ)",
    era: "classical",
    eraLabel: "معاجم كلاسيكية كبرى",
    description: "أعظم وأشمل معاجم العربية التراثية، يجمع بين دقة المعاني وغزارة الشواهد القرآنية والحديثية والشعرية.",
    totalEntries: 9352,
  },
  {
    id: "mujamul_muhith",
    name: "القاموس المحيط",
    shortName: "المحيط",
    author: "الفيروزآبادي (ت 817هـ)",
    era: "classical",
    eraLabel: "معاجم كلاسيكية كبرى",
    description: "معجم موجز ودقيق، حاز شهرة واسعة حتى غدا اسم 'القاموس' مرادفاً لكل معجم في العربية.",
    totalEntries: 38944,
  },
  {
    id: "mujamul_wasith",
    name: "المعجم الوسيط",
    shortName: "الوسيط",
    author: "مجمع اللغة العربية بالقاهرة",
    era: "modern",
    eraLabel: "معاجم معاصرة ومجمعية",
    description: "معجم منهجي أكاديمي أصدره مجمع اللغة العربية، يستوعب مستجدات العصر والمصطلحات العلمية والحضارية.",
    totalEntries: 6763,
  },
  {
    id: "mujamul_shihah",
    name: "الصحاح (تاج اللغة وصحاح العربية)",
    shortName: "الصحاح",
    author: "الجوهري (ت 393هـ)",
    era: "classical",
    eraLabel: "معاجم كلاسيكية كبرى",
    description: "أول معجم رتّب الكلمات بحسب القوافي، تميز بانتقاء الصحيح الثابت من ألفاظ العرب.",
    totalEntries: 5650,
  },
  {
    id: "mujamul_ghoni",
    name: "معجم الغني",
    shortName: "الغني",
    author: "د. عبد الغني أبو العزم",
    era: "modern",
    eraLabel: "معاجم معاصرة ومجمعية",
    description: "معجم معاصر مضبوط بالحركات بالكامل، يوضح دلالات الألفاظ مع سياقاتها واستعمالاتها الحديثة.",
    totalEntries: 29810,
  },
  {
    id: "mujamul_muashiroh",
    name: "معجم اللغة العربية المعاصرة",
    shortName: "المعاصرة",
    author: "د. أحمد مختار عمر",
    era: "modern",
    eraLabel: "معاجم معاصرة ومجمعية",
    description: "مرجع حديث يعتمد على لغة الصحافة والأدب الحي، يشمل التعبيرات الاصطلاحية وتراكيب العصر.",
    totalEntries: 32297,
  },
  {
    id: "maqayeesul_luga",
    name: "معجم مقاييس اللغة",
    shortName: "المقاييس",
    author: "ابن فارس (ت 395هـ)",
    era: "classical",
    eraLabel: "معاجم كلاسيكية كبرى",
    description: "معجم فريد يربط ألفاظ الجذر الواحد بأصلها الدلالي ومحورها المشترك وتفرعاتها.",
    totalEntries: 5274,
  },
  {
    id: "mufradat_alfajul_quran",
    name: "مفردات ألفاظ القرآن",
    shortName: "المفردات",
    author: "الراغب الأصفهاني (ت 502هـ)",
    era: "quranic",
    eraLabel: "معاجم قرآنية متخصصة",
    description: "أشهر معجم مختص في بيان معاني ومفردات القرآن الكريم ودلالاتها البيانية والشرعية.",
    totalEntries: 1631,
  },
  {
    id: "hanswehr",
    name: "هانز فير (عربي - إنجليزي)",
    shortName: "Hans Wehr",
    author: "Hans Wehr / J.M. Cowan",
    era: "english",
    eraLabel: "معاجم إنجليزية",
    description: "The Dictionary of Modern Written Arabic, the premier reference for Arabic-English translation.",
    totalEntries: 24799,
  },
  {
    id: "lanelexcon",
    name: "معجم لين (Lane's Lexicon)",
    shortName: "Lane's Lexicon",
    author: "Edward William Lane",
    era: "english",
    eraLabel: "معاجم إنجليزية",
    description: "An Arabic-English Lexicon derived from classical Arabic authorities (Lisan al-Arab, Taj al-Arus).",
    totalEntries: 52914,
  },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DictionaryResult[] | null>(null);
  const [detectedRoot, setDetectedRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dictionaries, setDictionaries] = useState<DictionaryMeta[]>(DEFAULT_DICTIONARIES);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // Font size multiplier
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  // History state
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : ['كتاب', 'سلام', 'رحمة', 'علم'];
  });

  // Saved / Bookmarked entries
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('dictionaryBookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Active filter by category
  const [activeCategory, setActiveCategory] = useState<'all' | 'classical' | 'modern' | 'quranic' | 'english'>('all');

  // Advanced search options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDictIds, setSelectedDictIds] = useState<string[]>(() => 
    DEFAULT_DICTIONARIES.map(d => d.id)
  );

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debugging
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
    console.log(`[Dictionary Debug] ${msg}`);
  };

  // Load dictionaries list from local JSON index
  useEffect(() => {
    addLog("بدء تحميل فهرس القواميس...");
    fetch('./data/index.json')
      .then(res => {
        addLog(`استجابة الفهرس: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (data.dictionaries) {
          const dictArray = Object.entries(data.dictionaries).map(([id, meta]: [string, any]) => ({
            id,
            ...meta,
            totalEntries: 0
          }));
          setDictionaries(dictArray);
          addLog(`تم تحميل ${dictArray.length} قاموس بنجاح.`);
        }
      })
      .catch((err) => {
        addLog(`خطأ في تحميل الفهرس: ${err.message}`);
        console.error("Failed to load dictionary index:", err);
      });
  }, []);

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Persist history & bookmarks
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('dictionaryBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check URL param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      handleSearch(q, false);
    }
  }, []);

  // Helper functions for normalization (cloned from server logic)
  const stripTashkeel = (text: string): string => {
    if (!text) return "";
    return text.replace(/[\u064B-\u065F\u0670\u0640]/g, "").trim();
  };

  const normalizeAlef = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه");
  };

  const getFirstChar = (text: string): string => {
    const clean = stripTashkeel(text);
    if (!clean) return "other";
    return normalizeAlef(clean[0]);
  };

  const formatMeaning = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\|/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Autocomplete fetch (Local)
  useEffect(() => {
    if (query.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const firstChar = getFirstChar(query.trim());
          addLog(`جاري جلب اقتراحات للحرف: ${firstChar}...`);
          const res = await fetch(`./data/${encodeURIComponent(firstChar)}_json.json`);
          if (!res.ok) {
            addLog(`فشل جلب ملف الاقتراحات: ${res.status}`);
            return;
          }
          const entries = await res.json();
          const cleanQ = stripTashkeel(query.trim());
          
          const sugs = Array.from(new Set(
            entries
              .filter((e: any) => stripTashkeel(e.w).startsWith(cleanQ))
              .map((e: any) => e.w)
          )).slice(0, 10) as string[];

          setSuggestions(sugs);
          setShowSuggestions(sugs.length > 0);
          addLog(`تم العثور على ${sugs.length} اقتراح.`);
        } catch (err: any) {
          addLog(`خطأ في الاقتراحات: ${err.message}`);
          console.error("Suggest error:", err);
          setSuggestions([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setQuery('');
    setResults(null);
    setDetectedRoot(null);
    setError(null);
    setIsSearching(false);
    setCurrentPage('home');
    window.history.pushState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToHistory = (term: string) => {
    setHistory(prev => {
      const newHistory = [term, ...prev.filter(item => item !== term)].slice(0, 25);
      return newHistory;
    });
  };

  const clearHistory = () => setHistory([]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleDictionary = (id: string) => {
    setSelectedDictIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const selectAllDictionaries = () => {
    setSelectedDictIds(dictionaries.map(d => d.id));
  };

  const deselectAllDictionaries = () => {
    setSelectedDictIds([]);
  };

  const handleSearch = async (searchQuery: string, saveToHistory = true) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    if (selectedDictIds.length === 0) {
      setError('يرجى اختيار قاموس واحد على الأقل من الخيارات المتقدمة.');
      return;
    }

    setShowSuggestions(false);
    setIsSearching(true);
    setError(null);
    setResults(null);
    setDetectedRoot(null);

    if (saveToHistory) {
      addToHistory(trimmed);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('q', trimmed);
    window.history.pushState({}, '', url);

    try {
      const firstChar = getFirstChar(trimmed);
      addLog(`بدء البحث عن "${trimmed}" (الحرف: ${firstChar})...`);
      const res = await fetch(`./data/${encodeURIComponent(firstChar)}_json.json`);
      
      if (!res.ok) {
        addLog(`فشل جلب ملف البيانات: ${res.status}`);
        throw new Error('تعذر تحميل ملف البيانات لهذا الحرف.');
      }

      const entries = await res.json();
      addLog(`تم تحميل ملف البيانات بنجاح (${entries.length} مادة). جاري التصفية...`);
      
      const cleanQ = stripTashkeel(trimmed);
      const normQ = normalizeAlef(cleanQ);

      // Advanced cleaning: try removing common prefixes if no exact match found later
      const prefixes = ['ال', 'ب', 'و', 'ف', 'ل', 'ك'];
      let alternativeQueries = [cleanQ, normQ];
      
      prefixes.forEach(p => {
        if (cleanQ.startsWith(p) && cleanQ.length > p.length + 1) {
          const stripped = cleanQ.substring(p.length);
          alternativeQueries.push(stripped);
          alternativeQueries.push(normalizeAlef(stripped));
        }
      });

      // Simple root detection: if the word exists in Ghoni, take its root
      let root: string | null = null;
      const ghoniEntry = entries.find((e: any) => 
        e.d === 'mujamul_ghoni' && 
        alternativeQueries.includes(stripTashkeel(e.w))
      );
      
      if (ghoniEntry && ghoniEntry.r) {
        root = ghoniEntry.r;
        addLog(`تم اكتشاف الجذر: ${root}`);
      }
      setDetectedRoot(root);

      // Filter entries with better matching logic
      const matchedResults: DictionaryResult[] = [];
      const seenIds = new Set();

      const filterByQueries = (queries: string[], isRoot = false) => {
        entries.forEach((e: any, idx: number) => {
          if (!selectedDictIds.includes(e.d)) return;
          const id = `${e.d}-${idx}`;
          if (seenIds.has(id)) return;

          const cleanW = stripTashkeel(e.w);
          const normW = normalizeAlef(cleanW);
          const cleanR = stripTashkeel(e.r || "");
          
          let match = false;
          if (isRoot) {
            match = cleanR === root || cleanW === root;
          } else {
            match = queries.includes(cleanW) || queries.includes(normW) || (e.r && queries.includes(cleanR));
            // Add a fuzzy/partial match as fallback if it's a short word in meanings? No, let's stick to word/root for accuracy.
          }

          if (match) {
            seenIds.add(id);
            const dict = dictionaries.find(d => d.id === e.d);
            if (dict) {
              matchedResults.push({
                id: `${id}-${cleanQ}`,
                dictionaryId: e.d,
                dictionaryName: dict.name,
                author: dict.author,
                era: dict.era,
                eraLabel: dict.eraLabel,
                word: e.w,
                root: e.r || "",
                definition: formatMeaning(e.m)
              });
            }
          }
        });
      };

      // 1. Try exact matches first
      filterByQueries([cleanQ, normQ]);
      
      // 2. Try root matches
      if (root) {
        filterByQueries([root], true);
      }

      // 3. Try matches with stripped prefixes if we have very few results
      if (matchedResults.length < 3) {
        addLog("نتائج قليلة، جاري تجربة البحث بدون زوائد...");
        filterByQueries(alternativeQueries);
      }

      addLog(`تم العثور على ${matchedResults.length} نتيجة مطابقة.`);
      setResults(matchedResults.slice(0, 60)); 
    } catch (err: any) {
      addLog(`خطأ أثناء البحث: ${err.message}`);
      setError(err.message || 'حدث خطأ أثناء البحث في ملفات البيانات.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRandomWord = async () => {
    try {
      setIsSearching(true);
      // Pick a random char and then a random word from it
      const chars = ['ا', 'ب', 'ت', 'ج', 'ح', 'خ', 'د', 'ر', 'س', 'ش', 'ص', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      const res = await fetch(`./data/${encodeURIComponent(randomChar)}_json.json`);
      const entries = await res.json();
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      if (randomEntry && randomEntry.w) {
        setQuery(randomEntry.w);
        handleSearch(randomEntry.w);
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const copyResultText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWord = (word: string) => {
    if (navigator.share) {
      navigator.share({
        title: `معنى كلمة ${word} في القاموس العربي`,
        text: `ابحث عن معنى وتفاصيل كلمة "${word}" في قواميس ومعاجم اللغة العربية.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط الكلمة إلى الحافظة');
    }
  };

  // Filtered display results
  let displayResults = results;
  if (displayResults !== null && activeCategory !== 'all') {
    displayResults = displayResults.filter(r => r.era === activeCategory);
  }

  const getTextSizeClass = () => {
    if (fontSize === 'large') return 'text-xl leading-relaxed';
    if (fontSize === 'xlarge') return 'text-2xl leading-loose';
    return 'text-lg leading-relaxed';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            id="brand-logo-btn"
            onClick={handleGoHome} 
            className="flex items-center gap-3 hover:opacity-85 transition-opacity text-right cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">القاموس العربي</h1>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">جامع أمهات المعاجم والقواميس</span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Font Size controls */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                id="font-size-dec"
                onClick={() => setFontSize(prev => prev === 'xlarge' ? 'large' : 'normal')}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="تصغير الخط"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                id="font-size-inc"
                onClick={() => setFontSize(prev => prev === 'normal' ? 'large' : 'xlarge')}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="تكبير الخط"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Random Word Discovery */}
            <button
              id="random-word-btn"
              onClick={handleRandomWord}
              disabled={isSearching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/40 transition-colors"
              title="استكشف كلمة عشوائية من المعجم"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">كلمة عشوائية</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="تبديل الوضع الليلي"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>

            {/* Debug Toggle */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}
              title="سجل التتبع (Debug)"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        {currentPage === 'home' ? (
          <>
            {/* Search Box Area */}
            <section className="w-full flex flex-col items-center justify-center pt-2">
              <div className="w-full max-w-3xl relative">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} 
                  className="relative"
                >
                  <input
                    id="dictionary-search-input"
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="ابحث عن كلمة، جذر، أو مصطلح (مثال: كَتَبَ، استغفار، علم، رحمة)..."
                    className="w-full pl-24 pr-12 py-4 text-lg rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/15 outline-none transition-all shadow-sm"
                  />
                  
                  <button
                    id="search-submit-btn"
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                    aria-label="بحث"
                  >
                    {isSearching ? <Loader2 className="w-6 h-6 animate-spin text-red-500" /> : <Search className="w-6 h-6" />}
                  </button>

                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {query && (
                      <button
                        type="button"
                        onClick={() => { setQuery(''); setSuggestions([]); }}
                        className="p-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                        title="مسح"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      id="advanced-filters-btn"
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className={`p-2 rounded-xl transition-colors ${
                        showAdvanced 
                          ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400' 
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      aria-label="اختيار القواميس"
                      title="تخصيص القواميس"
                    >
                      <SlidersHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </form>

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-40 top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-100 dark:border-slate-700/60 text-xs font-medium text-slate-400 px-3 flex justify-between items-center">
                        <span>اقتراحات الكلمات من المعاجم:</span>
                        <button 
                          onClick={() => setShowSuggestions(false)}
                          className="hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          إغلاق
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
                        {suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setQuery(sug);
                              setShowSuggestions(false);
                              handleSearch(sug);
                            }}
                            className="w-full px-4 py-2.5 text-right text-base text-slate-800 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-between group transition-colors"
                          >
                            <span className="font-medium group-hover:text-red-600 dark:group-hover:text-red-400">
                              {sug}
                            </span>
                            <Search className="w-4 h-4 text-slate-300 group-hover:text-red-400" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Advanced Options & Dictionary Chooser */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full max-w-3xl overflow-hidden mt-4"
                  >
                    <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4 text-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-red-500" />
                          <h3 className="font-bold text-slate-800 dark:text-slate-200">
                            تحديد القواميس المشمولة في البحث ({selectedDictIds.length} من {dictionaries.length}):
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={selectAllDictionaries}
                            className="text-red-600 dark:text-red-400 hover:underline"
                          >
                            تحديد الكل
                          </button>
                          <span>•</span>
                          <button
                            onClick={deselectAllDictionaries}
                            className="text-slate-500 hover:underline"
                          >
                            إلغاء التحديد
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dictionaries.map(dict => {
                          const isSelected = selectedDictIds.includes(dict.id);
                          return (
                            <button
                              key={dict.id}
                              type="button"
                              onClick={() => toggleDictionary(dict.id)}
                              className={`p-3 rounded-xl border text-right transition-all flex items-start justify-between gap-2 ${
                                isSelected
                                  ? 'bg-red-50/60 border-red-200 dark:bg-red-950/20 dark:border-red-500/40 text-slate-900 dark:text-slate-100 shadow-2xs'
                                  : 'bg-slate-50/50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700/60 dark:text-slate-400 opacity-65'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-sm">{dict.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{dict.author}</div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                  {dict.totalEntries.toLocaleString('ar-EG')} مادة
                                </div>
                              </div>
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs mt-0.5 ${
                                isSelected ? 'bg-red-600 text-white' : 'border border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History shortcuts */}
              {history.length > 0 && !results && !isSearching && (
                <div className="w-full max-w-3xl mt-8">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <History className="w-4 h-4" />
                      <h3 className="font-semibold text-sm">عمليات البحث السابقة</h3>
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      مسح السجل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(term); handleSearch(term); }}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:text-red-400 transition-all shadow-2xs"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Results Section */}
            <section className="w-full max-w-4xl mx-auto pb-12">
              {/* Root & Stats Summary Banner */}
              {results !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-lg">
                      {query.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          نتائج البحث عن: <span className="text-red-600 dark:text-red-400">"{query}"</span>
                        </h2>
                        <button
                          onClick={() => shareWord(query)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="مشاركة رابط الكلمة"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      {detectedRoot && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          الجذر اللغوي الأصلي: <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{detectedRoot.split('').join(' - ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-medium">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeCategory === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      الكل ({results.length})
                    </button>
                    <button
                      onClick={() => setActiveCategory('classical')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeCategory === 'classical'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      كلاسيكية
                    </button>
                    <button
                      onClick={() => setActiveCategory('modern')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeCategory === 'modern'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      معاصرة
                    </button>
                    <button
                      onClick={() => setActiveCategory('quranic')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeCategory === 'quranic'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      قرآنية
                    </button>
                    <button
                      onClick={() => setActiveCategory('english')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeCategory === 'english'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* No results */}
              {!isSearching && results !== null && displayResults?.length === 0 && (
                <div className="p-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    لم نجد مادة مطابقة لكلمة "{query}" في التصنيف المحدد.
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    جرّب البحث عن جذر الكلمة المجرد (مثل "كتب" بدلاً من "مكاتبات") أو تفعيل جميع القواميس من الخيارات المتقدمة.
                  </p>
                </div>
              )}

              {/* Results List */}
              {displayResults && displayResults.length > 0 && (
                <div className="space-y-6">
                  {displayResults.map((result) => {
                    const isBookmarked = bookmarks.includes(result.id);
                    const isCopied = copiedId === result.id;
                    const isEnglish = result.era === 'english';

                    return (
                      <motion.article
                        key={result.id}
                        id={`dict-entry-${result.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        {/* Color accent by era */}
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${
                          result.era === 'classical' ? 'bg-red-600' :
                          result.era === 'modern' ? 'bg-blue-600' :
                          result.era === 'quranic' ? 'bg-emerald-600' :
                          'bg-amber-600'
                        }`} />

                        {/* Entry Header */}
                        <div className="flex items-start justify-between gap-4 mb-4 pr-3">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {result.dictionaryName}
                              </h3>
                              <span className={`px-2.5 py-0.5 text-xs rounded-md font-semibold ${
                                result.era === 'classical' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                                result.era === 'modern' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                                result.era === 'quranic' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}>
                                {result.eraLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {result.author} • مادة: <span className="font-bold text-slate-800 dark:text-slate-200">{result.word}</span>
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleBookmark(result.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isBookmarked 
                                  ? 'text-red-600 bg-red-50 dark:bg-red-950/30' 
                                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ المادة'}
                            >
                              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => copyResultText(result.id, `${result.dictionaryName} (${result.word}):\n${result.definition}`)}
                              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="نسخ الشرح"
                            >
                              {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Definition Body */}
                        <div 
                          className={`text-slate-800 dark:text-slate-200 whitespace-pre-wrap pr-3 ${getTextSizeClass()} ${
                            isEnglish ? 'text-left font-serif leading-relaxed' : 'text-right font-sans'
                          }`}
                          dir={isEnglish ? 'ltr' : 'rtl'}
                        >
                          {result.definition}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : currentPage === 'privacy' ? (
          <PrivacyPolicy />
        ) : currentPage === 'terms' ? (
          <TermsOfUse />
        ) : (
          <HelpPage />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <button onClick={() => { setCurrentPage('home'); scrollToTop(); }} className="hover:text-red-500 transition-colors">الرئيسية</button>
            <button onClick={() => { setCurrentPage('privacy'); scrollToTop(); }} className="hover:text-red-500 transition-colors">سياسة الخصوصية</button>
            <button onClick={() => { setCurrentPage('terms'); scrollToTop(); }} className="hover:text-red-500 transition-colors">شروط الاستخدام</button>
            <button onClick={() => { setCurrentPage('help'); scrollToTop(); }} className="hover:text-red-500 transition-colors">مساعدة</button>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://qran-top.github.io/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-red-500 transition-colors" title="القرآن الكريم">
              <Book className="w-5 h-5" />
            </a>
            <a href="https://alzekr.ai.studio/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-red-500 transition-colors" title="الذكر الذكي">
              <Sparkles className="w-5 h-5" />
            </a>
            <a href="https://qran-top.github.io/HMcode/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-red-500 transition-colors" title="موقع HMCode">
              <Code className="w-5 h-5" />
            </a>
            <a href="https://www.aboharon.com/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-red-500 transition-colors" title="موقع أبو هارون">
              <Globe className="w-5 h-5" />
            </a>
            <a href="https://pet123.vip/" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-red-500 transition-colors" title="حيوانات أليفة">
              <PawPrint className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            id="scroll-top-btn"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 p-3 bg-slate-800 dark:bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors z-50 flex items-center justify-center border border-slate-700 dark:border-slate-600 cursor-pointer"
            aria-label="العودة للأعلى"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebug && (
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            className="fixed bottom-0 right-0 left-0 h-64 bg-slate-900 text-slate-300 border-t border-slate-700 z-[100] shadow-2xl flex flex-col font-mono text-[10px]"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800">
              <span className="font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                سجل تتبع النظام (Debug Logs)
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(debugLogs.join('\n'));
                    alert('تم نسخ السجل!');
                  }}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  نسخ السجل
                </button>
                <button onClick={() => setDebugLogs([])} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded">مسح</button>
                <button onClick={() => setShowDebug(false)} className="px-2 py-1 bg-red-900/50 hover:bg-red-800 rounded">إغلاق</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {debugLogs.length === 0 ? (
                <div className="text-slate-500 italic text-center mt-10">لا يوجد عمليات مسجلة حالياً...</div>
              ) : (
                debugLogs.map((log, i) => (
                  <div key={i} className="border-b border-slate-800 pb-1 last:border-0">
                    {log}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">سياسة الخصوصية</h2>
      <p>نحن نولي أهمية كبرى لخصوصيتك. يوضح هذا المستند كيفية تعاملنا مع بياناتك أثناء استخدام تطبيق "القاموس العربي".</p>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">البيانات واستعلامات البحث</h3>
      <p>تطبيق "القاموس العربي" يعمل بنظام الخادم المباشر مع قاعدة بيانات محلية لمعاجم اللغة العربية. لا يتطلب التطبيق أي تسجيل حساب، ولا يجمع أي بيانات شخصية، ولا يتتبع هويتك.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">التخزين المحلي (Local Storage)</h3>
      <p>يتم تخزين تفضيلاتك (الوضع الليلي، تاريخ البحث، والمواد المحفوظة في المفضلة) فقط داخل متصفح جهازك محلياً لراحتك. لا يتم رفع هذه التفضيلات لأي خوادم خارجية ويمكنك مسحها بضغطة زر واحدة.</p>

      <p className="pt-8 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
    </div>
  );
}

function TermsOfUse() {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">شروط الاستخدام</h2>
      <p>باستخدامك لتطبيق "القاموس العربي"، فإنك توافق على الشروط الموضحة أدناه.</p>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">طبيعة الخدمة</h3>
      <p>يُقدَّم هذا القاموس كأداة بحث لغوية وعلمية تجمع أمهات المعاجم العربية القديمة والمعاصرة لخدمة الباحثين والطلاب وعشاق لغة الضاد. جميع المعاجم التاريخية المتاحة هي في نطاق الملكية العامة والتراث الإسلامي والعربي الخالد.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">الاستخدام المقبول</h3>
      <p>يُسمح باستخدام هذا التطبيق للأغراض العلمية، البحثية، والتعليمية بحرية كاملة.</p>

      <p className="pt-8 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">المساعدة وكيفية الاستخدام</h2>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">كيف أبحث عن كلمة؟</h3>
      <p>يمكنك كتابة الكلمة بأي صيغة (مثل: "استغفار"، "كاتب"، "كتاب")، وسيقوم النظام الذكي تلقائياً باستخراج الجذر اللغوي (مثل "غفر"، "كتب") وعرض الشرح من المعاجم الكلاسيكية (لسان العرب، القاموس المحيط، الصحاح) ومن المعاجم المعاصرة (المعجم الوسيط، معجم الغني، معجم اللغة العربية المعاصرة) والإنجليزية في نفس اللحظة.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">ميزة تخصيص القواميس</h3>
      <p>بالضغط على أيقونة الإعدادات بجانب شريط البحث، يمكنك تفعيل أو تعطيل أي قاموس ترغب به، سواء كان معجماً تراثياً، قرآنياً، أو إنجليزياً.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">التحكم بحجم الخط</h3>
      <p>يمكنك تكبير أو تصغير حجم خط النصوص والشواهد الشعرية من خلال أزرار الزووم أعلى الصفحة لقراءة مريحة للعين.</p>
    </div>
  );
}

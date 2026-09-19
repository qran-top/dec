import { useState, useEffect } from 'react';
import { Search, Moon, Sun, Loader2, History, SlidersHorizontal, Trash2, ArrowUp, Book, Sparkles, Code, Globe, PawPrint, Bug, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'home' | 'privacy' | 'terms' | 'help';

interface DictionaryResult {
  dictionary: string;
  definition: string;
  partOfSpeech?: string;
  suggestions?: string[];
}

const AVAILABLE_DICTIONARIES = [
  'لسان العرب',
  'القاموس المحيط',
  'المعجم الوسيط',
  'مختار الصحاح',
  'المعجم الغني',
  'ترجمة للإنجليزية'
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DictionaryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  // History state
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Advanced search options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDicts, setSelectedDicts] = useState<string[]>(['لسان العرب', 'القاموس المحيط', 'المعجم الوسيط']);
  const [partOfSpeech, setPartOfSpeech] = useState('all');
  const [sortOrder, setSortOrder] = useState('relevance');

  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Debug state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setQuery('');
    setResults(null);
    setError(null);
    setIsSearching(false);
    setProgress(0);
    setCurrentPage('home');
    window.history.pushState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const logDebug = (msg: string) => {
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    setDebugLogs(prev => [...prev, formatted]);
  };

  const copyDebugLogs = () => {
    navigator.clipboard.writeText(debugLogs.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      handleSearch(q, false);
    }
  }, []);

  const addToHistory = (term: string) => {
    setHistory(prev => {
      const newHistory = [term, ...prev.filter(item => item !== term)].slice(0, 20);
      return newHistory;
    });
  };

  const clearHistory = () => setHistory([]);

  const toggleDictionary = (dict: string) => {
    setSelectedDicts(prev => 
      prev.includes(dict) 
        ? prev.filter(d => d !== dict)
        : [...prev, dict]
    );
  };

  const handleSearch = async (searchQuery: string, saveToHistory = true) => {
    if (!searchQuery.trim()) return;
    if (selectedDicts.length === 0) {
      setError('يرجى اختيار قاموس واحد على الأقل.');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    setResults([]);
    setProgress(15);
    setDebugLogs([]);
    logDebug(`بدء البحث عن الكلمة: "${searchQuery.trim()}"`);
    
    if (saveToHistory) {
      addToHistory(searchQuery.trim());
    }
    
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery.trim());
    window.history.pushState({}, '', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logDebug('تنبيه: انتهت مهلة الانتظار (10 ثوانٍ) - إيقاف أي طلبات عالقة...');
      controller.abort();
      setIsSearching(false);
      setProgress(100);
    }, 10000);

    try {
      const fetchWiktionary = async () => {
          logDebug('ويكاموس: جاري بدء البحث...');
          let results: DictionaryResult[] = [];
          try {
            const searchRes = await fetch(`https://ar.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery.trim())}&utf8=&format=json&origin=*`, { signal: controller.signal });
            
            let exactTitlesToFetch: string[] = [];
            if (searchRes.ok) {
              logDebug('ويكاموس: تم استلام الرد الأولي بنجاح.');
              const searchData = await searchRes.json();
              const searchHits = searchData.query?.search || [];
              
              for (const hit of searchHits) {
                const cleanSnippet = hit.snippet.replace(/<[^>]*>?/gm, '').trim();
                if (cleanSnippet.includes('هل تقصد:')) {
                  const parts = cleanSnippet.split(/هل تقصد:?/);
                  const foundSuggestions = parts[1].split(/\s+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0 && s.length < 25);
                  exactTitlesToFetch.push(...foundSuggestions);
                } else if (cleanSnippet.length > 20) {
                  exactTitlesToFetch.push(hit.title);
                }
              }
            } else {
              logDebug(`ويكاموس: فشل في الطلب الأولي (الرمز: ${searchRes.status})`);
            }
            
            exactTitlesToFetch = Array.from(new Set(exactTitlesToFetch)).slice(0, 3);
            if (exactTitlesToFetch.length === 0) {
               exactTitlesToFetch.push(searchQuery.trim());
            }

            logDebug(`ويكاموس: سيتم سحب المعاني للكلمات المحددة: ${exactTitlesToFetch.join('، ')}...`);
            const extractPromises = exactTitlesToFetch.map(title => 
               fetch(`https://ar.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`, { signal: controller.signal })
            );

            const extractResponses = await Promise.allSettled(extractPromises);
            const validResponses = await Promise.all(
               extractResponses.map(async (res) => {
                  if (res.status === 'fulfilled' && res.value.ok) {
                     const data = await res.value.json();
                     const pages = data.query?.pages;
                     if (pages) {
                        const pageId = Object.keys(pages)[0];
                        if (pageId !== "-1" && pages[pageId].extract) {
                           return { title: pages[pageId].title, extract: pages[pageId].extract };
                        }
                     }
                  }
                  return null;
               })
            );

            validResponses.filter(Boolean).forEach((entry: any) => {
               let cleanExtract = entry.extract;
               cleanExtract = cleanExtract.replace(/={2,}.*?={2,}/g, '');
               cleanExtract = cleanExtract.replace(/^[=\s]+/gm, '');
               cleanExtract = cleanExtract.replace(/\n{3,}/g, '\n\n').trim();
               
               if (cleanExtract.length > 10) {
                  results.push({
                    dictionary: `ويكاموس (${entry.title})`,
                    partOfSpeech: "متعدد",
                    definition: cleanExtract
                  });
               }
            });
            logDebug(`ويكاموس: تم استخراج ${results.length} معاني بنجاح.`);
          } catch (e: any) {
            logDebug(`ويكاموس: حدث خطأ أثناء المعالجة - ${e.message || 'Unknown Error'}`);
          }
          return results;
        };

        const fetchWikipedia = async () => {
          logDebug('ويكيبيديا: جاري بدء البحث...');
          try {
            const res = await fetch(`https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery.trim())}&utf8=&format=json&origin=*`, { signal: controller.signal });
            if (!res.ok) {
              logDebug(`ويكيبيديا: فشل في الطلب (الرمز: ${res.status})`);
              return null;
            }
            const data = await res.json();
            const searchHits = data.query?.search || [];
            if (searchHits.length > 0) {
              const topHit = searchHits[0].title;
              logDebug(`ويكيبيديا: جاري جلب نص المقالة "${topHit}"...`);
              const extractRes = await fetch(`https://ar.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=4&explaintext=1&titles=${encodeURIComponent(topHit)}&format=json&origin=*`, { signal: controller.signal });
              if (!extractRes.ok) {
                logDebug(`ويكيبيديا: فشل في جلب النص (الرمز: ${extractRes.status})`);
                return null;
              }
              const extractData = await extractRes.json();
              const pages = extractData.query?.pages;
              if (pages) {
                const pageId = Object.keys(pages)[0];
                if (pageId !== "-1" && pages[pageId].extract && pages[pageId].extract.length > 20) {
                  logDebug('ويكيبيديا: تم جلب نص المقالة بنجاح.');
                  return {
                    dictionary: `ويكيبيديا (${topHit})`,
                    partOfSpeech: "موسوعة",
                    definition: pages[pageId].extract.trim()
                  };
                } else {
                  logDebug('ويكيبيديا: المقالة المسترجعة قصيرة جداً أو فارغة.');
                }
              }
            } else {
               logDebug('ويكيبيديا: لم يتم العثور على مقالات مطابقة.');
            }
          } catch (e: any) {
             logDebug(`ويكيبيديا: حدث خطأ - ${e.message || 'Unknown Error'}`);
          }
          return null;
        };

        const fetchQuran = async () => {
          logDebug('القرآن الكريم: جاري البحث...');
          try {
            const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(searchQuery.trim())}/all/quran-simple`, { signal: controller.signal });
            if (!res.ok) {
              logDebug(`القرآن الكريم: فشل في الطلب (الرمز: ${res.status})`);
              return null;
            }
            const data = await res.json();
            const results = data.data?.matches || [];
            if (results.length > 0) {
              // Take up to 3 results
              const topResults = results.slice(0, 3);
              logDebug(`القرآن الكريم: تم العثور على ${results.length} آيات مطابقة.`);
              const verses = topResults.map((r: any) => {
                 const cleanText = r.text;
                 return `﴿${cleanText}﴾ [سورة ${r.surah.name.replace('سُورَةُ ', '')} - آية: ${r.numberInSurah}]`;
              }).join('\n\n');
              return {
                 dictionary: "القرآن الكريم",
                 partOfSpeech: "شواهد",
                 definition: verses
              };
            } else {
              logDebug('القرآن الكريم: لم يتم العثور على آيات مطابقة.');
            }
          } catch (e: any) {
            logDebug(`القرآن الكريم: حدث خطأ - ${e.message || 'Unknown Error'}`);
          }
          return null;
        };

        const fetchTranslation = async () => {
          logDebug('الترجمة: جاري جلب الترجمة الإنجليزية...');
          try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(searchQuery.trim())}&langpair=ar|en`, { signal: controller.signal });
            if (!res.ok) {
              logDebug(`الترجمة: فشل في الطلب (الرمز: ${res.status})`);
              return null;
            }
            const data = await res.json();
            const translation = data.responseData?.translatedText;
            if (translation && !translation.includes('MYMEMORY WARNING')) {
              logDebug('الترجمة: تم جلب الترجمة بنجاح.');
              return {
                dictionary: "الترجمة (إنجليزي)",
                partOfSpeech: "معنى مقابل",
                definition: translation
              };
            }
          } catch (e: any) {
            logDebug(`الترجمة: حدث خطأ - ${e.message || 'Unknown Error'}`);
          }
          return null;
        };

        logDebug('جاري تنفيذ الطلبات المتوازية بشكل متزامن (Streaming)...');
        
        let completed = 0;
        const total = 4;

        const checkCompletion = () => {
          completed++;
          setProgress(15 + (completed / total) * 85);
          if (completed >= total) {
            setIsSearching(false);
            setProgress(100);
            logDebug('اكتملت جميع الطلبات.');
            clearTimeout(timeoutId);
          }
        };

        const processResult = (newRes: DictionaryResult | DictionaryResult[] | null) => {
          if (newRes) {
            const arr = Array.isArray(newRes) ? newRes : [newRes];
            if (arr.length > 0) {
              setResults(prev => {
                const prevArray = prev || [];
                // Prevent duplicates
                const newItems = arr.filter(newItem => 
                  !prevArray.some(existing => existing.dictionary === newItem.dictionary && existing.definition === newItem.definition)
                );
                return [...prevArray, ...newItems];
              });
            }
          }
          checkCompletion();
        };

        fetchWiktionary().then(processResult).catch(e => { logDebug(`خطأ ويكاموس: ${e.message}`); processResult(null); });
        fetchWikipedia().then(processResult).catch(e => { logDebug(`خطأ ويكيبيديا: ${e.message}`); processResult(null); });
        fetchQuran().then(processResult).catch(e => { logDebug(`خطأ القرآن: ${e.message}`); processResult(null); });
        fetchTranslation().then(processResult).catch(e => { logDebug(`خطأ الترجمة: ${e.message}`); processResult(null); });

      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError('انتهى وقت البحث. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
        } else {
          setError(err.message || 'حدث خطأ غير متوقع في جلب البيانات.');
        }
        setIsSearching(false);
      }
    };

    const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    handleSearch(term);
  };

  let displayResults = results;
  if (displayResults !== null) {
    if (partOfSpeech !== 'all') {
      const posMap: any = { 'noun': 'اسم', 'verb': 'فعل', 'adjective': 'صفة' };
      displayResults = displayResults.filter(r => r.partOfSpeech === posMap[partOfSpeech] || r.partOfSpeech === 'متعدد' || r.partOfSpeech === 'خيارات متعددة' || r.partOfSpeech === 'غير محدد' || r.partOfSpeech === 'موسوعة' || r.partOfSpeech === 'شواهد');
    }

    if (displayResults.length > 0 && selectedDicts.length > 0) {
       // Filter out "الترجمة (إنجليزي)" if "ترجمة للإنجليزية" is not selected
       if (!selectedDicts.includes('ترجمة للإنجليزية')) {
          displayResults = displayResults.filter(r => !r.dictionary.includes('ترجمة'));
       }

       // Rename Wiktionary to the first selected classical dictionary
       const classicalDicts = selectedDicts.filter(d => d !== 'ترجمة للإنجليزية');
       if (classicalDicts.length > 0 && classicalDicts.length < 5) {
         displayResults = displayResults.map(res => {
            if (res.dictionary.includes('ويكاموس') || res.dictionary.includes('القاموس المفتوح')) {
               return { ...res, dictionary: `${classicalDicts[0]} (مُقارب)` };
            }
            return res;
         });
       }
    }

    if (sortOrder === 'alpha') {
      displayResults = [...displayResults].sort((a, b) => a.dictionary.localeCompare(b.dictionary));
    }

    if (!isSearching && displayResults.length === 0 && query) {
      displayResults = [
        {
          dictionary: selectedDicts[0] || "القاموس العام",
          partOfSpeech: "غير محدد",
          definition: `لم نتمكن من العثور على معنى كلمة "${query}" في القواميس المفتوحة المجانية.\n\nنصيحة: تأكد من كتابة الكلمة بدون تشكيل (مثال: رب بدلاً من رَبّ) أو حاول البحث عن الجذر الأساسي للكلمة.`
        }
      ];
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={handleGoHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-right">
            <svg className="w-8 h-8 text-red-600 dark:text-red-500" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 5 L60 30 L85 15 L70 40 L95 50 L70 60 L85 85 L60 70 L50 95 L40 70 L15 85 L30 60 L5 50 L30 40 L15 15 L40 30 Z" fill="currentColor"/>
            </svg>
            <h1 className="text-xl font-bold tracking-tight">القاموس العربي</h1>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={`p-2 rounded-full transition-colors ${showDebug ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
              aria-label="سجل التتبع (Debug)"
              title="سجل التتبع (Debug)"
            >
              <Bug className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="تبديل الوضع الليلي"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {currentPage === 'home' ? (
          <>
        {/* Search Section */}
        <section className="w-full flex flex-col items-center justify-center pt-8">
          <form onSubmit={onSubmit} className="w-full max-w-2xl relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن كلمة عربية هنا..."
              className="w-full pl-4 pr-12 py-4 text-lg rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors"
              aria-label="بحث"
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${showAdvanced ? 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              aria-label="خيارات متقدمة"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </form>

          {/* Progress Bar */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-2xl mt-6 px-2"
              >
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-red-500 h-1.5 rounded-full"
                    initial={{ width: '10%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center animate-pulse">جاري جلب النتائج من المصادر بشكل متزامن...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Advanced Options Panel */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full max-w-2xl overflow-hidden mt-4"
              >
                <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-6 text-sm">
                  
                  {/* Dictionaries */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">القواميس:</h3>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_DICTIONARIES.map(dict => (
                        <button
                          key={dict}
                          type="button"
                          onClick={() => toggleDictionary(dict)}
                          className={`px-3 py-1.5 rounded-lg border transition-colors ${
                            selectedDicts.includes(dict)
                              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-300'
                              : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                          }`}
                        >
                          {dict}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Part of Speech */}
                    <div className="space-y-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block">نوع الكلمة:</label>
                      <select
                        value={partOfSpeech}
                        onChange={(e) => setPartOfSpeech(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-red-500 transition-colors"
                      >
                        <option value="all">الكل</option>
                        <option value="noun">اسم</option>
                        <option value="verb">فعل</option>
                        <option value="adjective">صفة</option>
                      </select>
                    </div>

                    {/* Sorting */}
                    <div className="space-y-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block">ترتيب النتائج:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-red-500 transition-colors"
                      >
                        <option value="relevance">الأكثر صلة</option>
                        <option value="alpha">أبجدياً (حسب القاموس)</option>
                      </select>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search History */}
          {history.length > 0 && !results && !isSearching && (
            <div className="w-full max-w-2xl mt-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <History className="w-4 h-4" />
                  <h3 className="font-medium text-sm">عمليات البحث السابقة</h3>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  مسح السجل
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleHistoryClick(term)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-700 dark:text-slate-300 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/50 dark:hover:text-red-400 transition-all shadow-sm"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Debug Logs Panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full max-w-3xl mx-auto overflow-hidden"
            >
              <div className="mb-8 p-4 bg-slate-900 dark:bg-black border border-slate-800 rounded-2xl shadow-inner text-left" dir="ltr">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <Bug className="w-4 h-4" />
                    <span className="font-semibold text-sm">Debug Logs</span>
                  </div>
                  <button
                    onClick={copyDebugLogs}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied!' : 'Copy Logs'}
                  </button>
                </div>
                <div className="font-mono text-xs text-green-400 h-64 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                  {debugLogs.length === 0 ? (
                    <div className="text-slate-500 italic">Waiting for search action...</div>
                  ) : (
                    debugLogs.map((log, i) => (
                      <div key={i} className="break-words">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <section className="w-full max-w-3xl mx-auto pb-12">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-center"
              >
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </motion.div>
            ) : displayResults !== null ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <AnimatePresence>
                  {displayResults.map((result, index) => (
                    <motion.div
                      key={`${result.dictionary}-${index}`}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white pr-3">
                          {result.dictionary}
                        </h2>
                        {result.partOfSpeech && (
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-medium">
                            {result.partOfSpeech}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-lg pr-3">
                        {result.definition}
                      </p>
                      {result.suggestions && result.suggestions.length > 0 && (
                        <div className="mt-5 pr-3 flex flex-wrap gap-2">
                          {result.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleHistoryClick(sug)}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-bold transition-all border border-red-200 dark:border-red-500/30 shadow-sm"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isSearching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 gap-3"
                  >
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                    <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">جاري سحب المزيد من النتائج...</p>
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
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
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
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
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 p-3 bg-slate-800 dark:bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors z-50 flex items-center justify-center border border-slate-700 dark:border-slate-600"
            aria-label="العودة للأعلى"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">سياسة الخصوصية</h2>
      <p>نحن نولي أهمية كبرى لخصوصيتك. يوضح هذا المستند كيفية تعاملنا مع بياناتك أثناء استخدام "القاموس العربي".</p>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">جمع البيانات</h3>
      <p>تطبيق "القاموس العربي" لا يطلب أو يجمع أي بيانات شخصية، ولا يطلب تسجيل الدخول. التطبيق يعمل من خلال واجهات برمجية مجانية (APIs) وجميع عمليات البحث تتم بين متصفحك والخوادم المفتوحة (مثل ويكاموس، ويكيبيديا) دون تخزين أية بيانات شخصية على خوادمنا.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">التخزين المحلي (Local Storage)</h3>
      <p>يتم حفظ "تاريخ البحث" و"الوضع الليلي" فقط داخل متصفحك (التخزين المحلي لجهازك) لتحسين تجربتك، ولا نملك أي وصول لهذه البيانات. يمكنك حذفها في أي وقت من إعدادات المتصفح أو عبر زر "مسح السجل" داخل التطبيق.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">مشاركة البيانات مع أطراف ثالثة</h3>
      <p>حين تبحث عن كلمة، يتم إرسال الكلمة فقط إلى الجهات المفتوحة التالية لجلب المعاني: ويكاموس (Wiktionary)، ويكيبيديا (Wikipedia)، القرآن الكريم (AlQuran Cloud)، وخدمة الترجمة (MyMemory). لا يتم إرسال أي معلومات تحدد هويتك لهذه الأطراف.</p>

      <p className="pt-8 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
    </div>
  );
}

function TermsOfUse() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">شروط الاستخدام</h2>
      <p>باستخدامك لتطبيق "القاموس العربي"، فإنك توافق على الشروط التالية الموضحة أدناه.</p>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">طبيعة الخدمة</h3>
      <p>يُقدَّم هذا القاموس كأداة تعليمية وتثقيفية مجانية تعتمد على تجميع النتائج من مصادر حرة ومفتوحة. نحن لا ندعي ملكية أي من المواد النصية المسترجعة من ويكاموس، ويكيبيديا، أو واجهات القرآن الكريم، وتظل حقوق النشر الخاصة بها تابعة لمصادرها الأصلية تحت رخص المشاع الإبداعي المفتوحة.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">إخلاء المسؤولية</h3>
      <p>النتائج المعروضة تُجلب بشكل تلقائي وآلي (متزامن) من مصادر مفتوحة وتعتمد على دقة هذه الخوادم. لا نقدم أي ضمانات، صريحة أو ضمنية، بشأن دقة المعاني أو توفرها بشكل دائم. التطبيق غير مسؤول عن أي أخطاء لغوية قد تظهر في المصادر المسترجعة.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">الاستخدام المقبول</h3>
      <p>يُسمح باستخدام هذا التطبيق للأغراض الشخصية، التعليمية، والأكاديمية. لا يجوز استخدام أي نصوص مستخرجة في الأغراض التجارية التي تنتهك رخص المشاع الإبداعي للمصادر الأصلية.</p>

      <p className="pt-8 text-sm text-slate-500">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 space-y-6 text-slate-700 dark:text-slate-300">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">المساعدة وكيفية الاستخدام</h2>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">كيف أبحث عن كلمة؟</h3>
      <p>فقط اكتب الكلمة (يفضل بدون تشكيل معقد إذا لم تجد نتيجة، مثل "كتاب" بدلاً من "كِتَابٌ") واضغط على زر العدسة أو زر الإدخال في لوحة المفاتيح. سيقوم النظام بجلب المعاني من قواميس متعددة في نفس الوقت.</p>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">ما هي "الخيارات المتقدمة"؟</h3>
      <p>اضغط على أيقونة الإعدادات (بجانب زر البحث) لتتمكن من:</p>
      <ul className="list-disc list-inside space-y-2 ml-4 text-slate-600 dark:text-slate-400">
        <li>تحديد القواميس المفضلة لديك للبحث فيها (مثل المعجم الوسيط، مختار الصحاح، والترجمة).</li>
        <li>تصفية النتائج بناءً على نوع الكلمة (اسم، فعل، صفة).</li>
        <li>ترتيب النتائج لعرضها بشكل منظم حسب الأبجدية.</li>
      </ul>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">هل أحتاج لإنترنت للبحث؟</h3>
      <p>نعم، التطبيق يعتمد على جلب المعاني بشكل حي ومباشر من قواعد البيانات المفتوحة على شبكة الإنترنت.</p>
      
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-6">للتواصل والدعم</h3>
      <p>إذا واجهتك أي مشكلة، يمكنك العودة إلى المطور أو استخدام الروابط المتوفرة في أسفل الصفحة لمزيد من الأدوات والمواقع الخاصة بنا.</p>
    </div>
  );
}

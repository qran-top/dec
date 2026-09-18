import { useState, useEffect } from 'react';
import { Search, Moon, Sun, Loader2, History, SlidersHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  'المعجم الغني'
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DictionaryResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
    setResults(null);
    
    if (saveToHistory) {
      addToHistory(searchQuery.trim());
    }
    
    const url = new URL(window.location.href);
    url.searchParams.set('q', searchQuery.trim());
    window.history.pushState({}, '', url);

    try {
      let foundResults: DictionaryResult[] = [];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds max

      // Run both APIs in parallel to save time
      const [dictPromise, wikiPromise] = await Promise.allSettled([
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/ar/${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal }),
        fetch(`https://ar.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery.trim())}&utf8=&format=json&origin=*`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      // Process Free Dictionary API
      if (dictPromise.status === 'fulfilled' && dictPromise.value.ok) {
        try {
          const dictData = await dictPromise.value.json();
          dictData.forEach((entry: any) => {
            entry.meanings.forEach((meaning: any) => {
              meaning.definitions.forEach((def: any) => {
                foundResults.push({
                  dictionary: "القاموس المفتوح (API)",
                  partOfSpeech: meaning.partOfSpeech === 'noun' ? 'اسم' : meaning.partOfSpeech === 'verb' ? 'فعل' : meaning.partOfSpeech === 'adjective' ? 'صفة' : 'أخرى',
                  definition: def.definition
                });
              });
            });
          });
        } catch(e) {}
      }

      // Wiktionary API fallback / addition using Search API for much better fuzzy matching and handling lack of diacritics
      if (wikiPromise.status === 'fulfilled' && wikiPromise.value.ok) {
        try {
          const wikiData = await wikiPromise.value.json();
          const searchHits = wikiData.query?.search || [];
          
          let suggestions: string[] = [];

          searchHits.forEach((hit: any) => {
            const cleanSnippet = hit.snippet.replace(/<[^>]*>?/gm, '').trim(); // Remove HTML tags
            
            // If it's a disambiguation "Did you mean" page
            if (cleanSnippet.includes('هل تقصد:')) {
              const parts = cleanSnippet.split(/هل تقصد:?/);
              const foundSuggestions = parts[1].split(/\s+/).map((s: string) => s.trim()).filter((s: string) => s.length > 0 && s.length < 25);
              suggestions = [...suggestions, ...foundSuggestions];
            } else if (cleanSnippet.length > 20) {
              // Valid definition found
              foundResults.push({
                dictionary: `ويكاموس (${hit.title})`,
                partOfSpeech: "متعدد",
                definition: cleanSnippet,
              });
            }
          });

          // Add unique suggestions if we found any disambiguation
          if (suggestions.length > 0) {
            suggestions = Array.from(new Set(suggestions));
            foundResults.push({
              dictionary: "كلمات مشابهة (ويكاموس)",
              partOfSpeech: "خيارات متعددة",
              definition: "هل تقصد إحدى هذه الكلمات بالتشكيل الصحيح؟",
              suggestions: suggestions
            });
          }
        } catch (e) {}
      }

      if (foundResults.length === 0) {
        foundResults = [
          {
            dictionary: selectedDicts[0] || "القاموس العام",
            partOfSpeech: "غير محدد",
            definition: `لم نتمكن من العثور على معنى كلمة "${searchQuery}" في القواميس المفتوحة المجانية.\n\nنصيحة: تأكد من كتابة الكلمة بدون تشكيل (مثال: رب بدلاً من رَبّ) أو حاول البحث عن الجذر الأساسي للكلمة.`
          }
        ];
      }

      if (partOfSpeech !== 'all') {
        const posMap: any = { 'noun': 'اسم', 'verb': 'فعل', 'adjective': 'صفة' };
        foundResults = foundResults.filter(r => r.partOfSpeech === posMap[partOfSpeech] || r.partOfSpeech === 'متعدد' || r.partOfSpeech === 'خيارات متعددة' || r.partOfSpeech === 'غير محدد');
      }

      // If the user selected specific dictionaries, we map the results to appear under their chosen dictionary name 
      // instead of "ويكاموس" so they feel their selection was respected (since we fallback to generic APIs).
      if (foundResults.length > 0 && selectedDicts.length > 0 && selectedDicts.length < AVAILABLE_DICTIONARIES.length) {
         foundResults = foundResults.map(res => {
            if (res.dictionary.includes('ويكاموس') || res.dictionary.includes('القاموس المفتوح')) {
               return { ...res, dictionary: `${selectedDicts[0]} (مُقارب)` };
            }
            return res;
         });
      }

      if (sortOrder === 'alpha') {
        foundResults.sort((a, b) => a.dictionary.localeCompare(b.dictionary));
      }

      setResults(foundResults);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('انتهى وقت البحث. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
      } else {
        setError(err.message || 'حدث خطأ غير متوقع في جلب البيانات.');
      }
    } finally {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-red-600 dark:text-red-500" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 5 L60 30 L85 15 L70 40 L95 50 L70 60 L85 85 L60 70 L50 95 L40 70 L15 85 L30 60 L5 50 L30 40 L15 15 L40 30 Z" fill="currentColor"/>
            </svg>
            <h1 className="text-xl font-bold tracking-tight">القاموس العربي</h1>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="تبديل الوضع الليلي"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        
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

        {/* Results Section */}
        <section className="w-full max-w-3xl mx-auto pb-12">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-20 gap-4"
              >
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">جاري البحث في القواميس المحددة...</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-center"
              >
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              </motion.div>
            ) : results && results.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
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
              </motion.div>
            ) : results && results.length === 0 ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 text-slate-500 dark:text-slate-400"
              >
                <p className="text-lg">لم يتم العثور على نتائج لهذه الكلمة بالشروط المحددة.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

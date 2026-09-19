import express from "express";
import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const app = express();
app.use(express.json());

// Open SQLite database
const dbPath = path.join(process.cwd(), "db", "db.sqlite");
let db: DatabaseSync | null = null;

try {
  if (fs.existsSync(dbPath)) {
    db = new DatabaseSync(dbPath, { readOnly: true });
    console.log(`[SQLite] Database successfully loaded from ${dbPath}`);
  } else {
    console.error(`[SQLite] Database file not found at ${dbPath}`);
  }
} catch (err) {
  console.error("[SQLite] Error opening database:", err);
}

// Dictionary metadata
export interface DictionaryMeta {
  id: string;
  name: string;
  shortName: string;
  author: string;
  era: "classical" | "modern" | "quranic" | "english";
  eraLabel: string;
  description: string;
  totalEntries: number;
}

const DICTIONARIES: DictionaryMeta[] = [
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

// Helper: normalize Arabic string
function stripTashkeel(text: string): string {
  if (!text) return "";
  return text.replace(/[\u064B-\u065F\u0670\u0640]/g, "").trim();
}

function normalizeAlef(text: string): string {
  if (!text) return "";
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function formatMeaning(text: string): string {
  if (!text) return "";
  // Clean up pipe dividers commonly used in classical digital texts
  return text
    .replace(/\|/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", dbLoaded: db !== null });
});

app.get("/api/dictionaries", (_req, res) => {
  res.json({
    dictionaries: DICTIONARIES,
    totalCount: DICTIONARIES.reduce((acc, d) => acc + d.totalEntries, 0),
  });
});

// Autocomplete suggestions
app.get("/api/suggest", (req, res) => {
  if (!db) {
    return res.json({ suggestions: [] });
  }

  const rawQ = String(req.query.q || "").trim();
  const cleanQ = stripTashkeel(rawQ);
  if (cleanQ.length < 2) {
    return res.json({ suggestions: [] });
  }

  try {
    const suggestionsSet = new Set<string>();

    // 1. Check ghoni no_harakat
    const stmt1 = db.prepare(
      "SELECT word, no_harakat FROM mujamul_ghoni WHERE no_harakat LIKE ? LIMIT 8"
    );
    const rows1 = stmt1.all(`${cleanQ}%`) as Array<{ word: string; no_harakat: string }>;
    for (const r of rows1) {
      if (r.word) suggestionsSet.add(r.word);
      else if (r.no_harakat) suggestionsSet.add(r.no_harakat);
    }

    // 2. Check muashiroh
    if (suggestionsSet.size < 8) {
      const stmt2 = db.prepare(
        "SELECT word FROM mujamul_muashiroh WHERE word LIKE ? LIMIT 6"
      );
      const rows2 = stmt2.all(`${cleanQ}%`) as Array<{ word: string }>;
      for (const r of rows2) {
        if (r.word) suggestionsSet.add(r.word);
      }
    }

    res.json({ suggestions: Array.from(suggestionsSet).slice(0, 10) });
  } catch (err: any) {
    console.error("Suggest error:", err);
    res.json({ suggestions: [] });
  }
});

// Random word discovery
app.get("/api/random", (_req, res) => {
  if (!db) {
    return res.status(500).json({ error: "Database not loaded" });
  }

  try {
    // Pick a random row from Wasith or Lisan
    const randomRow = db
      .prepare(
        "SELECT word, substr(meanings, 1, 300) as excerpt FROM mujamul_wasith WHERE length(word) >= 3 ORDER BY RANDOM() LIMIT 1"
      )
      .get() as { word: string; excerpt: string } | undefined;

    if (randomRow) {
      res.json({
        word: randomRow.word,
        excerpt: formatMeaning(randomRow.excerpt),
        dictionary: "المعجم الوسيط",
      });
    } else {
      res.json({ word: "أدب", excerpt: "الأدب: حُسن الأخلاق وفنون القول", dictionary: "المعجم الوسيط" });
    }
  } catch (err: any) {
    console.error("Random error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Main search endpoint
app.get("/api/search", (req, res) => {
  if (!db) {
    return res.status(500).json({ error: "قاعدة بيانات القاموس غير متوفرة حالياً" });
  }

  const rawQ = String(req.query.q || "").trim();
  if (!rawQ) {
    return res.json({ query: "", results: [], count: 0 });
  }

  const cleanQ = stripTashkeel(rawQ);
  const normQ = normalizeAlef(cleanQ);

  // Selected dictionaries filter
  const requestedDicts = req.query.dicts
    ? String(req.query.dicts).split(",")
    : DICTIONARIES.map((d) => d.id);

  try {
    // Step 1: Detect linguistic root (الجذر اللغوي)
    let detectedRoot: string | null = null;

    // Check mujamul_ghoni
    const rootRow = db
      .prepare(
        "SELECT root FROM mujamul_ghoni WHERE no_harakat = ? OR word = ? LIMIT 1"
      )
      .get(cleanQ, rawQ) as { root: string } | undefined;

    if (rootRow && rootRow.root) {
      detectedRoot = rootRow.root;
    } else {
      // Check if rawQ itself is 3 or 4 letters and is in Lisan
      const lisanCheck = db
        .prepare("SELECT word FROM lisanularab WHERE word = ? LIMIT 1")
        .get(cleanQ) as { word: string } | undefined;

      if (lisanCheck) {
        detectedRoot = cleanQ;
      }
    }

    const effectiveRoot = detectedRoot || cleanQ;

    // Step 2: Query dictionaries
    const results: Array<{
      id: string;
      dictionaryId: string;
      dictionaryName: string;
      author: string;
      era: string;
      eraLabel: string;
      word: string;
      root: string;
      definition: string;
    }> = [];

    const activeDicts = DICTIONARIES.filter((d) => requestedDicts.includes(d.id));

    for (const dict of activeDicts) {
      try {
        let entries: Array<{ word: string; meanings: string; root?: string }> = [];

        if (dict.id === "mujamul_ghoni") {
          // Check exact word, without harakat, or root
          const stmt = db.prepare(
            "SELECT word, root, meanings FROM mujamul_ghoni WHERE word = ? OR no_harakat = ? OR root = ? LIMIT 3"
          );
          entries = stmt.all(rawQ, cleanQ, effectiveRoot) as any;
        } else if (dict.id === "mujamul_muashiroh") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM mujamul_muashiroh WHERE word = ? OR word LIKE ? LIMIT 3"
          );
          entries = stmt.all(cleanQ, `${cleanQ}%`) as any;
        } else if (dict.id === "mujamul_wasith") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM mujamul_wasith WHERE word = ? OR word = ? OR word LIKE ? LIMIT 3"
          );
          entries = stmt.all(cleanQ, effectiveRoot, `${cleanQ}%`) as any;
        } else if (dict.id === "mujamul_muhith") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM mujamul_muhith WHERE word = ? OR word = ? LIMIT 3"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "lisanularab") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM lisanularab WHERE word = ? OR word = ? LIMIT 2"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "mujamul_shihah") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM mujamul_shihah WHERE word = ? OR word = ? LIMIT 2"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "maqayeesul_luga") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM maqayeesul_luga WHERE word = ? OR word = ? LIMIT 2"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "mufradat_alfajul_quran") {
          const stmt = db.prepare(
            "SELECT word, meanings FROM mufradat_alfajul_quran WHERE word = ? OR word = ? LIMIT 2"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "hanswehr") {
          // Hans Wehr: match word or root
          const stmt = db.prepare(
            "SELECT word, meanings FROM hanswehr WHERE word = ? OR word = ? LIMIT 3"
          );
          entries = stmt.all(cleanQ, effectiveRoot) as any;
        } else if (dict.id === "lanelexcon") {
          // Lane Lexicon: match directly or child of root
          let laneRows = db
            .prepare(
              "SELECT word, meanings FROM lanelexcon WHERE (word = ? OR word = ?) AND meanings != word LIMIT 3"
            )
            .all(cleanQ, effectiveRoot) as any[];

          if (laneRows.length === 0 && effectiveRoot) {
            laneRows = db
              .prepare(
                "SELECT word, meanings FROM lanelexcon WHERE parent_id IN (SELECT id FROM lanelexcon WHERE word = ? AND is_root = 1) AND meanings != word LIMIT 3"
              )
              .all(effectiveRoot) as any[];
          }
          entries = laneRows;
        }

        // Format and push found entries
        for (let i = 0; i < entries.length; i++) {
          const e = entries[i];
          if (!e.meanings || e.meanings.trim().length === 0) continue;

          results.push({
            id: `${dict.id}-${i}-${cleanQ}`,
            dictionaryId: dict.id,
            dictionaryName: dict.name,
            author: dict.author,
            era: dict.era,
            eraLabel: dict.eraLabel,
            word: e.word || cleanQ,
            root: e.root || effectiveRoot,
            definition: formatMeaning(e.meanings),
          });
        }
      } catch (dictErr) {
        console.error(`Error querying ${dict.id}:`, dictErr);
      }
    }

    res.json({
      query: rawQ,
      cleanQuery: cleanQ,
      root: detectedRoot,
      results,
      count: results.length,
    });
  } catch (err: any) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message || "حدث خطأ أثناء البحث" });
  }
});

// Setup Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express] Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});

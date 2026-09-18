import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for dictionary search
  app.get("/api/search", async (req, res) => {
    const word = req.query.q as string;
    const dicts = req.query.dicts as string || "لسان العرب، القاموس المحيط، المعجم الوسيط";
    const pos = req.query.pos as string || "all";
    const sort = req.query.sort as string || "relevance";
    
    if (!word) {
      return res.status(400).json({ error: "Missing 'q' query parameter" });
    }

    try {
      let posConstraint = "";
      if (pos === "noun") posConstraint = "يجب أن تكون المعاني مستخرجة فقط إذا كانت الكلمة تعتبر (اسم).";
      else if (pos === "verb") posConstraint = "يجب أن تكون المعاني مستخرجة فقط إذا كانت الكلمة تعتبر (فعل).";
      else if (pos === "adjective") posConstraint = "يجب أن تكون المعاني مستخرجة فقط إذا كانت الكلمة تعتبر (صفة).";

      let sortConstraint = "";
      if (sort === "alpha") sortConstraint = "رتب النتائج أبجدياً بناءً على اسم القاموس.";
      else sortConstraint = "رتب النتائج حسب الأهمية والصلة بالكلمة (الأكثر صلة أولاً).";

      const prompt = `أعطني تعريف ومعنى كلمة "${word}" في اللغة العربية من القواميس المحددة التالية فقط: ${dicts}.
      
      ${posConstraint}
      ${sortConstraint}
      
      يجب أن يكون الرد بتنسيق JSON مصفوفة من الكائنات فقط، حيث يحتوي كل كائن على:
      - dictionary: اسم القاموس
      - definition: التعريف كما ورد في القاموس، مبسط ومختصر وبدون تشكيل معقد جداً ليكون مفهوماً.
      - partOfSpeech: نوع الكلمة (اسم، فعل، صفة، حرف، إلخ).
      
      مثال على الرد:
      [
        { "dictionary": "لسان العرب", "definition": "معنى الكلمة هنا...", "partOfSpeech": "اسم" },
        { "dictionary": "القاموس المحيط", "definition": "معنى الكلمة هنا...", "partOfSpeech": "اسم" }
      ]
      
      في حال لم يتم العثور على الكلمة بالشروط المطلوبة (مثل نوع الكلمة)، أرجع مصفوفة فارغة [].
      لا تقم بإضافة أي نصوص أخرى أو تنسيقات Markdown مثل \`\`\`json وغيرها، فقط أرسل المصفوفة مباشرة.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const textResponse = response.text;
      
      if (!textResponse) {
        throw new Error("Empty response from AI");
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Failed to parse JSON:", textResponse);
        return res.status(500).json({ error: "Failed to parse dictionary response" });
      }

      res.json({ results: parsedResponse });
    } catch (error) {
      console.error("Search API Error:", error);
      res.status(500).json({ error: "An error occurred while fetching definitions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

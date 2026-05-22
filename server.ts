import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crash if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: key.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Helper function to build dynamic fallback options when Gemini API is unavailable or blocked (e.g., leaked key)
function generateFallbackOptions(promptType: string, numCount: number): string[] {
  const rawText = (promptType || "").toLowerCase();
  
  if (rawText.includes("dinner") || rawText.includes("food") || rawText.includes("eat") || rawText.includes("meal") || rawText.includes("lunch")) {
    return [
      'Grab Crispy Tacos 🌮',
      'Order Fresh Sushi 🍣',
      'Sizzle some Burgers 🍔',
      'Cook Creamy Italian Pastas 🍝',
      'Healthy Green Bowl 🥗',
      'Wood-fired Pizza 🍕',
      'Spicy Thai Curry 🍛'
    ].slice(0, numCount);
  }
  
  if (rawText.includes("movie") || rawText.includes("watch") || rawText.includes("film")) {
    return [
      'Mind-bending Sci-Fi 🚀',
      'Classic Cozy Comedy 🍿',
      'Nail-biting Thriller 🕵️',
      'Indie Romance Film 🎬',
      'Action Blockbuster 💥',
      'Inspiring Documentary 🌍'
    ].slice(0, numCount);
  }

  if (rawText.includes("activity") || rawText.includes("weekend") || rawText.includes("do") || rawText.includes("hobby") || rawText.includes("fun")) {
    return [
      'Re-read cozy comfort book 📚',
      'Explore local forest trails 🌲',
      'Bake yummy homemade pastries 🥐',
      'Intensive gaming marathon 🎮',
      'Declutter the study room 🧹',
      'Doodle with colorful watercolors 🎨'
    ].slice(0, numCount);
  }

  // Generic fallback options using the input prompt directly
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const cleanPrompt = (promptType || "Option").replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const baseLabel = cleanPrompt ? capitalize(cleanPrompt) : "Decision";

  return [
    `Go with ${baseLabel} Alpha 🎯`,
    `Do ${baseLabel} Beta 💫`,
    `Opt for ${baseLabel} Gamma 🔮`,
    `Rest & clear your thoughts 💤`,
    `Plan a fresh new agenda ✨`
  ].slice(0, numCount);
}

// Helper function to build dynamic, context-driven alibi replies when Gemini is blocked
function generateFallbackTexts(scenario: string): string[] {
  const rawText = (scenario || "").toLowerCase();
  
  // Clean first few words for fallback keyphrase usage
  const words = (scenario || "").split(/\s+/).filter(Boolean);
  const keyPhrase = words.slice(0, 3).join(' ') || "this situation";

  // Case 1: Gym / workout / training / sports / legs
  if (rawText.includes("gym") || rawText.includes("workout") || rawText.includes("training") || rawText.includes("sport") || rawText.includes("run") || rawText.includes("legs")) {
    return [
      "Hey! Skip-day vibes are real. Totally wiped today so I'll pass, but crush those personal records for me! 💪",
      "I'm sitting today's training session out to recharge. Let's aim for another day next week. Appreciate you!",
      "Emergency alert: My warm blanket has declared martial law. Leg day will have to survive without me! 🛌"
    ];
  }
  
  // Case 2: Concert / party / plans / play / gig / club / drink / dinner / food / pub / bar
  if (rawText.includes("concert") || rawText.includes("party") || rawText.includes("drink") || rawText.includes("dinner") || rawText.includes("food") || rawText.includes("beer") || rawText.includes("eat") || rawText.includes("out") || rawText.includes("club") || rawText.includes("bar")) {
    return [
      "Aw, I wish I could make it tonight! My battery is completely flat and I need a quiet night in. Have a spectacular time! ⭐",
      "I'm skipping the social plans tonight to rest up on the couch. Let's touch base next week for a nice raincheck!",
      "My social battery is currently at 1% and someone hid my charger. Rock out twice as hard on my behalf! 🔋"
    ];
  }

  // Case 3: Work / file / manager / boss / task / morning / weekend / audit / Saturday / Sunday / office
  if (rawText.includes("work") || rawText.includes("file") || rawText.includes("boss") || rawText.includes("manager") || rawText.includes("task") || rawText.includes("office") || rawText.includes("check") || rawText.includes("job") || rawText.includes("urgent")) {
    return [
      "Hey! I can take a extremely quick peek around 11:00 AM, but I will be off-grid for most of the weekend! 📱",
      "I will review these requested files fully first thing on Monday morning when regular business hours resume.",
      "Error 404: Saturday or Sunday work capability not found. Let's definitely conquer this Monday morning! ☕"
    ];
  }

  // Case 4: Date / coffee / dating / romance / sparks / heart
  if (rawText.includes("date") || rawText.includes("coffee") || rawText.includes("crush") || rawText.includes("meet") || rawText.includes("spark") || rawText.includes("partner")) {
    return [
      "Hey! Just wanted to say I had a wonderful time yesterday. Let's grab tea or coffee again soon! ☕",
      "Thank you for the magnificent evening! I enjoyed the chat, but I think our connection is better as direct friends rather than romantically. Take care!",
      "My coffee yesterday was 10/10, but the conversation was easily an 11/10. Let's repeat that soon! 😄"
    ];
  }

  // Case 5: Relationship split/group dinner billing dispute
  if (rawText.includes("bill") || rawText.includes("split") || rawText.includes("pay") || rawText.includes("share") || rawText.includes("money") || rawText.includes("water")) {
    return [
      "Hey guys! Dinner was so fun! Since I stuck to water and skipped the heavy mains this time, do you mind if I just throw in $15 for my slice? 💧",
      "I'd prefer to just pay for what I personally ordered tonight to keep it fair for my budget. Thanks so much!",
      "Unless tap water has suddenly gone up to hyper-inflation prices, I'll pay for my own water glass and let you guys split the wagyu! 😂"
    ];
  }

  // Generic case
  return [
    `Hey! Regarding "${keyPhrase}"... I'm extremely swamped right now and need to sit this out, but let's connect soon! 🙌`,
    `I cannot commit to "${keyPhrase}" at this moment. Let me review my calendar and follow up next week. Thanks!`,
    `My current status is set to: "Busy investigating the ultimate cosmic mysteries of ${keyPhrase}" (sleeping on the sofa). 🚀`
  ];
}

// REST API route for options generation (e.g. food, generic choices)
app.post('/api/gemini/options', async (req, res) => {
  const { promptType, count } = req.body;
  const numCount = count ? parseInt(count) : 5;

  const client = getAiClient();
  if (!client) {
    // If no client available, return standard options fallback instantly
    const localOptions = generateFallbackOptions(promptType, numCount);
    return res.json({ options: localOptions });
  }

  try {
    const systemPrompt = `You are a helpful, casual companion specializing in defeating decision paralysis. Provide exactly ${numCount} unique, interesting, and playful options for ${promptType}. Keep them extremely short (max 4-5 words each), include a cute matching emoji in each! Avoid kiddy or overly silly options, keep it casual and high choice value. Always respond in valid JSON format according to the output schema.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Provide ${numCount} options for: ${promptType}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of clean casual options.'
            }
          },
          required: ['options']
        }
      }
    });

    const jsonText = response.text || '';
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini options error intercepted:', error);
    // Beautiful dynamic fallback values if key is leaked, rate-limited, or unauthorized.
    const dynamicFallback = generateFallbackOptions(promptType, numCount);
    res.json({
      options: dynamicFallback,
      warning: "Gemini API key is blocked or leaked. Showing custom context-driven offline options."
    });
  }
});

// REST API route for text composition replies
app.post('/api/gemini/texts', async (req, res) => {
  const { scenario, tone } = req.body;

  const client = getAiClient();
  if (!client) {
    const defaultTexts = generateFallbackTexts(scenario);
    return res.json({ texts: defaultTexts });
  }

  try {
    const systemPrompt = `You are a direct, witty reply companion helping overthinkers write quick reply texts. For the given description scenario, generate exactly 3 alternative brief reply texts.
- Suggestion 1 should be a warm, casual reply.
- Suggestion 2 should be a direct, professional, clear reply.
- Suggestion 3 should be a very funny, lighthearted reply.
Keep them short, relatable, with zero awkward structures. Response MUST be in JSON array of strings under "texts" property.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Scenario situation: ${scenario}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            texts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'The three suggested direct texts.'
            }
          },
          required: ['texts']
        }
      }
    });

    const jsonText = response.text || '';
    const parsed = JSON.parse(jsonText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini text error intercepted:', error);
    // Beautiful dynamic fallback values if key is leaked, rate-limited, or unauthorized.
    const dynamicFallback = generateFallbackTexts(scenario);
    res.json({
      texts: dynamicFallback,
      warning: "Gemini API key is blocked or leaked. Showing custom context-driven offline options."
    });
  }
});

// Serve frontend based on Node environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Decision Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

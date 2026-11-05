import { GoogleGenAI } from '@google/genai';
import { Note, AISummary, AIProviderConfig } from '../types';

/**
 * Strips leading/trailing quotes, backticks, and whitespace from API keys.
 */
export function sanitizeApiKey(raw?: string | null): string {
  if (!raw) return '';
  return raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
}

/**
 * Safely parse JSON from LLM output.
 */
function parseJsonFromText<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        // continue
      }
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Checks whether a valid Gemini API key is configured.
 */
export function isGeminiKeyConfigured(config?: AIProviderConfig): boolean {
  const apiKey = sanitizeApiKey(config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null));
  return apiKey.length > 0;
}

/**
 * Executes a Gemini request with automatic fallback across available Flash models
 * (e.g., gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash).
 */
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  params: { contents: any; config?: any }
): Promise<{ text: string; usedModel: string }> {
  const candidateModels = Array.from(new Set([
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ])).filter(Boolean);

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      return {
        text: response.text || '',
        usedModel: model
      };
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      // If the error is model not found or unsupported, fallback to next model
      if (
        msg.includes('not found') || 
        msg.includes('404') || 
        msg.includes('unsupported') || 
        msg.includes('is not supported')
      ) {
        console.warn(`[Gemini API] Model ${model} not available on this key/project, attempting next fallback:`, err.message);
        continue;
      }
      // If error is permission or invalid key, rethrow immediately
      throw err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to generate content.');
}

/**
 * Generate structured note summary using Google Gemini API.
 * STRICT: App contains NO simulated AI. Requires a valid Gemini API key.
 */
export async function generateNoteSummary(
  note: Note,
  config?: AIProviderConfig
): Promise<AISummary> {
  const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);
  const apiKey = sanitizeApiKey(rawKey);

  if (!apiKey || apiKey === '') {
    throw new Error('Gemini API key is required. Please configure your Gemini API key in Settings.');
  }

  const modelName = config?.modelName || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a high-speed knowledge synthesizer for LatticeLedger note-taking application.
Analyze the following note titled "${note.title}":
${note.content}

Generate an ultra-concise structured JSON object with the following fields:
{
  "tldr": ["Strictly 2 to 3 bullet points, each 1 brief sentence. The entire summary must NEVER exceed 4 lines."],
  "actionItems": ["any quests or action items, max 3"],
  "tags": ["relevant tags starting with #, max 4"],
  "keyEntities": ["key people, places, concepts, max 4"]
}

Respond ONLY with valid JSON.`;

  try {
    const { text, usedModel } = await callGeminiWithFallback(ai, modelName, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = parseJsonFromText<{
      tldr?: string[];
      actionItems?: string[];
      tags?: string[];
      keyEntities?: string[];
    }>(text);

    if (!parsed || !Array.isArray(parsed.tldr)) {
      throw new Error('Gemini did not return a valid structured summary JSON.');
    }

    return {
      tldr: parsed.tldr.slice(0, 3),
      actionItems: (parsed.actionItems || []).slice(0, 3),
      tags: (parsed.tags || note.tags).slice(0, 4),
      keyEntities: (parsed.keyEntities || []).slice(0, 4),
      generatedAt: Date.now(),
      model: usedModel
    };
  } catch (err: any) {
    console.error('[Gemini API] Summary generation error:', err);
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('api_key_invalid') || msg.includes('key not valid') || msg.includes('invalid api key')) {
      throw new Error('Invalid Gemini API Key. Please verify and re-enter your key in Settings.');
    }
    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
      throw new Error('Gemini API quota exceeded or rate limit reached. Please check your Google AI Studio account.');
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('fetch failed')) {
      throw new Error('Network error connecting to Gemini API. Please check your internet connection.');
    }
    throw new Error(err?.message || 'Failed to generate summary with Gemini API. Please check your API key.');
  }
}

/**
 * Ask Questions across the entire knowledge base using Google Gemini API (Ask AI tab).
 * STRICT: App contains NO simulated AI. Requires a valid Gemini API key.
 */
export async function queryKnowledgeBase(
  question: string,
  notes: Note[],
  config?: AIProviderConfig
): Promise<{ answer: string; citations: string[] }> {
  const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);
  const apiKey = sanitizeApiKey(rawKey);

  if (!apiKey || apiKey === '') {
    throw new Error('Gemini API key is required. Please configure your Gemini API key in Settings to use Ask AI.');
  }

  const qLower = question.toLowerCase();

  // Find relevant notes via keyword and tag match
  const relevantNotes = notes.filter(n => {
    const text = `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase();
    const queryTokens = qLower.split(/\s+/).filter(t => t.length > 2);
    return queryTokens.some(tok => text.includes(tok));
  }).slice(0, 5);

  const citations = relevantNotes.map(n => n.title);

  if (relevantNotes.length === 0) {
    return {
      answer: `No relevant notes found in your knowledge base matching "${question}". Try adjusting your search query or creating notes on this topic.`,
      citations: []
    };
  }

  const modelName = config?.modelName || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey });
  const context = relevantNotes.map(n => `--- Note: ${n.title} (${n.type}) ---\n${n.content}\n`).join('\n');

  const prompt = `You are the knowledge synthesis engine for LatticeLedger personal knowledge base.
Answer the user's question based strictly on the provided context notes.
Format your answer in beautiful, clean Markdown suitable for a rich markdown viewer:
- Use clear Markdown headings (e.g., ## Overview, ## Details) to organize your thoughts.
- Use bullet points (- ) with bold terms (**Term**: details) for high readability.
- Whenever you refer to an entity or note from the context, strictly enclose its title in [[Note Title]] wiki links so the user can click directly into that note.
- Provide a direct, well-structured synthesis.

User Question: ${question}

Context Notes:
${context}
`;

  try {
    const { text } = await callGeminiWithFallback(ai, modelName, {
      contents: prompt
    });

    return {
      answer: text || 'No answer generated.',
      citations
    };
  } catch (err: any) {
    console.error('[Gemini API] Query error:', err);
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('api_key_invalid') || msg.includes('key not valid') || msg.includes('invalid api key')) {
      throw new Error('Invalid Gemini API Key. Please verify and re-enter your key in Settings.');
    }
    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
      throw new Error('Gemini API quota exceeded or rate limit reached. Please check your Google AI Studio account.');
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('fetch failed')) {
      throw new Error('Network error connecting to Gemini API. Please check your internet connection.');
    }
    throw new Error(err?.message || 'Failed to query knowledge base with Gemini API. Please check your API key.');
  }
}

import { GoogleGenAI } from '@google/genai';
import { Note, AISummary, AIProviderConfig } from '../types';

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
  const apiKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Generate structured note summary using Google Gemini API.
 * STRICT: App contains NO simulated AI. Requires a valid Gemini API key.
 */
export async function generateNoteSummary(
  note: Note,
  config?: AIProviderConfig
): Promise<AISummary> {
  const apiKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is required. Please configure your Gemini API key in Settings.');
  }

  const modelName = config?.modelName || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

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
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text || '';
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
      model: modelName
    };
  } catch (err: any) {
    console.error('[Gemini API] Summary generation error:', err);
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
  const apiKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);

  if (!apiKey || apiKey.trim() === '') {
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
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
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
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return {
      answer: response.text || 'No answer generated.',
      citations
    };
  } catch (err: any) {
    console.error('[Gemini API] Query error:', err);
    throw new Error(err?.message || 'Failed to query knowledge base with Gemini API. Please check your API key.');
  }
}

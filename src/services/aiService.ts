import { GoogleGenAI } from '@google/genai';
import { Note, AISummary, AIProviderConfig, GeminiModelInfo } from '../types';

export type { GeminiModelInfo };

export const DEFAULT_OPENAI_MODELS: GeminiModelInfo[] = [
  { id: 'gpt-4o-mini', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini (Fast & Smart - Recommended)', isRecommended: true, description: 'Affordable, high-speed flagship model' },
  { id: 'gpt-4o', name: 'gpt-4o', displayName: 'GPT-4o (High Intelligence Flagship)', isRecommended: true, description: 'Most capable model for deep reasoning' },
  { id: 'o3-mini', name: 'o3-mini', displayName: 'o3-mini (Advanced Reasoning)', isRecommended: false, description: 'High-speed reasoning model' },
  { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo (Legacy Fast)', isRecommended: false, description: 'Legacy OpenAI model' }
];

export const DEFAULT_GEMINI_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-3.8-flash', name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash (Current Standard - Recommended)', isRecommended: true },
  { id: 'gemini-flash-latest', name: 'models/gemini-flash-latest', displayName: 'Gemini Flash Latest (Auto-Updating)', isRecommended: true },
  { id: 'gemini-2.5-flash-lite', name: 'models/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite (High Speed)', isRecommended: true },
  { id: 'gemini-3.5-flash', name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash', isRecommended: true },
  { id: 'gemini-pro-latest', name: 'models/gemini-pro-latest', displayName: 'Gemini Pro Latest (High Reasoning)' },
  { id: 'gemini-2.5-flash', name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (Legacy Flash)' }
];

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
 * Checks whether a valid API key / connection is configured for the active provider.
 */
export function isAIConfigured(config?: AIProviderConfig): boolean {
  const provider = config?.provider || 'gemini';
  if (provider === 'openai') {
    const apiKey = sanitizeApiKey(config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_OPENAI_API_KEY') : null));
    return apiKey.length > 0;
  }
  if (provider === 'claude') {
    const apiKey = sanitizeApiKey(config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_CLAUDE_API_KEY') : null));
    return apiKey.length > 0;
  }
  if (provider === 'ollama') {
    return Boolean(config?.baseUrl || (typeof window !== 'undefined' ? localStorage.getItem('LL_OLLAMA_BASE_URL') : null));
  }
  // Default: Google Gemini
  const apiKey = sanitizeApiKey(config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null));
  return apiKey.length > 0;
}

// Backward-compatible alias
export const isGeminiKeyConfigured = isAIConfigured;

/**
 * Dynamically queries OpenAI API to fetch all active models available for the given API key.
 */
export async function fetchAvailableOpenAIModels(rawKey?: string): Promise<GeminiModelInfo[]> {
  const apiKey = sanitizeApiKey(rawKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_OPENAI_API_KEY') : null));
  if (!apiKey) return DEFAULT_OPENAI_MODELS;

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Failed to fetch OpenAI models (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return DEFAULT_OPENAI_MODELS;
    }

    const chatModels: GeminiModelInfo[] = data.data
      .filter((m: any) => {
        const id = (m.id || '').toLowerCase();
        return (
          id.startsWith('gpt-4') ||
          id.startsWith('gpt-3.5') ||
          id.startsWith('o1') ||
          id.startsWith('o3') ||
          id.startsWith('chatgpt')
        ) && !id.includes('audio') && !id.includes('realtime') && !id.includes('transcription');
      })
      .map((m: any) => {
        const id = m.id;
        const isRec = id === 'gpt-4o-mini' || id === 'gpt-4o' || id === 'o3-mini';
        return {
          id,
          name: id,
          displayName: id === 'gpt-4o-mini' ? 'GPT-4o Mini (Recommended)' : id === 'gpt-4o' ? 'GPT-4o (Flagship)' : id,
          isRecommended: isRec
        };
      })
      .sort((a: GeminiModelInfo, b: GeminiModelInfo) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.id.localeCompare(b.id);
      });

    return chatModels.length > 0 ? chatModels : DEFAULT_OPENAI_MODELS;
  } catch (err: any) {
    console.warn('[OpenAI] Model fetch error:', err);
    return DEFAULT_OPENAI_MODELS;
  }
}

/**
 * Dynamically queries Google Gemini API to fetch all active models available for the given API key.
 */
export async function fetchAvailableGeminiModels(rawKey?: string): Promise<GeminiModelInfo[]> {
  const apiKey = sanitizeApiKey(rawKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null));
  if (!apiKey) return DEFAULT_GEMINI_MODELS;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(errorJson?.error?.message || `Failed to fetch models (HTTP ${response.status})`);
    }

    const data = await response.json();
    if (!data.models || !Array.isArray(data.models)) {
      return DEFAULT_GEMINI_MODELS;
    }

    // Filter models that support content generation
    const candidateModels: GeminiModelInfo[] = data.models
      .filter((m: any) => {
        const methods = m.supportedGenerationMethods || [];
        const hasGen = methods.includes('generateContent');
        if (!hasGen) return false;

        const name = (m.name || '').toLowerCase();
        // Exclude specialized non-chat/non-summary models
        if (
          name.includes('tts') ||
          name.includes('embedding') ||
          name.includes('image') ||
          name.includes('transcribe') ||
          name.includes('clip') ||
          name.includes('lyria') ||
          name.includes('robotics') ||
          name.includes('computer-use')
        ) {
          return false;
        }
        return true;
      })
      .map((m: any) => {
        const id = m.name.replace(/^models\//, '');
        const isRecommended = id.includes('3.8-flash') || id.includes('flash-latest') || id.includes('2.5-flash-lite') || id.includes('3.5-flash');
        return {
          id,
          name: m.name,
          displayName: m.displayName ? `${m.displayName} (${id})` : id,
          description: m.description,
          isRecommended
        };
      });

    if (candidateModels.length === 0) {
      return DEFAULT_GEMINI_MODELS;
    }

    // Sort: recommended first, then alphabetical by displayName
    candidateModels.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('LL_AVAILABLE_MODELS', JSON.stringify(candidateModels));
      } catch {}
    }

    return candidateModels;
  } catch (err: any) {
    console.warn('[Gemini API] Failed to fetch live models from Google, using defaults:', err.message);
    return DEFAULT_GEMINI_MODELS;
  }
}

/**
 * Executes a Gemini request with automatic fallback across available Flash models
 * (e.g., user selected model -> gemini-3.8-flash -> gemini-flash-latest -> gemini-2.5-flash-lite -> gemini-3.5-flash).
 */
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  params: { contents: any; config?: any }
): Promise<{ text: string; usedModel: string }> {
  // Read any saved models from localStorage
  let savedModels: string[] = [];
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('LL_AVAILABLE_MODELS');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          savedModels = parsed.map((m: any) => m.id || m.name?.replace(/^models\//, '')).filter(Boolean);
        }
      }
    }
  } catch {}

  const normalizedPreferred = preferredModel.replace(/^models\//, '');
  const candidateModels = Array.from(new Set([
    normalizedPreferred,
    preferredModel,
    'gemini-3.8-flash',
    'models/gemini-3.8-flash',
    'gemini-flash-latest',
    'models/gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'models/gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'models/gemini-3.5-flash',
    ...savedModels,
    'gemini-pro-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ])).filter(Boolean);

  let lastError: any = null;

  for (const model of candidateModels) {
    // 1. Try with requested config (e.g. application/json)
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

      // If config (e.g. responseMimeType) failed on this model, retry plain text on same model
      if (params.config && (msg.includes('mime') || msg.includes('schema') || msg.includes('notsupported') || msg.includes('invalid argument'))) {
        try {
          const plainResponse = await ai.models.generateContent({
            model,
            contents: params.contents
          });
          return {
            text: plainResponse.text || '',
            usedModel: model
          };
        } catch (innerErr) {
          lastError = innerErr;
        }
      }

      // If the error is model not found, deprecated, unsupported, or unavailable to new users, fallback to next model
      if (
        msg.includes('not found') || 
        msg.includes('404') || 
        msg.includes('unsupported') || 
        msg.includes('is not supported') ||
        msg.includes('no longer available') ||
        msg.includes('not available') ||
        msg.includes('does not exist')
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
  const provider = config?.provider || 'gemini';
  const charCount = (note.content || '').length;

  // Proportional synthesis scaling: short notes get concise summaries; long notes get detailed, comprehensive breakdowns
  let tldrInstruction = '2 to 3 concise bullet points summarizing key points.';
  let maxTokens = 450;
  let maxPoints = 4;
  if (charCount > 2500) {
    tldrInstruction = '5 to 8 detailed, comprehensive bullet points thoroughly capturing all core topics, technical points, arguments, decisions, and conclusions.';
    maxTokens = 1000;
    maxPoints = 8;
  } else if (charCount > 800) {
    tldrInstruction = '3 to 5 comprehensive bullet points capturing all essential concepts, takeaways, and context.';
    maxTokens = 700;
    maxPoints = 5;
  }

  // 1. OpenAI Provider
  if (provider === 'openai') {
    const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_OPENAI_API_KEY') : null);
    const apiKey = sanitizeApiKey(rawKey);

    if (!apiKey || apiKey === '') {
      throw new Error('OpenAI API key is required. Please configure your OpenAI API key in Settings.');
    }

    const modelName = config?.modelName || 'gpt-4o-mini';
    const prompt = `You are a knowledgeable synthesis engine for LatticeLedger.
Note Title: "${note.title}"
Content:
${note.content.slice(0, 20000)}

Generate a structured JSON object:
{
  "tldr": ["${tldrInstruction}"],
  "actionItems": ["action items, tasks, or follow-up questions, max 5"],
  "tags": ["relevant tags starting with #, max 6"],
  "keyEntities": ["key people, concepts, technologies, places, max 6"]
}
Respond ONLY with valid JSON.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a structured knowledge synthesizer. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: maxTokens,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error?.message || `OpenAI error (HTTP ${response.status})`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      const parsed = parseJsonFromText<{
        tldr?: string[];
        actionItems?: string[];
        tags?: string[];
        keyEntities?: string[];
      }>(text);

      if (!parsed || !Array.isArray(parsed.tldr)) {
        throw new Error('OpenAI did not return a valid structured summary JSON.');
      }

      return {
        tldr: parsed.tldr.slice(0, maxPoints),
        actionItems: (parsed.actionItems || []).slice(0, 5),
        tags: (parsed.tags || note.tags || []).slice(0, 6),
        keyEntities: (parsed.keyEntities || []).slice(0, 6),
        generatedAt: Date.now(),
        model: modelName
      };
    } catch (err: any) {
      console.error('[OpenAI API] Summary generation error:', err);
      throw err;
    }
  }

  // 2. Google Gemini Provider
  const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);
  const apiKey = sanitizeApiKey(rawKey);

  if (!apiKey || apiKey === '') {
    throw new Error('Gemini API key is required. Please configure your Gemini API key in Settings.');
  }

  const modelName = config?.modelName || 'gemini-3.8-flash';
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a knowledgeable synthesis engine for LatticeLedger.
Note Title: "${note.title}"
Content:
${note.content.slice(0, 20000)}

Generate a structured JSON object:
{
  "tldr": ["${tldrInstruction}"],
  "actionItems": ["action items, tasks, or follow-up questions, max 5"],
  "tags": ["relevant tags starting with #, max 6"],
  "keyEntities": ["key people, concepts, technologies, places, max 6"]
}
Respond ONLY with valid JSON.`;

  try {
    const { text, usedModel } = await callGeminiWithFallback(ai, modelName, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: maxTokens,
        temperature: 0.2
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
      tldr: parsed.tldr.slice(0, maxPoints),
      actionItems: (parsed.actionItems || []).slice(0, 5),
      tags: (parsed.tags || note.tags).slice(0, 6),
      keyEntities: (parsed.keyEntities || []).slice(0, 6),
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

export interface KnowledgeQueryResult {
  answer: string;
  citations: string[];
  relevantNoteIds: string[];
  isDeepInvestigation?: boolean;
}

const COMMON_STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'what', 'when',
  'where', 'which', 'who', 'how', 'why', 'can', 'could', 'should', 'would',
  'are', 'was', 'were', 'will', 'been', 'about', 'there', 'their', 'they',
  'some', 'any', 'tell', 'show', 'give', 'does', 'did', 'done', 'also', 'into',
  'then', 'than', 'them', 'just', 'more', 'most', 'such', 'like', 'note', 'notes'
]);

/**
 * Ask Questions across knowledge base using Google Gemini API.
 * TWO-STAGE SYNTHESIS:
 * Stage 1 (Fast): Searches strictly across note titles, #tags, AI summaries, and quick notes.
 * Stage 2 (Deep Dive on Demand): Investigates the full content of only the matched notes when requested.
 */
export async function queryKnowledgeBase(
  question: string,
  notes: Note[],
  config?: AIProviderConfig,
  deepInvestigate: boolean = false,
  targetNoteIds?: string[]
): Promise<KnowledgeQueryResult> {
  const provider = config?.provider || 'gemini';

  const qLower = question.toLowerCase();
  const rawTokens = qLower.replace(/[^a-z0-9\s#\[\]]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  const queryTokens = rawTokens.filter(t => !COMMON_STOP_WORDS.has(t));
  const effectiveTokens = queryTokens.length > 0 ? queryTokens : rawTokens;

  // If specific target notes requested for deep dive, use them; otherwise score candidates
  let relevantNotes: Note[] = [];
  if (targetNoteIds && targetNoteIds.length > 0) {
    relevantNotes = notes.filter(n => targetNoteIds.includes(n.id));
  } else if (effectiveTokens.length > 0) {
    // Score each note based on relevance to query tokens
    const scored = notes.map(n => {
      let score = 0;
      const titleLower = (n.title || '').toLowerCase();
      const tagsLower = (n.tags || []).join(' ').toLowerCase();
      const summaryLower = (n.summary?.tldr || []).join(' ').toLowerCase();
      const contentSample = (n.type === 'quick' ? n.content : n.content.slice(0, 1500)).toLowerCase();

      for (const tok of effectiveTokens) {
        if (titleLower.includes(tok)) score += 10;
        if (tagsLower.includes(tok)) score += 6;
        if (summaryLower.includes(tok)) score += 4;
        if (contentSample.includes(tok)) score += 1;
      }
      return { note: n, score };
    }).filter(item => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    // Take top matching notes strictly matching query
    relevantNotes = scored.slice(0, 6).map(item => item.note);
  }

  // Citations only include genuine matched notes (NO random notes from vault!)
  const citations = relevantNotes.map(n => n.title).filter(Boolean);
  const relevantNoteIds = relevantNotes.map(n => n.id);

  let prompt = '';

  if (deepInvestigate) {
    // STAGE 2: Deep Investigation of full note text for only the selected notes
    const fullContext = relevantNotes.map(n => `### [[${n.title}]] (${n.type})\n${n.content}\n`).join('\n');
    prompt = `You are the deep investigation synthesis engine for LatticeLedger.
The user wants an in-depth, thorough analysis of their question based on the FULL text of these specific notes:

${fullContext}

User Question: ${question}

Instructions:
- Provide an exhaustive, detailed synthesis in clean Markdown.
- Use headings (## In-Depth Analysis, ## Specific Findings, ## Conclusions).
- Reference notes using [[Note Title]] wiki links so the user can jump directly to them.
- Cite specific details, quotes, or items found in the full text.`;
  } else {
    // STAGE 1: Fast Synthesis using ONLY summaries, tags, and quick notes (sub-second speed)
    const summaryContext = relevantNotes.map(n => {
      const summaryBullets = n.summary?.tldr?.join('; ') || (n.type === 'quick' ? n.content.slice(0, 160) : 'No summary yet');
      return `- [[${n.title}]] (Tags: ${n.tags.join(', ')}): ${summaryBullets}`;
    }).join('\n');

    prompt = `You are the lightning-fast knowledge synthesizer for LatticeLedger.
Answer the user's question quickly and directly based on the following note summaries and tags:

${summaryContext}

User Question: ${question}

Instructions:
- Answer directly and concisely in 2 to 4 sentences or a short bulleted list.
- Use [[Note Title]] wiki links when referencing notes.
- Format with clean Markdown. Do NOT generate unnecessary filler.`;
  }

  // 1. OpenAI Query Execution
  if (provider === 'openai') {
    const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_OPENAI_API_KEY') : null);
    const apiKey = sanitizeApiKey(rawKey);

    if (!apiKey || apiKey === '') {
      throw new Error('OpenAI API key is required. Please configure your OpenAI API key in Settings to use Ask AI.');
    }

    const modelName = config?.modelName || 'gpt-4o-mini';

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are the knowledge synthesis engine for LatticeLedger. Provide a direct, well-synthesized answer in clean Markdown, referencing [[Wiki Links]] where relevant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error?.message || `OpenAI error (HTTP ${response.status})`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || 'No answer generated.';

      return {
        answer,
        citations,
        relevantNoteIds,
        isDeepInvestigation: deepInvestigate
      };
    } catch (err: any) {
      console.error('[OpenAI API] Query error:', err);
      throw err;
    }
  }

  // 2. Google Gemini Query Execution
  const rawKey = config?.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('LL_GEMINI_API_KEY') : null);
  const apiKey = sanitizeApiKey(rawKey);

  if (!apiKey || apiKey === '') {
    throw new Error('Gemini API key is required. Please configure your Gemini API key in Settings to use Ask AI.');
  }

  const modelName = config?.modelName || 'gemini-3.8-flash';
  const ai = new GoogleGenAI({ apiKey });

  try {
    const { text } = await callGeminiWithFallback(ai, modelName, {
      contents: prompt,
      config: {
        maxOutputTokens: deepInvestigate ? 800 : 400,
        temperature: 0.2
      }
    });

    return {
      answer: text || 'No answer generated.',
      citations,
      relevantNoteIds,
      isDeepInvestigation: deepInvestigate
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

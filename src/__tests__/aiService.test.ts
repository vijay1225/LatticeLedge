import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateNoteSummary, 
  queryKnowledgeBase, 
  isGeminiKeyConfigured, 
  sanitizeApiKey,
  fetchAvailableGeminiModels
} from '../services/aiService';
import { HARRY_POTTER_SEED_NOTES } from '../services/harryPotterSeed';

// Mock the GoogleGenAI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            tldr: [
              'Harry Potter is an English half-blood wizard.',
              'Known as the Boy Who Lived after surviving the Killing Curse.'
            ],
            actionItems: ['Locate remaining Horcruxes'],
            tags: ['#Gryffindor', '#ChosenOne'],
            keyEntities: ['Voldemort', 'Hogwarts']
          })
        })
      }
    }))
  };
});

describe('Strict AI Service (Direct Gemini Only - Zero Simulated Heuristics)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  it('sanitizes pasted API keys stripping whitespace, quotes, and backticks', () => {
    expect(sanitizeApiKey('')).toBe('');
    expect(sanitizeApiKey(null)).toBe('');
    expect(sanitizeApiKey('  AIzaSyTestKey  ')).toBe('AIzaSyTestKey');
    expect(sanitizeApiKey('"AIzaSyTestKey"')).toBe('AIzaSyTestKey');
    expect(sanitizeApiKey("'AIzaSyTestKey'")).toBe('AIzaSyTestKey');
    expect(sanitizeApiKey('`AIzaSyTestKey`')).toBe('AIzaSyTestKey');
  });

  it('correctly verifies when Gemini API key is configured or missing', () => {
    expect(isGeminiKeyConfigured()).toBe(false);
    expect(isGeminiKeyConfigured({ provider: 'gemini', apiKey: '   ', modelName: 'gemini-2.5-flash' })).toBe(false);
    expect(isGeminiKeyConfigured({ provider: 'gemini', apiKey: 'AIzaSyFakeKey123', modelName: 'gemini-2.5-flash' })).toBe(true);
    expect(isGeminiKeyConfigured({ provider: 'gemini', apiKey: '  "AIzaSyFakeKey123"  ', modelName: 'gemini-2.5-flash' })).toBe(true);
  });

  it('guarantees that seed notes contain zero pre-baked AI summaries', () => {
    for (const note of HARRY_POTTER_SEED_NOTES) {
      expect(note.summary).toBeUndefined();
    }
  });

  it('strictly rejects generateNoteSummary if no Gemini API key is configured', async () => {
    const note = HARRY_POTTER_SEED_NOTES[0];
    await expect(generateNoteSummary(note)).rejects.toThrow(/Gemini API key is required/i);
    await expect(generateNoteSummary(note, { provider: 'gemini', apiKey: '', modelName: 'gemini-2.5-flash' }))
      .rejects.toThrow(/Gemini API key is required/i);
  });

  it('strictly rejects queryKnowledgeBase if no Gemini API key is configured', async () => {
    await expect(queryKnowledgeBase('Who is Voldemort?', HARRY_POTTER_SEED_NOTES))
      .rejects.toThrow(/Gemini API key is required/i);
  });

  it('successfully generates structured summary when valid API key is supplied', async () => {
    const note = HARRY_POTTER_SEED_NOTES[0];
    const summary = await generateNoteSummary(note, {
      provider: 'gemini',
      apiKey: 'valid-gemini-key',
      modelName: 'gemini-2.5-flash'
    });

    expect(summary).toBeDefined();
    expect(summary.tldr.length).toBe(2);
    expect(summary.tldr[0]).toContain('Harry Potter');
    expect(summary.actionItems).toContain('Locate remaining Horcruxes');
    expect(summary.model).toBe('gemini-2.5-flash');
    expect(typeof summary.generatedAt).toBe('number');
  });

  it('provides default models list when no key is supplied', async () => {
    const models = await fetchAvailableGeminiModels('');
    expect(models).toBeDefined();
    expect(models.length).toBeGreaterThanOrEqual(4);
    expect(models.some(m => m.id.includes('3.8-flash') || m.id.includes('flash'))).toBe(true);
  });

  it('fetches and filters models supporting generateContent from Gemini API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash-Lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-embedding-001', displayName: 'Gemini Embedding', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-3.8-flash-tts', displayName: 'Gemini TTS', supportedGenerationMethods: ['generateContent'] }
        ]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const models = await fetchAvailableGeminiModels('AIzaSyTestKey');
    expect(models.length).toBe(2);
    expect(models.map(m => m.id)).toContain('gemini-3.8-flash');
    expect(models.map(m => m.id)).toContain('gemini-2.5-flash-lite');

    vi.unstubAllGlobals();
  });
});

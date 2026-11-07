import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateNoteSummary, 
  queryKnowledgeBase, 
  isGeminiKeyConfigured,
  isAIConfigured, 
  sanitizeApiKey,
  fetchAvailableGeminiModels,
  fetchAvailableOpenAIModels,
  DEFAULT_OPENAI_MODELS
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

  describe('Universal OpenAI Provider Support', () => {
    it('correctly verifies when OpenAI API key is configured or missing via isAIConfigured', () => {
      expect(isAIConfigured({ provider: 'openai', apiKey: '', modelName: 'gpt-4o-mini' })).toBe(false);
      expect(isAIConfigured({ provider: 'openai', apiKey: '   ', modelName: 'gpt-4o-mini' })).toBe(false);
      expect(isAIConfigured({ provider: 'openai', apiKey: 'sk-proj-testKey123', modelName: 'gpt-4o-mini' })).toBe(true);
      expect(isAIConfigured({ provider: 'openai', apiKey: '  "sk-proj-testKey123"  ', modelName: 'gpt-4o-mini' })).toBe(true);
    });

    it('returns default OpenAI models when no key is supplied', async () => {
      const models = await fetchAvailableOpenAIModels('');
      expect(models).toEqual(DEFAULT_OPENAI_MODELS);
      expect(models.some(m => m.id === 'gpt-4o-mini')).toBe(true);
      expect(models.some(m => m.id === 'gpt-4o')).toBe(true);
    });

    it('fetches and filters chat/reasoning models from OpenAI models API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'gpt-4o-mini' },
            { id: 'gpt-4o' },
            { id: 'o3-mini' },
            { id: 'text-embedding-3-small' },
            { id: 'whisper-1' },
            { id: 'dall-e-3' },
            { id: 'tts-1' }
          ]
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const models = await fetchAvailableOpenAIModels('sk-test-key');
      expect(models.length).toBe(3);
      expect(models.map(m => m.id)).toContain('gpt-4o-mini');
      expect(models.map(m => m.id)).toContain('gpt-4o');
      expect(models.map(m => m.id)).toContain('o3-mini');
      expect(models.map(m => m.id)).not.toContain('text-embedding-3-small');
      expect(models.map(m => m.id)).not.toContain('dall-e-3');

      vi.unstubAllGlobals();
    });

    it('strictly rejects generateNoteSummary if no OpenAI API key is configured', async () => {
      const note = HARRY_POTTER_SEED_NOTES[0];
      await expect(generateNoteSummary(note, { provider: 'openai', apiKey: '', modelName: 'gpt-4o-mini' }))
        .rejects.toThrow(/OpenAI API key is required/i);
    });

    it('strictly rejects queryKnowledgeBase if no OpenAI API key is configured', async () => {
      await expect(queryKnowledgeBase('Who is Harry?', HARRY_POTTER_SEED_NOTES, { provider: 'openai', apiKey: '', modelName: 'gpt-4o-mini' }))
        .rejects.toThrow(/OpenAI API key is required/i);
    });

    it('successfully generates structured summary using OpenAI endpoint', async () => {
      const note = HARRY_POTTER_SEED_NOTES[0];
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tldr: ['Harry Potter defeated Voldemort.', 'Known as the Boy Who Lived.'],
                  actionItems: ['Study Defence Against the Dark Arts'],
                  tags: ['#Hogwarts', '#Gryffindor'],
                  keyEntities: ['Voldemort', 'Dumbledore']
                })
              }
            }
          ]
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const summary = await generateNoteSummary(note, {
        provider: 'openai',
        apiKey: 'sk-proj-valid-openai-key',
        modelName: 'gpt-4o-mini'
      });

      expect(summary).toBeDefined();
      expect(summary.tldr.length).toBe(2);
      expect(summary.tldr[0]).toContain('Harry Potter');
      expect(summary.actionItems).toContain('Study Defence Against the Dark Arts');
      expect(summary.tags).toContain('#Hogwarts');
      expect(summary.model).toBe('gpt-4o-mini');

      vi.unstubAllGlobals();
    });

    it('successfully answers questions across knowledge base using OpenAI endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Based on your notes, [[Harry Potter]] is a half-blood wizard who fought [[Lord Voldemort]].'
              }
            }
          ]
        })
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await queryKnowledgeBase('Who is Harry?', HARRY_POTTER_SEED_NOTES, {
        provider: 'openai',
        apiKey: 'sk-proj-valid-openai-key',
        modelName: 'gpt-4o-mini'
      });

      expect(result).toBeDefined();
      expect(result.answer).toContain('[[Harry Potter]]');
      expect(result.citations.length).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });
  });
});

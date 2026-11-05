import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateNoteSummary, queryKnowledgeBase, isGeminiKeyConfigured } from '../services/aiService';
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

  it('correctly verifies when Gemini API key is configured or missing', () => {
    expect(isGeminiKeyConfigured()).toBe(false);
    expect(isGeminiKeyConfigured({ provider: 'gemini', apiKey: '   ', modelName: 'gemini-2.5-flash' })).toBe(false);
    expect(isGeminiKeyConfigured({ provider: 'gemini', apiKey: 'AIzaSyFakeKey123', modelName: 'gemini-2.5-flash' })).toBe(true);
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
});

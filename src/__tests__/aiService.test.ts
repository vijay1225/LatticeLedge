import { describe, it, expect } from 'vitest';
import { generateNoteSummary, queryKnowledgeBase } from '../services/aiService';
import { HARRY_POTTER_SEED_NOTES } from '../services/harryPotterSeed';

describe('AI Service & Knowledge Synthesis', () => {
  it('generates a structured summary conforming to AISummary schema', async () => {
    const note = HARRY_POTTER_SEED_NOTES[0]; // Harry Potter
    const summary = await generateNoteSummary(note);

    expect(summary).toBeDefined();
    expect(Array.isArray(summary.tldr)).toBe(true);
    expect(summary.tldr.length).toBeGreaterThan(0);
    expect(Array.isArray(summary.actionItems)).toBe(true);
    expect(Array.isArray(summary.tags)).toBe(true);
    expect(typeof summary.generatedAt).toBe('number');
  });

  it('answers questions across Harry Potter notes with citations', async () => {
    const question = 'What are the Horcruxes and who made them?';
    const result = await queryKnowledgeBase(question, HARRY_POTTER_SEED_NOTES);

    expect(result.answer).toBeDefined();
    expect(result.answer.length).toBeGreaterThan(20);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations).toContain('Horcruxes');
  });

  it('handles questions with no matches gracefully', async () => {
    const question = 'xyznonexistent123';
    const result = await queryKnowledgeBase(question, HARRY_POTTER_SEED_NOTES);

    expect(result.answer).toContain('could not find');
    expect(result.citations).toEqual([]);
  });
});

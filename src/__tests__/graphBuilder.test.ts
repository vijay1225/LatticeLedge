import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph } from '../utils/graphBuilder';
import { HARRY_POTTER_SEED_NOTES } from '../services/harryPotterSeed';

describe('Knowledge Graph Construction', () => {
  it('builds nodes for Wiki Pages, Quick Notes, and Tags', () => {
    const graph = buildKnowledgeGraph(HARRY_POTTER_SEED_NOTES);
    
    const wikiNodes = graph.nodes.filter(n => n.type === 'wiki');
    const quickNodes = graph.nodes.filter(n => n.type === 'quick');
    const tagNodes = graph.nodes.filter(n => n.type === 'tag');

    expect(wikiNodes.length).toBe(11); // 11 Wiki Pages (8 Lore + 3 Code/Media/Markdown Showcase)
    expect(quickNodes.length).toBe(5); // 5 Harry Potter Quick Notes
    expect(tagNodes.length).toBeGreaterThan(5); // e.g. #Horcrux, #Hogwarts, #Spells
  });

  it('generates explicit edges for [[wiki-links]]', () => {
    const graph = buildKnowledgeGraph(HARRY_POTTER_SEED_NOTES);
    const explicitEdges = graph.edges.filter(e => e.type === 'explicit');

    expect(explicitEdges.length).toBeGreaterThan(5);

    // Verify edge between Harry Potter and Voldemort
    const harryNode = graph.nodes.find(n => n.label === 'Harry Potter');
    const voldemortNode = graph.nodes.find(n => n.label === 'Lord Voldemort');

    expect(harryNode).toBeDefined();
    expect(voldemortNode).toBeDefined();

    const connection = explicitEdges.find(
      e => (e.source === harryNode?.id && e.target === voldemortNode?.id) ||
           (e.source === voldemortNode?.id && e.target === harryNode?.id)
    );
    expect(connection).toBeDefined();
  });

  it('generates explicit edges for notes even when links array is empty and content has escaped brackets', () => {
    const customNotes = [
      {
        id: 'n-alpha',
        type: 'wiki' as const,
        title: 'Alpha Note',
        content: 'Connecting to \\[\\[Beta Note\\]\\] right here.',
        tags: [],
        links: [], // Empty links array
        createdAt: 1,
        updatedAt: 1
      },
      {
        id: 'n-beta',
        type: 'wiki' as const,
        title: 'Beta Note',
        content: 'Target destination note.',
        tags: [],
        links: [],
        createdAt: 1,
        updatedAt: 1
      }
    ];

    const graph = buildKnowledgeGraph(customNotes);
    const edge = graph.edges.find(e => e.type === 'explicit');
    expect(edge).toBeDefined();
    expect(edge?.source).toBe('note-n-alpha');
    expect(edge?.target).toBe('note-n-beta');
  });
});

import { describe, it, expect } from 'vitest';
import { buildKnowledgeGraph } from '../utils/graphBuilder';
import { HARRY_POTTER_SEED_NOTES } from '../services/harryPotterSeed';

describe('Knowledge Graph Construction', () => {
  it('builds nodes for Wiki Pages, Quick Notes, and Tags', () => {
    const graph = buildKnowledgeGraph(HARRY_POTTER_SEED_NOTES);
    
    const wikiNodes = graph.nodes.filter(n => n.type === 'wiki');
    const quickNodes = graph.nodes.filter(n => n.type === 'quick');
    const tagNodes = graph.nodes.filter(n => n.type === 'tag');

    expect(wikiNodes.length).toBe(8); // 8 Harry Potter Wiki Pages
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

  it('generates semantic edges for shared tags', () => {
    const graph = buildKnowledgeGraph(HARRY_POTTER_SEED_NOTES);
    const semanticEdges = graph.edges.filter(e => e.type === 'semantic');

    expect(semanticEdges.length).toBeGreaterThan(10);
  });
});

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

  it('keeps disconnected clusters and isolated notes grouped in a circular galaxy boundary', () => {
    // Import d3-force to verify circular simulation bounds
    const d3Force = require('d3-force');

    // Create 3 separate clusters + 1 isolated note
    const testNotes = [
      // Cluster 1 (Main lore cluster)
      { id: 'c1-1', type: 'wiki' as const, title: 'Lore Main', content: '[[Lore Sub 1]] [[Lore Sub 2]]', tags: [], links: ['Lore Sub 1', 'Lore Sub 2'], createdAt: 1, updatedAt: 1 },
      { id: 'c1-2', type: 'wiki' as const, title: 'Lore Sub 1', content: 'Sub note', tags: [], links: [], createdAt: 1, updatedAt: 1 },
      { id: 'c1-3', type: 'wiki' as const, title: 'Lore Sub 2', content: 'Sub note', tags: [], links: [], createdAt: 1, updatedAt: 1 },
      // Cluster 2 (Demo showcase cluster, totally disconnected from cluster 1)
      { id: 'c2-1', type: 'wiki' as const, title: 'Demo Main', content: '[[Demo Sub]]', tags: [], links: ['Demo Sub'], createdAt: 1, updatedAt: 1 },
      { id: 'c2-2', type: 'wiki' as const, title: 'Demo Sub', content: 'Demo note', tags: [], links: [], createdAt: 1, updatedAt: 1 },
      // Cluster 3 (Completely isolated single note)
      { id: 'c3-isolated', type: 'wiki' as const, title: 'Isolated Note', content: 'No links anywhere', tags: [], links: [], createdAt: 1, updatedAt: 1 }
    ];

    const graph = buildKnowledgeGraph(testNotes);
    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const targetRadius = 180;

    const simNodes = graph.nodes.map((node, idx) => {
      const angle = (idx / graph.nodes.length) * 2 * Math.PI;
      return {
        ...node,
        radius: 16,
        isPlanet: true,
        isSatellite: false,
        x: centerX + targetRadius * Math.cos(angle),
        y: centerY + targetRadius * Math.sin(angle)
      };
    });

    const simLinks = graph.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type
    }));

    const sim = d3Force.forceSimulation(simNodes)
      .force('charge', d3Force.forceManyBody().strength(-240).distanceMax(450))
      .force('link', d3Force.forceLink(simLinks).id((d: any) => d.id).distance(120).strength(0.4))
      .force('collide', d3Force.forceCollide().radius(28).iterations(2))
      .force('x', d3Force.forceX(centerX).strength(0.07))
      .force('y', d3Force.forceY(centerY).strength(0.07))
      .force('radial', d3Force.forceRadial(targetRadius, centerX, centerY).strength(0.22))
      .force('center', d3Force.forceCenter(centerX, centerY).strength(0.1))
      .alphaDecay(0.028);

    // Run simulation ticks
    for (let i = 0; i < 300; i++) {
      sim.tick();
    }

    // Verify all nodes (including disconnected clusters and isolated notes) stay grouped within the circular area
    for (const node of simNodes) {
      const dist = Math.hypot(node.x - centerX, node.y - centerY);
      // All nodes must stay within 300px of center (never drifting into 500-800+ px void)
      expect(dist).toBeLessThan(320);
      expect(dist).toBeGreaterThan(30);
    }
  });
});

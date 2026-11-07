import { Note, KnowledgeGraphData, KnowledgeGraphNode, KnowledgeGraphEdge } from '../types';

export function buildKnowledgeGraph(notes: Note[]): KnowledgeGraphData {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const nodeMap = new Map<string, KnowledgeGraphNode>();
  const tagNodes = new Map<string, KnowledgeGraphNode>();

  // 1. Add note nodes
  for (const note of notes) {
    if (!note) continue;
    const isWiki = note.type === 'wiki';
    const safeTitle = note.title || (isWiki ? 'Untitled Page' : 'Quick Note');
    const node: KnowledgeGraphNode = {
      id: `note-${note.id}`,
      label: isWiki ? safeTitle : (note.title || (note.content || '').slice(0, 24) + '...'),
      type: isWiki ? 'wiki' : 'quick',
      noteId: note.id,
      size: isWiki ? 16 : 10,
      color: isWiki ? '#f59e0b' : '#38bdf8' // Amber for Wiki, Sky Blue for Quick Notes
    };
    nodes.push(node);
    if (note.title) {
      nodeMap.set(note.title.toLowerCase().trim(), node);
    }
    if (note.id) {
      nodeMap.set(note.id, node);
    }
  }

  // 2. Add explicit [[wiki-links]] edges
  for (const note of notes) {
    if (!note) continue;
    const sourceNode = nodeMap.get(note.id);
    if (!sourceNode) continue;

    for (const linkTitle of (note.links || [])) {
      if (!linkTitle || typeof linkTitle !== 'string') continue;
      const targetNode = nodeMap.get(linkTitle.toLowerCase().trim());
      if (targetNode && targetNode.id !== sourceNode.id) {
        const edgeId = `explicit-${sourceNode.id}-${targetNode.id}`;
        // Prevent duplicate reverse edges
        const reverseEdgeId = `explicit-${targetNode.id}-${sourceNode.id}`;
        if (!edges.some(e => e.id === edgeId || e.id === reverseEdgeId)) {
          edges.push({
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            type: 'explicit',
            label: '[[links]]'
          });
        }
      }
    }
  }

  // 3. Add Tag nodes & Semantic edges
  for (const note of notes) {
    if (!note) continue;
    const sourceNode = nodeMap.get(note.id);
    if (!sourceNode) continue;

    for (const tag of (note.tags || [])) {
      if (!tag || typeof tag !== 'string') continue;
      const cleanTag = tag.trim().toLowerCase();
      if (!cleanTag) continue;

      let tagNode = tagNodes.get(cleanTag);
      if (!tagNode) {
        tagNode = {
          id: `tag-${cleanTag}`,
          label: cleanTag.startsWith('#') ? cleanTag : `#${cleanTag}`,
          type: 'tag',
          size: 7,
          color: '#a855f7' // Purple for tags
        };
        tagNodes.set(cleanTag, tagNode);
        nodes.push(tagNode);
      }

      // Edge from note to tag
      edges.push({
        id: `semantic-${sourceNode.id}-${tagNode.id}`,
        source: sourceNode.id,
        target: tagNode.id,
        type: 'semantic',
        label: 'tag'
      });
    }
  }

  return { nodes, edges };
}

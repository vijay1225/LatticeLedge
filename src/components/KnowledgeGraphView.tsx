import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  Compass, 
  Search
} from 'lucide-react';
import * as d3Force from 'd3-force';
import { KnowledgeGraphData, KnowledgeGraphNode } from '../types';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData;
  onSelectNode: (noteId: string) => void;
}

interface D3Node extends d3Force.SimulationNodeDatum, KnowledgeGraphNode {
  radius: number;
  isPlanet: boolean; // Wiki pages are planetary hubs
  isSatellite: boolean; // Quick notes are orbiting satellites
  parentPlanetId?: string;
  clusterColor: string;
}

interface D3Link extends d3Force.SimulationLinkDatum<D3Node> {
  id: string;
  type: 'explicit' | 'satellite' | 'semantic';
  source: D3Node | string;
  target: D3Node | string;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  graphData,
  onSelectNode
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Simulation references
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);
  const nodesRef = useRef<D3Node[]>([]);
  const linksRef = useRef<D3Link[]>([]);
  const isDraggingNodeRef = useRef<D3Node | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Initialize nodes and links for 2D planetary hub & satellite layout
  useEffect(() => {
    // 1. Convert nodes into Planets vs Satellites
    const nodes: D3Node[] = graphData.nodes.map(node => {
      const isPlanet = node.type === 'wiki';
      const isSatellite = node.type === 'quick';

      return {
        ...node,
        radius: isPlanet ? 16 : isSatellite ? 8 : 6,
        isPlanet,
        isSatellite,
        clusterColor: isPlanet ? '#d97706' : isSatellite ? '#38bdf8' : '#a855f7' // Amber for Planets, Sky for Satellites, Violet for Tags
      };
    });

    // 2. Build links, identifying satellite tethers
    const links: D3Link[] = graphData.edges.map(edge => {
      const isSatelliteTether = 
        (edge.source.includes('quick-') && !edge.target.includes('quick-')) ||
        (edge.target.includes('quick-') && !edge.source.includes('quick-'));

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: isSatelliteTether ? 'satellite' : edge.type === 'explicit' ? 'explicit' : 'semantic'
      };
    });

    nodesRef.current = nodes;
    linksRef.current = links;

    // 3. Initialize D3 Force Simulation
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3Force.forceSimulation<D3Node>(nodes)
      // Many-body repulsion: Planets repel strongly, satellites repel gently
      .force('charge', d3Force.forceManyBody<D3Node>().strength(d => d.isPlanet ? -320 : -80))
      // Links: Satellite tethers are short & tight (orbiting parent), wiki-links are wider
      .force('link', d3Force.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(l => l.type === 'satellite' ? 55 : l.type === 'explicit' ? 140 : 100)
        .strength(l => l.type === 'satellite' ? 0.9 : 0.35)
      )
      // Collision prevention so labels and nodes never overlap
      .force('collide', d3Force.forceCollide<D3Node>().radius(d => d.radius + 14).iterations(2))
      // Center gravity
      .force('center', d3Force.forceCenter(width / 2, height / 2).strength(0.08))
      .alphaDecay(0.028);

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [graphData]);

  // Main Canvas Rendering Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply Pan and Zoom transform
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const nodes = nodesRef.current;
    const links = linksRef.current;

    // Filter matching IDs
    const qLower = filterQuery.toLowerCase().trim();
    const isFiltered = qLower.length > 0;
    const matchingNodeIds = new Set<string>();
    if (isFiltered) {
      nodes.forEach(n => {
        if (n.label.toLowerCase().includes(qLower)) {
          matchingNodeIds.add(n.id);
        }
      });
    }

    // Connected neighbors set for hover highlight
    const connectedNodeIds = new Set<string>();
    const activeLinkIds = new Set<string>();

    if (hoveredNode) {
      connectedNodeIds.add(hoveredNode.id);
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === hoveredNode.id) {
          connectedNodeIds.add(targetId);
          activeLinkIds.add(link.id);
        } else if (targetId === hoveredNode.id) {
          connectedNodeIds.add(sourceId);
          activeLinkIds.add(link.id);
        }
      });
    }

    // 1. Draw Satellite Orbit Rings around Planets
    for (const node of nodes) {
      if (node.isPlanet && node.x !== undefined && node.y !== undefined) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 55, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)'; // Subtle amber orbit ring
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Draw Edges / Connections
    for (const link of links) {
      const source = link.source as D3Node;
      const target = link.target as D3Node;
      if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) continue;

      const isConnected = hoveredNode ? activeLinkIds.has(link.id) : true;
      const opacity = hoveredNode ? (isConnected ? 0.9 : 0.08) : isFiltered ? 0.2 : 0.35;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (link.type === 'satellite') {
        // Delicate dashed tether for orbiting satellites
        ctx.strokeStyle = `rgba(56, 189, 248, ${opacity * 0.8})`;
        ctx.lineWidth = isConnected && hoveredNode ? 1.5 : 1;
        ctx.setLineDash([3, 3]);
      } else if (link.type === 'explicit') {
        // Solid line for [[wiki-links]] between planets
        ctx.strokeStyle = `rgba(217, 119, 6, ${opacity})`;
        ctx.lineWidth = isConnected && hoveredNode ? 2.2 : 1.4;
        ctx.setLineDash([]);
      } else {
        // Semantic AI tag edges
        ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.7})`;
        ctx.lineWidth = isConnected && hoveredNode ? 1.4 : 0.9;
        ctx.setLineDash([4, 4]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Nodes (Planets & Satellites)
    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue;

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNodeId === node.noteId;
      const isConnected = hoveredNode ? connectedNodeIds.has(node.id) : true;
      const isMatched = isFiltered ? matchingNodeIds.has(node.id) : true;

      const alpha = hoveredNode ? (isConnected ? 1.0 : 0.15) : isFiltered ? (isMatched ? 1.0 : 0.2) : 1.0;

      // Outer Glow for Planets and Hovered Nodes
      if (isHovered || isSelected || (node.isPlanet && alpha > 0.5)) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (node.isPlanet ? 6 : 4), 0, 2 * Math.PI);
        ctx.fillStyle = node.isPlanet 
          ? `rgba(217, 119, 6, ${isHovered ? 0.35 : 0.15})`
          : `rgba(56, 189, 248, ${isHovered ? 0.4 : 0.2})`;
        ctx.fill();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.clusterColor;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Planet Core Highlight (makes planets look like celestial hubs)
      if (node.isPlanet) {
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.25, node.y - node.radius * 0.25, node.radius * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;

      // 4. Labels
      const showLabel = isHovered || isSelected || node.isPlanet || (hoveredNode && isConnected) || (isFiltered && isMatched);

      if (showLabel && alpha > 0.3) {
        ctx.font = `${node.isPlanet ? '600 11px' : '500 10px'} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isHovered ? '#ffffff' : node.isPlanet ? '#f4f4f5' : '#a1a1aa';
        ctx.textAlign = 'center';

        // Background pill for label legibility
        const text = node.label;
        const metrics = ctx.measureText(text);
        const textY = node.y + node.radius + 12;

        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(node.x - metrics.width / 2 - 3, textY - 9, metrics.width + 6, 13);

        ctx.fillStyle = isHovered ? '#ffffff' : node.isPlanet ? '#e4e4e7' : '#a1a1aa';
        ctx.fillText(text, node.x, textY);
      }
    }

    ctx.restore();
  }, [transform, hoveredNode, selectedNodeId, filterQuery]);

  // Tick simulation listener to re-render canvas
  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;

    sim.on('tick', renderCanvas);
    renderCanvas();

    return () => {
      sim.on('tick', null);
    };
  }, [renderCanvas]);

  // Reset Center view
  const handleReset = () => {
    setTransform({ x: 0, y: 0, k: 1 });
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  };

  // Mouse wheel zoom centered at mouse position
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.max(0.3, Math.min(transform.k * zoomFactor, 3.5));

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse pointer
    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  // Mouse down: detect node drag vs canvas pan
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.k;

    // Find node under mouse
    let found: D3Node | null = null;
    for (const node of nodesRef.current) {
      if (node.x === undefined || node.y === undefined) continue;
      const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
      if (dist <= node.radius + 6) {
        found = node;
        break;
      }
    }

    if (found) {
      // Start dragging node
      isDraggingNodeRef.current = found;
      found.fx = found.x;
      found.fy = found.y;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.2).restart();
      }
    } else {
      // Start panning canvas
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (isDraggingNodeRef.current) {
      // Dragging a node
      const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
      const mouseY = (e.clientY - rect.top - transform.y) / transform.k;
      isDraggingNodeRef.current.fx = mouseX;
      isDraggingNodeRef.current.fy = mouseY;
      renderCanvas();
      return;
    }

    if (isPanningRef.current) {
      // Panning canvas
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      }));
      return;
    }

    // Hover detection
    const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.k;

    let found: D3Node | null = null;
    for (const node of nodesRef.current) {
      if (node.x === undefined || node.y === undefined) continue;
      const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
      if (dist <= node.radius + 6) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    if (isDraggingNodeRef.current) {
      isDraggingNodeRef.current.fx = null;
      isDraggingNodeRef.current.fy = null;
      isDraggingNodeRef.current = null;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
    }
    isPanningRef.current = false;
  };

  const handleClick = () => {
    if (hoveredNode && hoveredNode.noteId) {
      setSelectedNodeId(hoveredNode.noteId);
      onSelectNode(hoveredNode.noteId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden select-none"
    >
      {/* Top Floating Bar: Graph Mode & Search Filter */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2 shadow-sm">
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          <span>2D Knowledge Galaxy</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {graphData.nodes.length} Nodes • Satellites
          </span>
        </div>

        {/* In-Graph Search Filter */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 focus-within:border-zinc-700">
          <Search className="w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter nodes..."
            className="w-28 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Floating Zoom & Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-md p-0.5 shadow-sm">
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.2, 3.5) }))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k * 0.8, 0.3) }))}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleReset}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Center Galaxy"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Modern D3 Legend Footer */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-zinc-200 font-medium">Wiki Planets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-zinc-300">Quick Satellites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-zinc-400">Concept Tags</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500/80" />
            <span>[[wiki-links]]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-b border-dashed border-sky-400/80" />
            <span>Satellite Tethers</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Scroll to zoom • Drag to pan or move nodes • Click to open</span>
        </div>
      </div>
    </div>
  );
};

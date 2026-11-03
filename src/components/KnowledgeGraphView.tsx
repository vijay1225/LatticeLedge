import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Compass, 
  Search,
  ExternalLink,
  X,
  Copy,
  Check,
  Zap,
  FileText,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import * as d3Force from 'd3-force';
import { KnowledgeGraphData, KnowledgeGraphNode } from '../types';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData;
  onSelectNode: (noteId: string) => void;
}

interface D3Node extends d3Force.SimulationNodeDatum, KnowledgeGraphNode {
  radius: number;
  isPlanet: boolean;
  isSatellite: boolean;
  clusterColor: string;
}

interface D3Link extends d3Force.SimulationLinkDatum<D3Node> {
  id: string;
  type: 'explicit' | 'satellite' | 'semantic';
  source: D3Node | string;
  target: D3Node | string;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: D3Node;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  graphData,
  onSelectNode
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNode, setHoveredNode] = useState<D3Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<D3Node | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [hideQuickNotes, setHideQuickNotes] = useState(false);

  // Simulation references
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);
  const nodesRef = useRef<D3Node[]>([]);
  const linksRef = useRef<D3Link[]>([]);
  const isDraggingNodeRef = useRef<D3Node | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Initialize D3 Force Simulation
  useEffect(() => {
    // Filter out quick notes if user has toggled them off
    const sourceNodes = hideQuickNotes 
      ? graphData.nodes.filter(n => n.type !== 'quick')
      : graphData.nodes;

    const activeNodeIdSet = new Set(sourceNodes.map(n => n.id));

    const sourceEdges = graphData.edges.filter(e => 
      activeNodeIdSet.has(e.source) && activeNodeIdSet.has(e.target)
    );

    const nodes: D3Node[] = sourceNodes.map(node => {
      const isPlanet = node.type === 'wiki';
      const isSatellite = node.type === 'quick';

      return {
        ...node,
        radius: isPlanet ? 16 : isSatellite ? 8 : 6,
        isPlanet,
        isSatellite,
        clusterColor: isPlanet ? '#d97706' : isSatellite ? '#38bdf8' : '#a855f7'
      };
    });

    const links: D3Link[] = sourceEdges.map(edge => {
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

    if (selectedNode?.isSatellite && hideQuickNotes) {
      setSelectedNode(null);
    }

    nodesRef.current = nodes;
    linksRef.current = links;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3Force.forceSimulation<D3Node>(nodes)
      .force('charge', d3Force.forceManyBody<D3Node>().strength(d => d.isPlanet ? -320 : -80))
      .force('link', d3Force.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(l => l.type === 'satellite' ? 55 : l.type === 'explicit' ? 140 : 100)
        .strength(l => l.type === 'satellite' ? 0.9 : 0.35)
      )
      .force('collide', d3Force.forceCollide<D3Node>().radius(d => d.radius + 14).iterations(2))
      .force('center', d3Force.forceCenter(width / 2, height / 2).strength(0.08))
      .alphaDecay(0.028);

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [graphData, hideQuickNotes]);

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

    // Active focused node (Selected node takes priority, otherwise hovered node)
    const activeFocusNode = selectedNode || hoveredNode;
    const connectedNodeIds = new Set<string>();
    const activeLinkIds = new Set<string>();

    if (activeFocusNode) {
      connectedNodeIds.add(activeFocusNode.id);
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === activeFocusNode.id) {
          connectedNodeIds.add(targetId);
          activeLinkIds.add(link.id);
        } else if (targetId === activeFocusNode.id) {
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
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Draw Edges
    for (const link of links) {
      const source = link.source as D3Node;
      const target = link.target as D3Node;
      if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) continue;

      const isConnected = activeFocusNode ? activeLinkIds.has(link.id) : true;
      const opacity = activeFocusNode ? (isConnected ? 0.95 : 0.06) : isFiltered ? 0.2 : 0.35;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (link.type === 'satellite') {
        ctx.strokeStyle = `rgba(56, 189, 248, ${opacity * 0.9})`;
        ctx.lineWidth = isConnected && activeFocusNode ? 1.8 : 1;
        ctx.setLineDash([3, 3]);
      } else if (link.type === 'explicit') {
        ctx.strokeStyle = `rgba(217, 119, 6, ${opacity})`;
        ctx.lineWidth = isConnected && activeFocusNode ? 2.5 : 1.4;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = `rgba(168, 85, 247, ${opacity * 0.7})`;
        ctx.lineWidth = isConnected && activeFocusNode ? 1.5 : 0.9;
        ctx.setLineDash([4, 4]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Nodes
    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue;

      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isConnected = activeFocusNode ? connectedNodeIds.has(node.id) : true;
      const isMatched = isFiltered ? matchingNodeIds.has(node.id) : true;

      const alpha = activeFocusNode ? (isConnected ? 1.0 : 0.12) : isFiltered ? (isMatched ? 1.0 : 0.2) : 1.0;

      // Outer Selection / Glow Ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 12, 0, 2 * Math.PI);
        ctx.fillStyle = node.clusterColor + '44';
        ctx.fill();
      } else if (isHovered || (node.isPlanet && alpha > 0.5)) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (node.isPlanet ? 6 : 4), 0, 2 * Math.PI);
        ctx.fillStyle = node.isPlanet 
          ? `rgba(217, 119, 6, ${isHovered ? 0.4 : 0.15})`
          : `rgba(56, 189, 248, ${isHovered ? 0.4 : 0.2})`;
        ctx.fill();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.clusterColor;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Planet Core Highlight
      if (node.isPlanet) {
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.25, node.y - node.radius * 0.25, node.radius * 0.4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;

      // 4. Labels
      const showLabel = isSelected || isHovered || node.isPlanet || (activeFocusNode && isConnected) || (isFiltered && isMatched);

      if (showLabel && alpha > 0.3) {
        ctx.font = `${node.isPlanet ? '600 11px' : '500 10px'} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isSelected ? '#ffffff' : isHovered ? '#ffffff' : node.isPlanet ? '#f4f4f5' : '#a1a1aa';
        ctx.textAlign = 'center';

        const text = node.label;
        const metrics = ctx.measureText(text);
        const textY = node.y + node.radius + 12;

        ctx.fillStyle = isSelected ? 'rgba(24, 24, 27, 0.95)' : 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(node.x - metrics.width / 2 - 4, textY - 9, metrics.width + 8, 14);

        if (isSelected) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(node.x - metrics.width / 2 - 4, textY - 9, metrics.width + 8, 14);
        }

        ctx.fillStyle = isSelected ? '#ffffff' : node.isPlanet ? '#e4e4e7' : '#a1a1aa';
        ctx.fillText(text, node.x, textY);
      }
    }

    ctx.restore();
  }, [transform, hoveredNode, selectedNode, filterQuery]);

  useEffect(() => {
    const sim = simulationRef.current;
    if (!sim) return;

    sim.on('tick', renderCanvas);
    renderCanvas();

    return () => {
      sim.on('tick', null);
    };
  }, [renderCanvas]);

  const handleReset = () => {
    setTransform({ x: 0, y: 0, k: 1 });
    setSelectedNode(null);
    setContextMenu(null);
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.max(0.3, Math.min(transform.k * zoomFactor, 3.5));

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left-click closes context menu
    if (e.button === 0 && contextMenu) {
      setContextMenu(null);
    }

    hasDraggedRef.current = false;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.k;

    // Detect node under mouse
    let found: D3Node | null = null;
    for (const node of nodesRef.current) {
      if (node.x === undefined || node.y === undefined) continue;
      const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
      if (dist <= node.radius + 6) {
        found = node;
        break;
      }
    }

    if (e.button === 0) { // Left click
      if (found) {
        isDraggingNodeRef.current = found;
        found.fx = found.x;
        found.fy = found.y;
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0.2).restart();
        }
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (isDraggingNodeRef.current) {
      hasDraggedRef.current = true;
      const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
      const mouseY = (e.clientY - rect.top - transform.y) / transform.k;
      isDraggingNodeRef.current.fx = mouseX;
      isDraggingNodeRef.current.fy = mouseY;
      renderCanvas();
      return;
    }

    if (isPanningRef.current) {
      hasDraggedRef.current = true;
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      }));
      return;
    }

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

  // User specifically requested:
  // "when i click on node on graph it is going to corresponding page whcih i don't want
  // i want to know which are the connected notes to that by clicking that note
  // if want to go that notes by clicking the note i will right click and say go to notes"
  const handleClick = () => {
    if (hasDraggedRef.current) return;

    if (hoveredNode) {
      // LEFT CLICK: Select / Focus this node to inspect all its connected notes!
      setSelectedNode(hoveredNode);
    } else {
      // Clicked on empty space: deselect
      setSelectedNode(null);
    }
  };

  // RIGHT CLICK: Open custom Context Menu with "Go to Note"
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        node: hoveredNode
      });
    }
  };

  // Calculate connected neighbors of selected node
  const getConnectedDetails = () => {
    if (!selectedNode) return null;

    const links = linksRef.current;
    const connectedNodes: { node: D3Node; relation: string }[] = [];

    links.forEach(l => {
      const source = l.source as D3Node;
      const target = l.target as D3Node;
      if (source.id === selectedNode.id) {
        connectedNodes.push({
          node: target,
          relation: l.type === 'satellite' ? 'Orbiting Satellite' : l.type === 'explicit' ? 'Wiki Link' : 'Shared Tag'
        });
      } else if (target.id === selectedNode.id) {
        connectedNodes.push({
          node: source,
          relation: l.type === 'satellite' ? 'Parent Planet' : l.type === 'explicit' ? 'Backlink' : 'Shared Tag'
        });
      }
    });

    return connectedNodes;
  };

  const connectedDetails = getConnectedDetails();

  const handleCopyLink = (label: string) => {
    navigator.clipboard.writeText(`[[${label}]]`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden select-none"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
    >
      {/* Top Floating Bar: Graph Status & Search Filter */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2 shadow-sm">
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          <span>2D Knowledge Galaxy</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {graphData.nodes.length} Nodes
          </span>
        </div>

        {/* Filter search */}
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
        onContextMenu={handleContextMenu}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* CONNECTED NOTES INSPECTOR CARD (Shown on Left-Click) */}
      {selectedNode && connectedDetails && (
        <div className="absolute top-14 right-3 z-20 w-80 max-h-[75vh] flex flex-col rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md text-xs animate-in fade-in duration-150">
          {/* Card Header */}
          <div className="p-3 border-b border-zinc-800 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: selectedNode.clusterColor }} 
                />
                <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
                  {selectedNode.isPlanet ? 'Planetary Hub' : selectedNode.isSatellite ? 'Orbiting Satellite' : 'Concept Tag'}
                </span>
              </div>
              <h3 className="font-bold text-sm text-zinc-100 truncate">
                {selectedNode.label}
              </h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connected Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
              <span>Connected Notes ({connectedDetails.length})</span>
              <span className="text-zinc-600 font-normal">Click node to inspect</span>
            </div>

            {connectedDetails.length > 0 ? (
              <div className="space-y-1.5">
                {connectedDetails.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedNode(item.node);
                    }}
                    className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.node.isPlanet ? (
                          <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                        ) : (
                          <Zap className="w-3 h-3 text-sky-400 shrink-0" />
                        )}
                        <span className="font-medium text-zinc-300 group-hover:text-white truncate">
                          {item.node.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        {item.relation}
                      </span>
                    </div>

                    {item.node.noteId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNode(item.node.noteId!);
                        }}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Open note in editor"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-zinc-600 text-xs">
                No direct connections.
              </div>
            )}
          </div>

          {/* Action Footer */}
          {selectedNode.noteId && (
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCopyLink(selectedNode.label)}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>[[Link]]</span>
              </button>

              <button
                onClick={() => {
                  onSelectNode(selectedNode.noteId!);
                }}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Go to Note</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* RIGHT CLICK CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed z-50 min-w-[160px] rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl py-1 text-xs text-zinc-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 180), 
            top: Math.min(contextMenu.y, window.innerHeight - 150) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/80 mb-1">
            {contextMenu.node.label}
          </div>

          {contextMenu.node.noteId && (
            <button
              onClick={() => {
                onSelectNode(contextMenu.node.noteId!);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors font-medium text-indigo-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Go to Note</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedNode(contextMenu.node);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-300 transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>Show Connections</span>
          </button>

          <button
            onClick={() => {
              handleCopyLink(contextMenu.node.label);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-zinc-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy [[wiki-link]]</span>
          </button>
        </div>
      )}

      {/* Footer Instructions */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-zinc-200 font-medium">Wiki Planets</span>
          </div>
          {!hideQuickNotes && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-zinc-300">Quick Satellites</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-zinc-400">Concept Tags</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <button
            onClick={() => setHideQuickNotes(prev => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              hideQuickNotes 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' 
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}
            title={hideQuickNotes ? 'Show Quick Note Satellites' : 'Hide Quick Notes to simplify large graph'}
          >
            {hideQuickNotes ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3" />}
            <span>{hideQuickNotes ? 'Show Quick Notes' : 'Hide Quick Notes'}</span>
          </button>
        </div>

        <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
          <Info className="w-3 h-3 text-indigo-400" />
          <span>Left-click: Highlight & view connected notes • Right-click: &quot;Go to Note&quot;</span>
        </div>
      </div>
    </div>
  );
};

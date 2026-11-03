import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Info, Sparkles } from 'lucide-react';
import { KnowledgeGraphData, KnowledgeGraphNode } from '../types';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData;
  onSelectNode: (noteId: string) => void;
}

interface SimNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  graphData,
  onSelectNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const simNodesRef = useRef<SimNode[]>([]);

  // Initialize simulation positions
  useEffect(() => {
    const width = 800;
    const height = 600;

    simNodesRef.current = graphData.nodes.map((node, i) => {
      const angle = (i / graphData.nodes.length) * 2 * Math.PI;
      const radius = 120 + (i % 3) * 60;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0
      };
    });
  }, [graphData]);

  // Physics animation loop
  useEffect(() => {
    let animId: number;

    const runPhysics = () => {
      const nodes = simNodesRef.current;
      const edges = graphData.edges;
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 1. Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.15;
            nodes[i].vx -= dx * force;
            nodes[i].vy -= dy * force;
            nodes[j].vx += dx * force;
            nodes[j].vy += dy * force;
          }
        }
      }

      // 2. Attraction along edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = edge.type === 'explicit' ? 90 : 130;
          const force = (dist - targetDist) * (edge.type === 'explicit' ? 0.008 : 0.003);
          
          source.vx += dx * force;
          source.vy += dy * force;
          target.vx -= dx * force;
          target.vy -= dy * force;
        }
      }

      // 3. Center gravity & damping
      for (const node of nodes) {
        node.vx += (400 - node.x) * 0.001;
        node.vy += (300 - node.y) * 0.001;
        node.vx *= 0.88;
        node.vy *= 0.88;
        node.x += node.vx;
        node.y += node.vy;
      }

      drawCanvas();
      animId = requestAnimationFrame(runPhysics);
    };

    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Pan & Zoom transform
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-400, -300);

      const nodeMap = new Map(simNodesRef.current.map(n => [n.id, n]));

      // 1. Draw Edges
      for (const edge of graphData.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (edge.type === 'explicit') {
          // Solid line for [[wiki-links]]
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([]);
        } else {
          // Dashed line for semantic AI tags
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
      }

      // 2. Draw Nodes
      for (const node of simNodesRef.current) {
        const isHovered = hoveredNode?.id === node.id;
        ctx.setLineDash([]);

        // Outer glow on hover
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size + 6, 0, 2 * Math.PI);
          ctx.fillStyle = node.color + '44';
          ctx.fill();
        }

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 12 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = `${node.type === 'wiki' ? 'bold 11px' : '10px'} -apple-system, sans-serif`;
        ctx.fillStyle = isHovered ? '#ffffff' : '#d6d3d1';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.size + 13);
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(runPhysics);
    return () => cancelAnimationFrame(animId);
  }, [graphData, zoom, pan, hoveredNode]);

  // Mouse event handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - canvas.width / 2 - pan.x) / zoom + 400;
    const worldY = (mouseY - canvas.height / 2 - pan.y) / zoom + 300;

    let found: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dist = Math.sqrt((worldX - node.x) ** 2 + (worldY - node.y) ** 2);
      if (dist < node.size + 5) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (hoveredNode && hoveredNode.noteId) {
      onSelectNode(hoveredNode.noteId);
    }
  };

  return (
    <div className="relative w-full h-full bg-stone-950 flex flex-col overflow-hidden select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-stone-900/80 border border-stone-800 backdrop-blur-md text-xs font-semibold text-stone-200 flex items-center gap-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Interactive Knowledge Graph</span>
          <span className="text-[10px] text-stone-500 font-normal">
            ({graphData.nodes.length} nodes, {graphData.edges.length} edges)
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-stone-900/80 border border-stone-800 rounded-xl p-1 backdrop-blur-md shadow-lg">
        <button
          onClick={() => setZoom(z => Math.min(z + 0.15, 2.5))}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.15, 0.4))}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={650}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Legend & Instructions Footer */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-xl bg-stone-900/80 border border-stone-800 backdrop-blur-md text-xs text-stone-400 shadow-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-stone-300">Wiki Pages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-stone-300">Quick Notes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-stone-300">Tags</span>
          </div>
          <div className="h-3 w-px bg-stone-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-amber-500/80" />
            <span className="text-stone-300">[[wiki-links]]</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-b border-dashed border-purple-400/80" />
            <span className="text-stone-300">AI Tag Associations</span>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>Click any node to open note</span>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Info, Sparkles, Play, Pause } from 'lucide-react';
import { KnowledgeGraphData, KnowledgeGraphNode } from '../types';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData;
  onSelectNode: (noteId: string) => void;
}

interface SphereNode extends KnowledgeGraphNode {
  // 3D coordinates on celestial sphere
  x3d: number;
  y3d: number;
  z3d: number;
  // 2D screen projected coordinates
  screenX: number;
  screenY: number;
  scale: number;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  graphData,
  onSelectNode
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 0.2, y: 0.3 });
  const [isRotating, setIsRotating] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SphereNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const sphereNodesRef = useRef<SphereNode[]>([]);

  // Initialize spherical / ball coordinates
  useEffect(() => {
    const total = graphData.nodes.length;
    // Map nodes onto a sphere using Fibonacci spiral distribution
    const radius = 170; // Ball radius in 3D

    sphereNodesRef.current = graphData.nodes.map((node, i) => {
      // Wiki nodes placed on slightly larger orbit, tags in center/inner
      const r = node.type === 'wiki' ? radius : node.type === 'quick' ? radius * 1.15 : radius * 0.75;
      
      const phi = Math.acos(1 - (2 * (i + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      return {
        ...node,
        x3d: x,
        y3d: y,
        z3d: z,
        screenX: 0,
        screenY: 0,
        scale: 1
      };
    });
  }, [graphData]);

  // Main rendering & rotation animation loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Ensure canvas pixel dimensions match actual container size
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Auto rotation when enabled
      if (isRotating && !isDragging) {
        setRotation(prev => ({
          x: prev.x + 0.0015,
          y: prev.y + 0.003
        }));
      }

      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);

      // 1. Project 3D nodes to 2D centered coordinates
      const nodes = sphereNodesRef.current;
      for (const node of nodes) {
        // Rotate around Y axis
        const x1 = node.x3d * cosY - node.z3d * sinY;
        const z1 = node.z3d * cosY + node.x3d * sinY;

        // Rotate around X axis
        const y2 = node.y3d * cosX - z1 * sinX;
        const z2 = z1 * cosX + node.y3d * sinX;

        // Perspective projection
        const fov = 400;
        const distance = fov + z2;
        const scale = distance > 0 ? (fov / distance) * zoom : 0.1;

        node.screenX = centerX + x1 * scale;
        node.screenY = centerY + y2 * scale;
        node.scale = scale;
        node.z3d = z2; // store rotated z for depth sorting
      }

      // Sort nodes by depth (z3d) so background nodes draw first
      const sortedNodes = [...nodes].sort((a, b) => a.z3d - b.z3d);
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 2. Draw Subtle Sphere Wireframe / Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, 170 * zoom, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 170 * zoom, 60 * zoom, rotation.y, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
      ctx.stroke();

      // 3. Draw Edges
      for (const edge of graphData.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        const avgZ = (source.z3d + target.z3d) / 2;
        const alpha = Math.max(0.08, Math.min(0.6, (avgZ + 200) / 400));

        ctx.beginPath();
        ctx.moveTo(source.screenX, source.screenY);
        ctx.lineTo(target.screenX, target.screenY);

        if (edge.type === 'explicit') {
          // Solid line for [[wiki-links]]
          ctx.strokeStyle = `rgba(129, 140, 248, ${alpha * 0.9})`;
          ctx.lineWidth = 1.4 * source.scale;
          ctx.setLineDash([]);
        } else {
          // Dashed line for semantic tags
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.4})`;
          ctx.lineWidth = 0.9 * source.scale;
          ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
      }

      // 4. Draw Nodes with depth shading
      for (const node of sortedNodes) {
        const isHovered = hoveredNode?.id === node.id;
        ctx.setLineDash([]);

        const depthAlpha = Math.max(0.3, Math.min(1.0, (node.z3d + 200) / 400));
        const nodeRadius = Math.max(3, (node.size * 0.7) * node.scale);

        // Hover outer aura
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, nodeRadius + 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
          ctx.fill();
        }

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.screenX, node.screenY, nodeRadius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = isHovered ? 1.0 : depthAlpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Label (only show for foreground nodes or on hover to keep sphere clean)
        if (isHovered || node.z3d > -40) {
          ctx.font = `${isHovered ? 'bold 11px' : '10px'} -apple-system, sans-serif`;
          ctx.fillStyle = isHovered ? '#ffffff' : `rgba(212, 212, 216, ${depthAlpha})`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.screenX, node.screenY + nodeRadius + 12);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [graphData, zoom, rotation, isRotating, isDragging, hoveredNode]);

  // Drag to rotate spherical ball
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setRotation(prev => ({
        x: prev.x + deltaY * 0.005,
        y: prev.y + deltaX * 0.005
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found: SphereNode | null = null;
    for (const node of sphereNodesRef.current) {
      const dist = Math.sqrt((mouseX - node.screenX) ** 2 + (mouseY - node.screenY) ** 2);
      if (dist < (node.size + 6) * node.scale) {
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
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-zinc-950 flex flex-col overflow-hidden select-none"
    >
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Spherical Knowledge Graph</span>
          <span className="text-[10px] text-zinc-500 font-mono">
            ({graphData.nodes.length} nodes)
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-1.5 rounded text-xs transition-colors ${
            isRotating ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={isRotating ? 'Pause Rotation' : 'Auto-Rotate'}
        >
          {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <div className="w-px h-3 bg-zinc-800 mx-0.5" />
        <button
          onClick={() => setZoom(z => Math.min(z + 0.15, 2.0))}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setZoom(1); setRotation({ x: 0.2, y: 0.3 }); }}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200"
          title="Reset Centered Ball"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Responsive Centered Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Legend Footer */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-zinc-300">Pages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-zinc-300">Quick Notes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-zinc-300">Tags</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-400" />
            <span>[[links]]</span>
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Drag sphere to rotate • Click node to open</span>
        </div>
      </div>
    </div>
  );
};

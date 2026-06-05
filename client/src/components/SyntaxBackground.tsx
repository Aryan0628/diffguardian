"use client";

import { useEffect, useRef, useState } from "react";

export default function SyntaxBackground() {
  const [nodes, setNodes] = useState<{ x: number; y: number; delay: number }[]>([]);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a fixed random set of points for the "syntax tree"
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const windowHeight = 800; // Only covering top section
    const newNodes = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * windowWidth,
      y: Math.random() * windowHeight,
      delay: Math.random() * 5,
    }));
    setNodes(newNodes);

    const handleMouseMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div 
      ref={ref} 
      className="syntax-bg-container"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "120vh",
        overflow: "hidden",
        zIndex: -1,
        pointerEvents: "none"
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
        {nodes.map((node, i) => {
          // Connect to 2 nearest neighbors
          const neighbors = [...nodes]
            .sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y))
            .slice(1, 3);

          // Distance to mouse for interaction
          const distToMouse = Math.hypot(mouse.x - node.x, mouse.y - node.y);
          const interactiveOpacity = Math.max(0, 1 - distToMouse / 300) * 0.5 + 0.05;

          return (
            <g key={i}>
              <circle 
                cx={node.x} 
                cy={node.y} 
                r="1.5" 
                fill="var(--accent)" 
                opacity={interactiveOpacity * 2}
                style={{
                  transition: "opacity 0.2s ease-out",
                  animation: `pulseOpacity 4s infinite alternate ${node.delay}s`
                }}
              />
              {neighbors.map((n, j) => (
                <line
                  key={`${i}-${j}`}
                  x1={node.x}
                  y1={node.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="var(--accent)"
                  strokeWidth="0.5"
                  opacity={interactiveOpacity}
                  style={{ transition: "opacity 0.2s ease-out" }}
                />
              ))}
            </g>
          );
        })}
      </svg>
      {/* Top horizontal beam */}
      <div 
        style={{
          position: "absolute",
          top: "400px",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
          opacity: 0.1,
          animation: "panBeam 8s linear infinite"
        }}
      />
    </div>
  );
}

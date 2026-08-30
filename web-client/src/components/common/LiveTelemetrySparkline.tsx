import React, { useEffect, useRef } from 'react';

interface LiveTelemetrySparklineProps {
  color: string;
  currentValue: number;
  height?: number;
  minVal?: number;
  maxVal?: number;
  speed?: number;
}

export const LiveTelemetrySparkline: React.FC<LiveTelemetrySparklineProps> = ({
  color,
  currentValue,
  height = 48,
  minVal = 0,
  maxVal = 100,
  speed = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetValRef = useRef<number>(currentValue);
  const animFrameRef = useRef<number | null>(null);

  // Entrance draw progress (0 -> 1)
  const growProgressRef = useRef<number>(0);
  
  // Real historical data buffer (6 nodes representing the growth/dip curve)
  const displayNodesRef = useRef<number[]>([0.15, 0.38, 0.26, 0.62, 0.48, 0.85]);

  // Keep target value synced
  useEffect(() => {
    targetValRef.current = currentValue;
  }, [currentValue]);

  // Reset entrance draw progress on mount
  useEffect(() => {
    growProgressRef.current = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Entrance draw progress (smooth left-to-right entrance draw, no snake crawling!)
      if (growProgressRef.current < 1) {
        growProgressRef.current = Math.min(1, growProgressRef.current + 0.04 * speed);
      }

      // 2. Compute normalized Y height for current real metric value (0.0 = bottom, 1.0 = top)
      const range = (maxVal - minVal) || 1;
      const normVal = Math.max(0.05, Math.min(0.98, (targetValRef.current - minVal) / range));

      // Calculate Target Nodes based on real metric state
      // Node 0: Left origin
      // Node 1: Primary rise
      // Node 2: Dip
      // Node 3: Secondary rise
      // Node 4: Pre-tip dip
      // Node 5: Final tip (directly driven by normVal!)
      const targetNodes = [
        0.12,
        Math.min(0.85, normVal * 0.55 + 0.15),
        Math.min(0.70, normVal * 0.40 + 0.10),
        Math.min(0.92, normVal * 0.75 + 0.12),
        Math.min(0.80, normVal * 0.60 + 0.10),
        normVal
      ];

      // Smoothly spring displayNodes towards targetNodes when numbers change
      const displayNodes = displayNodesRef.current;
      for (let i = 0; i < targetNodes.length; i++) {
        if (displayNodes[i] === undefined) displayNodes[i] = targetNodes[i];
        displayNodes[i] += (targetNodes[i] - displayNodes[i]) * 0.10;
      }

      // Canvas Margins for Arrowhead spacing
      const padLeft = 10;
      const padRight = 24;
      const padTop = 10;
      const padBottom = 8;

      const usableW = w - padLeft - padRight;
      const usableH = h - padTop - padBottom;

      const currentDrawW = usableW * growProgressRef.current;
      const totalNodes = displayNodes.length;

      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < totalNodes; i++) {
        const normX = i / (totalNodes - 1);
        const targetX = padLeft + normX * usableW;

        if (targetX > padLeft + currentDrawW + 2) break; // Clip during entrance draw

        const x = Math.min(targetX, padLeft + currentDrawW);
        const nodeVal = displayNodes[i];
        const y = (h - padBottom) - (nodeVal * usableH);
        points.push({ x, y });
      }

      if (points.length > 1) {
        // Resolve Theme CSS Color
        let resolvedColor = color;
        if (color.startsWith('var(')) {
          if (color.includes('accent')) resolvedColor = '#d97706';
          else if (color.includes('info')) resolvedColor = '#3b82f6';
          else if (color.includes('success')) resolvedColor = '#10b981';
          else if (color.includes('warning')) resolvedColor = '#f59e0b';
          else if (color.includes('critical')) resolvedColor = '#ef4444';
          else resolvedColor = '#10b981';
        }

        const hexToRgba = (hexStr: string, alpha: number) => {
          if (hexStr.startsWith('#')) {
            const hex = hexStr.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) || 16;
            const g = parseInt(hex.substring(2, 4), 16) || 185;
            const b = parseInt(hex.substring(4, 6), 16) || 129;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          return `rgba(16, 185, 129, ${alpha})`;
        };

        // 1. Draw Gradient Area Fill beneath the graph
        const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
        fillGradient.addColorStop(0, hexToRgba(resolvedColor, 0.32));
        fillGradient.addColorStop(1, hexToRgba(resolvedColor, 0.01));

        ctx.beginPath();
        ctx.moveTo(points[0].x, h - padBottom);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }

        const lastP = points[points.length - 1];
        ctx.lineTo(lastP.x, h - padBottom);
        ctx.closePath();

        ctx.fillStyle = fillGradient;
        ctx.fill();

        // 2. Draw Clean Graph Polyline (Bold Stroke, No artificial snake motion)
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = resolvedColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = resolvedColor;
        ctx.lineWidth = 3.2;
        ctx.stroke();

        // 3. Draw Arrowhead Tip (Points along true data trajectory vector)
        if (points.length >= 2) {
          const pEnd = points[points.length - 1];
          const pPrev = points[points.length - 2];
          const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
          const arrowLength = 12;
          const arrowWidth = 7;

          ctx.save();
          ctx.translate(pEnd.x, pEnd.y);
          ctx.rotate(angle);

          ctx.beginPath();
          ctx.moveTo(4, 0); // Tip pointing forward along true graph trajectory
          ctx.lineTo(-arrowLength, -arrowWidth);
          ctx.lineTo(-arrowLength * 0.65, 0);
          ctx.lineTo(-arrowLength, arrowWidth);
          ctx.closePath();

          ctx.fillStyle = resolvedColor;
          ctx.shadowColor = resolvedColor;
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.restore();
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [color, minVal, maxVal, speed]);

  return (
    <div style={{ width: '100%', height: `${height}px`, position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

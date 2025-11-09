"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Point } from '../utils/pointInPolygon';

export type ZoneDrawerProps = {
  width: number;
  height: number;
  onChange?: (points: Point[]) => void;
};

export default function NoParkingZoneDrawer({ width, height, onChange }: ZoneDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [closed, setClosed] = useState<boolean>(false);

  const ctx = useMemo(() => canvasRef.current?.getContext('2d') ?? null, [canvasRef.current]);

  useEffect(() => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // shade background
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, width, height);

    // draw polygon
    if (points.length) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (closed) ctx.closePath();
      ctx.fillStyle = 'rgba(0, 150, 255, 0.25)';
      ctx.strokeStyle = '#39a0ff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // handles
      ctx.fillStyle = '#fff';
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [ctx, points, closed, width, height]);

  useEffect(() => {
    onChange?.(closed ? points : []);
  }, [points, closed, onChange]);

  function canvasPos(e: React.MouseEvent): Point {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onClick(e: React.MouseEvent) {
    if (closed) return;
    const p = canvasPos(e);
    setPoints(prev => [...prev, p]);
  }

  function onDoubleClick() {
    if (points.length >= 3) setClosed(true);
  }

  function reset() {
    setPoints([]);
    setClosed(false);
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      />
      <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => setClosed(true)} disabled={closed || points.length < 3} style={btnStyle}>Complete</button>
        <button onClick={reset} style={btnStyle}>Clear</button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#17223a',
  color: '#d9e8ff',
  border: '1px solid #2a3b64',
  borderRadius: 8,
  padding: '6px 10px'
};

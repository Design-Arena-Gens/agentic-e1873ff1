"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ObjectDetection, DetectedObject } from '@tensorflow-models/coco-ssd';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import NoParkingZoneDrawer from '../../components/NoParkingZoneDrawer';
import { isPointInPolygon, type Point } from '../../utils/pointInPolygon';
import { addFine } from '../../utils/finesStore';
import Tesseract from 'tesseract.js';

const VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'motorcycle']);

export default function LiveDetector() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [model, setModel] = useState<ObjectDetection | null>(null);
  const [running, setRunning] = useState(false);
  const [zone, setZone] = useState<Point[]>([]);
  const [usingCamera, setUsingCamera] = useState(false);
  const [busyOCR, setBusyOCR] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 960, height: 540 });

  useEffect(() => {
    let mounted = true;
    cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(m => { if (mounted) setModel(m); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function onResize() {
      const w = Math.min(960, Math.floor(window.innerWidth - 48));
      const h = Math.floor((w * 9) / 16);
      setDimensions({ width: w, height: h });
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ctx = useMemo(() => canvasRef.current?.getContext('2d') ?? null, [canvasRef.current]);

  const drawDetections = useCallback((detections: DetectedObject[]) => {
    if (!ctx) return;
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    // zone outline
    if (zone.length) {
      ctx.beginPath();
      ctx.moveTo(zone[0].x, zone[0].y);
      for (let i = 1; i < zone.length; i++) ctx.lineTo(zone[i].x, zone[i].y);
      ctx.closePath();
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    detections.forEach(det => {
      const [x, y, w, h] = det.bbox;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const inside = zone.length >= 3 && isPointInPolygon({ x: cx, y: cy }, zone);
      ctx.strokeStyle = inside ? '#ff5050' : '#58ff7a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y - 18, 110, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(`${det.class} ${(det.score * 100).toFixed(0)}%`, x + 4, y - 6);
      if (inside) {
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff5050';
        ctx.fill();
      }
    });
  }, [ctx, zone, dimensions]);

  const processFrame = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const { width, height } = dimensions;

    // draw current frame to canvas
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    ctx2d.drawImage(video, 0, 0, width, height);

    const detections = (await model.detect(canvas))
      .filter(d => VEHICLE_CLASSES.has(d.class));

    drawDetections(detections);

    // trigger fines for vehicles in zone
    for (const det of detections) {
      const [x, y, w, h] = det.bbox;
      const cx = x + w / 2, cy = y + h / 2;
      const inside = zone.length >= 3 && isPointInPolygon({ x: cx, y: cy }, zone);
      if (inside) {
        // capture snapshot region and OCR (bottom portion heuristic)
        if (!busyOCR) {
          setBusyOCR(true);
          try {
            const snapshot = document.createElement('canvas');
            snapshot.width = Math.max(1, Math.floor(w));
            snapshot.height = Math.max(1, Math.floor(h));
            const sctx = snapshot.getContext('2d')!;
            sctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

            const plateROI = document.createElement('canvas');
            plateROI.width = snapshot.width;
            plateROI.height = Math.max(1, Math.floor(snapshot.height * 0.4));
            const prctx = plateROI.getContext('2d')!;
            prctx.drawImage(
              snapshot,
              0, Math.floor(snapshot.height * 0.6), snapshot.width, Math.floor(snapshot.height * 0.4),
              0, 0, plateROI.width, plateROI.height
            );

            const ocr = await Tesseract.recognize(plateROI, 'eng', {
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
            } as any);
            let plate = (ocr.data.text || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
            if (!plate || plate.length < 4) plate = 'UNKNOWN';

            const id = `${Date.now()}-${Math.round(x)}-${Math.round(y)}`;
            addFine({ id, plate, createdAt: Date.now(), imageDataUrl: snapshot.toDataURL('image/jpeg', 0.8), status: 'unpaid' });
          } catch (e) {
            const id = `${Date.now()}-ERR`;
            addFine({ id, plate: 'UNKNOWN', createdAt: Date.now(), status: 'unpaid' });
          } finally {
            setTimeout(() => setBusyOCR(false), 1500); // rate limit
          }
        }
      }
    }
  }, [model, drawDetections, zone, dimensions, busyOCR]);

  useEffect(() => {
    let raf = 0;
    async function loop() {
      if (!running) return;
      await processFrame();
      raf = requestAnimationFrame(loop);
    }
    if (running) raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, processFrame]);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setUsingCamera(true);
    setRunning(true);
  }

  function stopCamera() {
    const video = videoRef.current;
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    setUsingCamera(false);
    setRunning(false);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current || !model) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const { width, height } = dimensions;
      const ctx2d = canvasRef.current!.getContext('2d')!;
      ctx2d.drawImage(img, 0, 0, width, height);
      const detections = (await model.detect(canvasRef.current!)).filter(d => VEHICLE_CLASSES.has(d.class));
      drawDetections(detections);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <div style={{ position: 'relative', width: dimensions.width, height: dimensions.height }}>
          <video ref={videoRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', inset: 0, borderRadius: 8, border: '1px solid #2a3b64', width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
          <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 8 }}>
            {!usingCamera ? (
              <button onClick={startCamera} disabled={!model} style={btnStyle}>
                {model ? 'Start Camera' : 'Loading model?'}
              </button>
            ) : (
              <button onClick={stopCamera} style={btnStyle}>Stop Camera</button>
            )}
            <label style={{ ...btnStyle, display: 'inline-block' }}>
              Upload Image
              <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
            </label>
            <button onClick={() => setRunning(r => !usingCamera ? r : !r)} disabled={!model || !usingCamera} style={btnStyle}>
              {running ? 'Pause' : 'Run'}
            </button>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 6, opacity: 0.85 }}>Draw the no-parking zone on the overlay:</div>
          <NoParkingZoneDrawer width={dimensions.width} height={dimensions.height} onChange={setZone} />
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { background: '#17223a', color: '#d9e8ff', border: '1px solid #2a3b64', borderRadius: 8, padding: '8px 12px' };

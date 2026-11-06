import React from 'react';

import { MAX_DPR, RADIUS, SPEED, particleCount } from './particleField';

type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };

const seed = (width: number, height: number, count: number): Particle[] =>
  Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * SPEED,
    vy: (Math.random() - 0.5) * SPEED,
    r: RADIUS.min + Math.random() * (RADIUS.max - RADIUS.min),
    alpha: 0.18 + Math.random() * 0.27,
  }));

/**
 * Brand particle field (motion-system §5.5). Gallery-only on purpose: it is the
 * one place a decorative loop is allowed to run. Everything is capped — particle
 * count, DPR, and the loop itself, which stops when the field scrolls away or
 * the tab is hidden. Reduced motion draws a single still frame.
 */
export const GalleryParticleField: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const color = getComputedStyle(canvas).color;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame: number | null = null;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = seed(width, height, particleCount(width, height));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        context.globalAlpha = particle.alpha;
        context.fillStyle = color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const step = () => {
      for (const particle of particles) {
        particle.x = (particle.x + particle.vx + width) % width;
        particle.y = (particle.y + particle.vy + height) % height;
      }
      draw();
      frame = visible && !document.hidden ? requestAnimationFrame(step) : null;
    };

    const start = () => {
      if (frame === null && !reduced) frame = requestAnimationFrame(step);
    };

    resize();
    if (reduced) draw();
    else start();

    const onVisibility = () => {
      if (document.hidden) return;
      start();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    observer.observe(canvas);

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="h-40 w-full text-primary" />;
};

import React, { useEffect, useRef } from 'react';
import { Category } from '../types';

interface LiveMotionCanvasProps {
  category: Category;
  width?: number;
  height?: number;
  className?: string;
  intensity?: number;
}

export const LiveMotionCanvas: React.FC<LiveMotionCanvasProps> = ({
  category,
  className = '',
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 640);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 360);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 640;
      height = canvas.height = canvas.parentElement?.clientHeight || 360;
    };

    window.addEventListener('resize', handleResize);

    // Particle Setup according to Category
    const particleCount = category === 'Space' ? 70 : category === 'Anime' ? 45 : 55;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      pulseSpeed: number;
      color: string;
      rotation?: number;
      rotSpeed?: number;
    }> = [];

    // Shooting stars for Space / Anime
    const shootingStars: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      alpha: number;
      active: boolean;
    }> = [];

    const getColors = () => {
      switch (category) {
        case 'Space':
          return ['#A855F7', '#06B6D4', '#E0E7FF', '#F43F5E'];
        case 'Anime':
          return ['#F472B6', '#FBCFE8', '#FDE047', '#E0E7FF'];
        case 'Gaming':
          return ['#00F0FF', '#FF007F', '#A855F7', '#38BDF8'];
        case 'Cars':
          return ['#FF2255', '#00E5FF', '#FACC15', '#FFFFFF'];
        case 'Nature':
          return ['#FDE047', '#FEF08A', '#34D399', '#A7F3D0'];
        default:
          return ['#A1A1AA', '#71717A', '#38BDF8'];
      }
    };

    const colors = getColors();

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX:
          category === 'Cars'
            ? -Math.random() * 3 - 2
            : category === 'Anime'
            ? Math.cos(i) * 0.8 + 0.5
            : (Math.random() - 0.5) * 0.8,
        speedY:
          category === 'Gaming'
            ? Math.random() * 4 + 3 // rain
            : category === 'Cars'
            ? (Math.random() - 0.5) * 0.5
            : category === 'Anime'
            ? Math.random() * 1.5 + 0.8 // falling petals
            : (Math.random() - 0.5) * 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // 1. Category-specific effects
      if (category === 'Space' || category === 'Anime') {
        // Spawn shooting star occasionally
        if (Math.random() < 0.015 && shootingStars.length < 3) {
          shootingStars.push({
            x: Math.random() * width * 0.7,
            y: Math.random() * height * 0.3,
            length: Math.random() * 80 + 60,
            speed: Math.random() * 12 + 10,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
            alpha: 1,
            active: true,
          });
        }

        // Draw shooting stars
        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const star = shootingStars[i];
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(
            star.x - Math.cos(star.angle) * star.length,
            star.y - Math.sin(star.angle) * star.length
          );
          ctx.stroke();
          ctx.restore();

          star.x += Math.cos(star.angle) * star.speed;
          star.y += Math.sin(star.angle) * star.speed;
          star.alpha -= 0.02;

          if (star.alpha <= 0 || star.x > width || star.y > height) {
            shootingStars.splice(i, 1);
          }
        }
      }

      if (category === 'Gaming') {
        // Neon rain streaks
        ctx.save();
        for (let i = 0; i < 25; i++) {
          const rx = (i * (width / 25) + time * 120) % width;
          const ry = (i * 47 + time * 400) % height;
          const len = 35;
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 127, 0.3)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 5, ry + len);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (category === 'Cars') {
        // Speed tunnel light streaks
        ctx.save();
        for (let i = 0; i < 12; i++) {
          const lx = (width + time * 300 * ((i % 3) + 1)) % width;
          const ly = (height * 0.6) + (i * 12) % (height * 0.35);
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(255, 34, 85, 0.5)' : 'rgba(0, 229, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - 120, ly);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Draw animated particles (petals, cosmic dust, mist)
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += Math.sin(time * 3 + p.pulseSpeed * 100) * 0.01;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(0.9, p.alpha * intensity));

        if (category === 'Anime') {
          // Fluttering cherry blossom petal
          if (p.rotation !== undefined && p.rotSpeed !== undefined) {
            p.rotation += p.rotSpeed;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 2, p.size, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Glowing orb
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.size * 3;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [category, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${className}`}
    />
  );
};

import { useEffect, useRef } from 'react';
import { editions } from '../data';
import '../circuit-plane.css';

type Waypoint = {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
};

type Phase =
  | { kind: 'hold'; point: number; duration: number }
  | { kind: 'fly'; from: number; to: number; duration: number; angle: number }
  | { kind: 'fade-out'; point: number; duration: number }
  | { kind: 'reset'; point: number; duration: number; angle: number }
  | { kind: 'fade-in'; point: number; duration: number };

const DWELL_MS = 620;
const FLIGHT_MS = 11_500;
const FADE_OUT_MS = 380;
const HIDDEN_RESET_MS = 180;
const FADE_IN_MS = 280;
const NOSE_ANGLE_DEG = 45;
const TAKEOFF_GAP_PX = 7;

function heading(from: Waypoint, to: Waypoint) {
  const radians = Math.atan2(to.pixelY - from.pixelY, to.pixelX - from.pixelX);
  return (radians * 180) / Math.PI - NOSE_ANGLE_DEG;
}

export default function CircuitPlane() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const plane = layer?.querySelector<HTMLImageElement>('.circuit-plane');
    const wrapper = layer?.closest<HTMLElement>('.map-wrapper');
    if (!layer || !plane || !wrapper) return;

    let waypoints: Waypoint[] = [];
    let phases: Phase[] = [];
    let cycleDuration = 0;
    let elapsed = 0;
    let lastFrameTime = 0;
    let frameId = 0;
    let running = false;
    let inView = false;

    const clearPosition = () => {
      layer.classList.remove('is-flying');
      plane.style.removeProperty('--plane-x');
      plane.style.removeProperty('--plane-y');
      plane.style.removeProperty('--plane-angle');
      plane.style.removeProperty('--plane-opacity');
    };

    const setPosition = (x: number, y: number, angle: number, opacity: number) => {
      plane.style.setProperty('--plane-x', `${x}%`);
      plane.style.setProperty('--plane-y', `${y}%`);
      plane.style.setProperty('--plane-angle', `${angle}deg`);
      plane.style.setProperty('--plane-opacity', `${opacity}`);
    };

    const buildRoute = () => {
      const bounds = wrapper.getBoundingClientRect();
      const buttons = Array.from(wrapper.querySelectorAll<HTMLElement>('.map-point'));
      if (bounds.width <= 0 || bounds.height <= 0 || buttons.length < editions.length) return;

      const planeHeight = plane.getBoundingClientRect().height || 48;
      const halfPlaneHeight = planeHeight / 2;
      waypoints = buttons.slice(0, editions.length).map((button) => {
        const point = button.getBoundingClientRect();
        const centerX = point.left + point.width / 2 - bounds.left;
        const centerY = Math.max(
          halfPlaneHeight + 2,
          Math.min(
            bounds.height - halfPlaneHeight - 2,
            point.top - bounds.top - halfPlaneHeight - TAKEOFF_GAP_PX,
          ),
        );
        return {
          x: (centerX / bounds.width) * 100,
          y: (centerY / bounds.height) * 100,
          pixelX: centerX,
          pixelY: centerY,
        };
      });

      const lengths = waypoints.slice(0, -1).map((point, index) => {
        const next = waypoints[index + 1];
        return Math.hypot(next.pixelX - point.pixelX, next.pixelY - point.pixelY);
      });
      const totalLength = lengths.reduce((sum, length) => sum + length, 0) || 1;
      const firstAngle = waypoints.length > 1 ? heading(waypoints[0], waypoints[1]) : 0;
      phases = [{ kind: 'hold', point: 0, duration: DWELL_MS }];

      lengths.forEach((length, index) => {
        phases.push({
          kind: 'fly',
          from: index,
          to: index + 1,
          duration: (FLIGHT_MS * length) / totalLength,
          angle: heading(waypoints[index], waypoints[index + 1]),
        });
        phases.push({ kind: 'hold', point: index + 1, duration: DWELL_MS });
      });

      phases.push({ kind: 'fade-out', point: waypoints.length - 1, duration: FADE_OUT_MS });
      phases.push({ kind: 'reset', point: 0, duration: HIDDEN_RESET_MS, angle: firstAngle });
      phases.push({ kind: 'fade-in', point: 0, duration: FADE_IN_MS });
      cycleDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
      elapsed = 0;
      lastFrameTime = 0;
    };

    const renderFrame = (time: number) => {
      if (!phases.length || !cycleDuration) return;
      let position = time % cycleDuration;
      let phase = phases[phases.length - 1];
      let phaseProgress = 1;
      for (const candidate of phases) {
        if (position < candidate.duration) {
          phase = candidate;
          phaseProgress = Math.max(0, Math.min(1, position / candidate.duration));
          break;
        }
        position -= candidate.duration;
      }

      if (phase.kind === 'fly') {
        const eased = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
        const from = waypoints[phase.from];
        const to = waypoints[phase.to];
        setPosition(from.x + (to.x - from.x) * eased, from.y + (to.y - from.y) * eased, phase.angle, 1);
      } else if (phase.kind === 'fade-out') {
        const point = waypoints[phase.point];
        const previous = waypoints[Math.max(0, phase.point - 1)];
        setPosition(point.x, point.y, heading(previous, point), 1 - phaseProgress);
      } else if (phase.kind === 'reset') {
        const point = waypoints[phase.point];
        setPosition(point.x, point.y, phase.angle, 0);
      } else if (phase.kind === 'fade-in') {
        const point = waypoints[phase.point];
        setPosition(point.x, point.y, phases.length ? heading(waypoints[0], waypoints[1]) : 0, phaseProgress);
      } else {
        const point = waypoints[phase.point];
        const angle = phase.point < waypoints.length - 1
          ? heading(point, waypoints[phase.point + 1])
          : heading(waypoints[phase.point - 1], point);
        setPosition(point.x, point.y, angle, 1);
      }
    };

    const stopFrames = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      running = false;
      lastFrameTime = 0;
    };

    const tick = (now: number) => {
      if (!running) return;
      if (lastFrameTime) elapsed += Math.min(now - lastFrameTime, 100);
      lastFrameTime = now;
      renderFrame(elapsed);
      frameId = requestAnimationFrame(tick);
    };

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPlayback = () => {
      const motionEnabled = document.documentElement.dataset.motion === 'on' && !motionPreference.matches;
      if (!motionEnabled) {
        stopFrames();
        elapsed = 0;
        clearPosition();
        return;
      }
      if (!inView || document.visibilityState === 'hidden') {
        stopFrames();
        return;
      }
      if (!running) {
        layer.classList.add('is-flying');
        running = true;
        lastFrameTime = 0;
        frameId = requestAnimationFrame(tick);
      }
    };

    buildRoute();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          const wasRunning = running;
          stopFrames();
          buildRoute();
          if (wasRunning) syncPlayback();
        })
      : null;
    resizeObserver?.observe(wrapper);
    const handleResize = () => {
      if (!resizeObserver) {
        buildRoute();
        syncPlayback();
      }
    };
    window.addEventListener('resize', handleResize);

    const intersectionObserver = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          inView = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0);
          syncPlayback();
        })
      : null;
    if (intersectionObserver) intersectionObserver.observe(wrapper);
    else inView = true;

    const motionObserver = new MutationObserver(syncPlayback);
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const handleVisibility = () => syncPlayback();
    document.addEventListener('visibilitychange', handleVisibility);
    motionPreference.addEventListener('change', syncPlayback);
    syncPlayback();

    return () => {
      stopFrames();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      motionObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionPreference.removeEventListener('change', syncPlayback);
      clearPosition();
    };
  }, []);

  return (
    <div ref={layerRef} className="circuit-plane-layer" aria-hidden="true">
      <img
        className="circuit-plane"
        src="/manus-storage/aviao_7f2d39c1.png"
        alt=""
        draggable={false}
      />
    </div>
  );
}

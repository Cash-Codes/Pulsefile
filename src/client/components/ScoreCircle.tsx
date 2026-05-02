import { useEffect, useState } from 'react';
import type { CompositeScore } from '../../shared/pulseReport';

const TICK_COUNT = 60;
const ARC_DEG = 280;          // sweep from -ARC_DEG/2 to +ARC_DEG/2 (around the bottom)
const ARC_START_DEG = -ARC_DEG / 2 - 90; // 0% sits at the bottom-left
const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const OUTER_R = 138;
const TICK_INNER = 116;
const TICK_INNER_MAJOR = 108;

function tickGeometry(i: number) {
  const isMajor = i % 6 === 0;
  const t = i / (TICK_COUNT - 1);
  const angleDeg = ARC_START_DEG + t * ARC_DEG;
  const angle = (angleDeg * Math.PI) / 180;
  const inner = isMajor ? TICK_INNER_MAJOR : TICK_INNER;
  return {
    x1: CENTER + Math.cos(angle) * inner,
    y1: CENTER + Math.sin(angle) * inner,
    x2: CENTER + Math.cos(angle) * OUTER_R,
    y2: CENTER + Math.sin(angle) * OUTER_R,
    isMajor,
  };
}

export function ScoreCircle({ score, durationMs }: { score: CompositeScore; durationMs: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, score.scoreOutOf100));
    const duration = 1100;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 5);
      setAnimated(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score.scoreOutOf100]);

  const activeIndex = (animated / 100) * (TICK_COUNT - 1);
  const formattedDuration = durationMs.toLocaleString();

  return (
    <div className="gauge">
      <svg
        className="gauge__svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label={`Composite score ${score.scoreOutOf100} out of 100, grade ${score.grade}`}
      >
        {Array.from({ length: TICK_COUNT }).map((_, i) => {
          const g = tickGeometry(i);
          const isActive = i <= activeIndex;
          const cls = [
            'gauge__tick',
            g.isMajor ? 'is-major' : '',
            isActive ? 'is-active' : '',
          ].join(' ').trim();
          return (
            <line
              key={i}
              className={cls}
              x1={g.x1}
              y1={g.y1}
              x2={g.x2}
              y2={g.y2}
            />
          );
        })}
      </svg>
      <div className="gauge__caption">
        <div className="gauge__inner">
          <span className="gauge__grade">{score.grade}</span>
          <span className="gauge__num">
            <strong>{Math.round(animated)}</strong> / 100
          </span>
        </div>
      </div>
      <p className="gauge__meta">
        Resolved in <strong>{formattedDuration} ms</strong>
      </p>
    </div>
  );
}

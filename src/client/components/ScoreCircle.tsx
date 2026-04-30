import type { CompositeScore } from '../../shared/pulseReport';

export function ScoreCircle({ score, durationMs }: { score: CompositeScore; durationMs: number }) {
  return (
    <div className="score-wrap">
      <div className="score-circle">
        <div>
          <div className="num">{score.scoreOutOf100}</div>
          <div className="grade">{score.grade}</div>
        </div>
      </div>
      <div className="score-meta">resolved in {durationMs}ms</div>
    </div>
  );
}

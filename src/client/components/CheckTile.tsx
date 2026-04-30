import type { CheckOutcome } from '../../shared/pulseReport';

interface Props {
  name: string;
  outcome: CheckOutcome<{ status: string }>;
  detail: (o: any) => string;
}

export function CheckTile({ name, outcome, detail }: Props) {
  const status = (outcome as any).status;
  return (
    <div className="tile">
      <div className="tile-head">
        <div className="tile-name">{name}</div>
        <div className={`tile-status ${status}`}>{status}</div>
      </div>
      <pre>{detail(outcome)}</pre>
    </div>
  );
}

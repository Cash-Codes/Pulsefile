import { useState } from 'react';
import type { CheckOutcome } from '../../shared/pulseReport';

interface Props {
  name: string;
  outcome: CheckOutcome<{ status: string }>;
  /** One-line summary shown after the leader dots */
  summary: (o: any) => string;
  /** Multi-line expanded detail; if omitted the row is not expandable */
  detail?: (o: any) => string;
  /** Stagger animation on initial reveal */
  index?: number;
}

const STATUS_LABEL: Record<string, string> = {
  ok:    '[ OK   ]',
  warn:  '[ WARN ]',
  fail:  '[ FAIL ]',
  error: '[ ERR  ]',
  na:    '[ N/A  ]',
};

export function CheckTile({ name, outcome, summary, detail, index = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const status = (outcome as any).status as string;
  const label = STATUS_LABEL[status] ?? '[ ?    ]';
  const summaryText = summary(outcome);
  const detailText = detail ? detail(outcome) : null;
  const canExpand = Boolean(detailText && detailText.trim().length > 0);

  const rowClass = [
    'row',
    canExpand ? 'is-clickable' : '',
    open ? 'is-open' : '',
  ].join(' ').trim();

  return (
    <>
      <div
        className={rowClass}
        style={{ animationDelay: `${120 + index * 70}ms` }}
        onClick={canExpand ? () => setOpen((v) => !v) : undefined}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        onKeyDown={canExpand ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        } : undefined}
      >
        <span className={`row__status row__status--${status}`}>{label}</span>
        <span className="row__name">{name}</span>
        <span className="row__leader" aria-hidden />
        <span className="row__data">{summaryText}</span>
        {canExpand && <span className="row__chev" aria-hidden>›</span>}
      </div>
      {open && detailText && (
        <div className="row__expanded">{detailText}</div>
      )}
    </>
  );
}

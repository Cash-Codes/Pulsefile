import { useEffect, useState, type FormEvent } from 'react';

interface Props {
  initialUrl?: string;
  onSubmit: (url: string) => void;
  disabled: boolean;
}

const SUGGESTIONS = [
  'https://cloudflare.com',
  'https://expired.badssl.com',
  'https://httpbin.org/redirect/15',
];

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function PulseInput({ initialUrl = '', onSubmit, disabled }: Props) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    onSubmit(normalized);
  }

  return (
    <div>
      <form className="console" onSubmit={handleSubmit} noValidate>
        <span className="console__prompt" aria-hidden>{'>_'}</span>
        <input
          className="console__input"
          type="text"
          inputMode="url"
          placeholder="example.com or https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
        <button className="console__submit" type="submit" disabled={disabled || !url.trim()}>
          {disabled ? (
            <span className="pulse-dots" aria-label="Pulsing">
              <span /><span /><span />
            </span>
          ) : (
            'Pulse'
          )}
        </button>
      </form>
      <div className="suggestions">
        <span className="suggestions__label">Try</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setUrl(s); onSubmit(s); }}
            disabled={disabled}
          >
            {s.replace(/^https?:\/\//, '')}
          </button>
        ))}
      </div>
    </div>
  );
}

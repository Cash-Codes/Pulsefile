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

export function PulseInput({ initialUrl = '', onSubmit, disabled }: Props) {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url) return;
    onSubmit(url);
  }

  return (
    <div>
      <form className="console" onSubmit={handleSubmit}>
        <span className="console__prompt" aria-hidden>{'>_'}</span>
        <input
          className="console__input"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
        <button className="console__submit" type="submit" disabled={disabled || !url}>
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

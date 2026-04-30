import { useState, type FormEvent } from 'react';

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url) return;
    onSubmit(url);
  }

  return (
    <div>
      <form className="input-row" onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !url}>
          {disabled ? 'Pulsing…' : 'Pulse'}
        </button>
      </form>
      <div className="suggestions">
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

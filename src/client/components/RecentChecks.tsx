interface Props {
  items: string[];
  onPick: (url: string) => void;
}

export function RecentChecks({ items, onPick }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="recents">
      <span className="recents__label">Recent</span>
      {items.map((url) => (
        <button key={url} type="button" onClick={() => onPick(url)}>
          {url.replace(/^https?:\/\//, '')}
        </button>
      ))}
    </div>
  );
}

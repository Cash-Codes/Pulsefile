interface Props {
  items: string[];
  onPick: (url: string) => void;
}

export function RecentChecks({ items, onPick }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="recents">
      <h3>Recent</h3>
      <ul>
        {items.map((url) => (
          <li key={url}>
            <button type="button" onClick={() => onPick(url)}>{url}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

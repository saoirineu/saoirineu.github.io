export type ChurchChecklistOption = {
  id: string;
  name: string;
  /** City or country, to tell apart churches registered under the same name. */
  detail?: string;
};

/** Multi-select of churches, for grants that cover several of them. */
export function ChurchChecklist({
  churches,
  selected,
  onChange
}: {
  churches: ChurchChecklistOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-2">
      {churches.map(church => (
        <label key={church.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={selected.includes(church.id)}
            onChange={event => onChange(
              event.target.checked ? [...selected, church.id] : selected.filter(id => id !== church.id)
            )}
          />
          <span>
            {church.name}
            {church.detail ? <span className="ml-1 text-xs text-slate-400">({church.detail})</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

// Owner: Samriddhi | Task: SAM-P1-4 | Priority: P1
export function BotToggle({
  includeBots = false,
  onToggle,
}: {
  includeBots?: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={includeBots}
        onChange={(event) => onToggle(event.target.checked)}
        className="size-4 accent-primary"
      />
      <span>Include bot clicks</span>
    </label>
  );
}

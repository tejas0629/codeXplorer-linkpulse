// Owner: Megha | Task: MEG-P1-4 | Priority: P1
"use client";

export interface LinkOptions {
  expiresAt: string;
  maxClicks: string;
  password: string;
  mobileUrl: string;
  campaignId: string;
  tagNames: string;
}

interface StepOptionsProps {
  options: LinkOptions;
  onChange: (options: LinkOptions) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function StepOptions({
  options,
  onChange,
  onBack,
  onSubmit,
  isSubmitting,
}: StepOptionsProps) {
  function update<K extends keyof LinkOptions>(
    key: K,
    value: LinkOptions[K]
  ) {
    onChange({ ...options, [key]: value });
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Step 2: Link Rules and Options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All settings are optional. Configure them if needed.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="expiresAt" className="text-sm font-medium">
          Expiration date and time
        </label>
        <input
          id="expiresAt"
          type="datetime-local"
          value={options.expiresAt}
          min={options.expiresAt || undefined}
          onChange={(event) => update("expiresAt", event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="maxClicks" className="text-sm font-medium">
          Maximum clicks
        </label>
        <input
          id="maxClicks"
          type="number"
          min="1"
          step="1"
          value={options.maxClicks}
          onChange={(event) => update("maxClicks", event.target.value)}
          placeholder="No limit"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="linkPassword" className="text-sm font-medium">
          Password protection
        </label>
        <input
          id="linkPassword"
          type="password"
          value={options.password}
          maxLength={72}
          onChange={(event) => update("password", event.target.value)}
          placeholder="Optional password"
          autoComplete="new-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Maximum 72 characters.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="mobileUrl" className="text-sm font-medium">
          Mobile destination URL
        </label>
        <input
          id="mobileUrl"
          type="url"
          value={options.mobileUrl}
          onChange={(event) => update("mobileUrl", event.target.value)}
          placeholder="https://m.example.com"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="campaignId" className="text-sm font-medium">
          Campaign ID
        </label>
        <input
          id="campaignId"
          type="text"
          value={options.campaignId}
          onChange={(event) => update("campaignId", event.target.value)}
          placeholder="Optional campaign ID"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Enter an existing campaign ID. Campaign selection will be added when the campaign API is available.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="tagNames" className="text-sm font-medium">
          Tags
        </label>
        <input
          id="tagNames"
          type="text"
          value={options.tagNames}
          onChange={(event) => update("tagNames", event.target.value)}
          placeholder="marketing, summer, promotion"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas. Each tag must contain 1-30 characters.
        </p>
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating link..." : "Create link"}
        </button>
      </div>
    </section>
  );
}
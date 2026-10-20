// Owner: Megha | Task: MEG-P1-4 | Priority: P1
"use client";

interface StepDestinationProps {
  destinationUrl: string;
  code: string;
  onDestinationUrlChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onContinue: () => void;
  checkStatus: "idle" | "checking" | "available" | "taken" | "invalid" | "unavailable";
  checkMessage: string;
}

export function StepDestination({
  destinationUrl,
  code,
  onDestinationUrlChange,
  onCodeChange,
  onContinue,
  checkStatus,
  checkMessage,
}: StepDestinationProps) {
  const urlIsValid = (() => {
    try {
      const url = new URL(destinationUrl);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  })();

  const codeIsValid =
    code.trim() === "" ||
    (/^[a-zA-Z0-9_-]+$/.test(code.trim()) &&
      code.trim().length >= 3 &&
      code.trim().length <= 64);

  const canContinue =
  urlIsValid &&
  codeIsValid &&
  checkStatus !== "checking" &&
  checkStatus !== "taken" &&
  checkStatus !== "invalid";

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Step 1: Destination and Alias</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the webpage you want to share and optionally choose a custom alias.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="destinationUrl" className="text-sm font-medium">
          Destination URL *
        </label>
        <input
          id="destinationUrl"
          type="url"
          value={destinationUrl}
          onChange={(event) => onDestinationUrlChange(event.target.value)}
          placeholder="https://example.com/my-page"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {destinationUrl && !urlIsValid && (
          <p className="text-sm text-destructive">
            Enter a valid URL starting with http:// or https://.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="linkCode" className="text-sm font-medium">
          Custom alias (optional)
        </label>
        <input
          id="linkCode"
          type="text"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="my-promo"
          maxLength={64}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Use 3-64 letters, numbers, hyphens, or underscores. Leave blank for an automatic code.
        </p>
        {!codeIsValid && (
          <p className="text-sm text-destructive">
            The alias must be 3-64 characters and contain only letters, numbers, hyphens, or underscores.
          </p>
        )}
        {checkStatus === "checking" && (
          <p className="text-sm text-muted-foreground">Checking alias availability...</p>
        )}
        {checkStatus === "available" && (
          <p className="text-sm text-green-600">{checkMessage}</p>
        )}
        {checkStatus === "taken" && (
          <p className="text-sm text-destructive">{checkMessage}</p>
        )}
        {checkStatus === "invalid" && (
          <p className="text-sm text-destructive">{checkMessage}</p>
        )}
        {checkStatus === "unavailable" && (
          <p className="text-sm text-amber-600">{checkMessage}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </section>
  );
}

"use client";

// Owner: Megha | Task: MEG-P1-4 | Priority: P1

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import {
  StepOptions,
  type LinkOptions,
} from "@/components/wizard/step-options";
import { StepDestination } from "@/components/wizard/step-destination";
import { SuccessScreen } from "@/components/wizard/success-screen";

type CheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "unavailable";

interface LinkCheckResult {
  aliasAvailable: boolean;
  urlValid: boolean;
  domainBlocked: boolean;
  riskScore: string;
  warnings: string[];
}

interface CreatedLink {
  id?: string;
  code?: string;
  shortUrl?: string;
}

interface CreateLinkPayload {
  destinationUrl: string;
  code?: string;
  campaignId?: string;
  expiresAt?: string;
  maxClicks?: number;
  password?: string;
  mobileUrl?: string;
  tagNames?: string[];
}

const initialOptions: LinkOptions = {
  expiresAt: "",
  maxClicks: "",
  password: "",
  mobileUrl: "",
  campaignId: "",
  tagNames: "",
};

const aliasPattern = /^[a-zA-Z0-9_-]+$/;

export default function NewLinkPage() {
  const [step, setStep] = useState(1);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [code, setCode] = useState("");
  const [options, setOptions] = useState<LinkOptions>(initialOptions);

  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [checkMessage, setCheckMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [shortUrl, setShortUrl] = useState("");

  useEffect(() => {
    const trimmedCode = code.trim();
    const trimmedUrl = destinationUrl.trim();

    if (
      !trimmedUrl ||
      !trimmedCode ||
      trimmedCode.length < 3 ||
      trimmedCode.length > 64 ||
      !aliasPattern.test(trimmedCode)
    ) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) {
        return;
      }

      setCheckStatus("checking");
      setCheckMessage("");

      try {
        const result = await apiClient<LinkCheckResult>(
          "/api/links/check",
          {
            params: {
              alias: trimmedCode,
              url: trimmedUrl,
            },
          }
        );

        if (cancelled) {
          return;
        }

        if (!result.urlValid || result.domainBlocked) {
          setCheckStatus("invalid");
          setCheckMessage(
            result.warnings?.join(" ") ||
              "This destination URL cannot be used."
          );
        } else if (!result.aliasAvailable) {
          setCheckStatus("taken");
          setCheckMessage("This alias is already in use.");
        } else {
          setCheckStatus("available");
          setCheckMessage(
            result.warnings?.length
              ? result.warnings.join(" ")
              : "The alias is available."
          );
        }
      } catch {
        if (cancelled) {
          return;
        }

        setCheckStatus("unavailable");
        setCheckMessage(
          "Live checking is currently unavailable. The server will validate the link when you create it."
        );
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [destinationUrl, code]);

  function handleDestinationUrlChange(value: string) {
    setDestinationUrl(value);
    setCheckStatus("idle");
    setCheckMessage("");
    setErrorMessage("");
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setCheckStatus("idle");
    setCheckMessage("");
    setErrorMessage("");
  }

  function continueToOptions() {
    setErrorMessage("");
    setStep(2);
  }

  async function createLink() {
    if (isSubmitting) {
      return;
    }

    setErrorMessage("");

    const trimmedUrl = destinationUrl.trim();
    const trimmedCode = code.trim();

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmedUrl);

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        setErrorMessage(
          "The destination must start with http:// or https://."
        );
        setStep(1);
        return;
      }
    } catch {
      setErrorMessage("Enter a valid destination URL.");
      setStep(1);
      return;
    }

    if (
      trimmedCode &&
      (trimmedCode.length < 3 ||
        trimmedCode.length > 64 ||
        !aliasPattern.test(trimmedCode))
    ) {
      setErrorMessage(
        "Use 3 to 64 characters for the alias. Letters, numbers, hyphens, and underscores are allowed."
      );
      setStep(1);
      return;
    }

    let expiresAt: string | undefined;

    if (options.expiresAt) {
      const expiry = new Date(options.expiresAt);

      if (
        Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now()
      ) {
        setErrorMessage(
          "Choose an expiration date and time in the future."
        );
        return;
      }

      expiresAt = expiry.toISOString();
    }

    let maxClicks: number | undefined;

    if (options.maxClicks.trim()) {
      maxClicks = Number(options.maxClicks);

      if (!Number.isInteger(maxClicks) || maxClicks <= 0) {
        setErrorMessage(
          "Maximum clicks must be a positive whole number."
        );
        return;
      }
    }

    if (options.password.length > 72) {
      setErrorMessage("The password cannot exceed 72 characters.");
      return;
    }

    let mobileUrl: string | undefined;

    if (options.mobileUrl.trim()) {
      try {
        const parsedMobileUrl = new URL(options.mobileUrl.trim());

        if (
          parsedMobileUrl.protocol !== "http:" &&
          parsedMobileUrl.protocol !== "https:"
        ) {
          setErrorMessage(
            "The mobile destination must use http:// or https://."
          );
          return;
        }

        mobileUrl = parsedMobileUrl.toString();
      } catch {
        setErrorMessage("Enter a valid mobile destination URL.");
        return;
      }
    }

    const campaignId = options.campaignId.trim();

    const tagNames = options.tagNames
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tagNames.some((tag) => tag.length > 30)) {
      setErrorMessage("Each tag must be 30 characters or fewer.");
      return;
    }

    const payload: CreateLinkPayload = {
      destinationUrl: parsedUrl.toString(),
      ...(trimmedCode ? { code: trimmedCode } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      ...(maxClicks !== undefined ? { maxClicks } : {}),
      ...(options.password ? { password: options.password } : {}),
      ...(mobileUrl ? { mobileUrl } : {}),
      ...(tagNames.length > 0 ? { tagNames } : {}),
    };

    setIsSubmitting(true);

    try {
      const created = await apiClient<CreatedLink>("/api/links", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdCode = created.code || trimmedCode;

      if (created.shortUrl) {
        setShortUrl(created.shortUrl);
      } else if (createdCode) {
        setShortUrl(
          `${window.location.origin}/${encodeURIComponent(createdCode)}`
        );
      } else {
        setErrorMessage(
          "The server did not return a short URL or link code. Check your links list before trying again."
        );
        return;
      }

      setStep(3);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create the link. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function createAnother() {
    setStep(1);
    setDestinationUrl("");
    setCode("");
    setOptions({ ...initialOptions });
    setCheckStatus("idle");
    setCheckMessage("");
    setErrorMessage("");
    setShortUrl("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Link</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and configure a short link in a few steps.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[1, 2, 3].map((number) => (
          <div
            key={number}
            aria-current={step === number ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${
              step === number
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {number === 1
              ? "1. Destination"
              : number === 2
                ? "2. Options"
                : "3. Complete"}
          </div>
        ))}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div className="rounded-lg border border-border p-5">
        {step === 1 && (
          <StepDestination
            destinationUrl={destinationUrl}
            code={code}
            onDestinationUrlChange={handleDestinationUrlChange}
            onCodeChange={handleCodeChange}
            onContinue={continueToOptions}
            checkStatus={checkStatus}
            checkMessage={checkMessage}
          />
        )}

        {step === 2 && (
          <StepOptions
            options={options}
            onChange={setOptions}
            onBack={() => {
              setErrorMessage("");
              setStep(1);
            }}
            onSubmit={createLink}
            isSubmitting={isSubmitting}
          />
        )}

        {step === 3 && (
          <SuccessScreen
            shortUrl={shortUrl}
            onCreateAnother={createAnother}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChallengeQR } from "@/components/ui/challenge-qr";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import {
  type Address,
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  http,
  parseEther,
} from "viem";

import { useAuth } from "@/lib/auth";
import { useApiClient } from "@/lib/api-client";
import { API_BASE_URL, CHAIN_ID, CONTRACT_ADDRESS, MONAD_TESTNET } from "@/lib/monad";

type OnboardResponse = {
  ok: boolean;
  profile: {
    brandAddress?: string;
    companyName: string;
    tagline: string;
    logoPath: string;
    brandFact?: string;
    brandColor?: string;
    category: string;
    website?: string;
  };
  contractDraft: {
    metadataHash: string;
    duration: number;
    winnerCount: number;
    prizePool: string;
  };
};

type FormState = {
  companyName: string;
  tagline: string;
  category: string;
  website: string;
  brandColor: string;
  brandFact: string;
  prizePool: string;
  duration: string;
  winnerCount: string;
};

type CreationStep = "idle" | "uploading" | "saving" | "creating" | "registering" | "done" | "error";

const MONARCHADE_ABI = [
  {
    type: "function",
    name: "createChallenge",
    stateMutability: "payable",
    inputs: [
      { name: "metadataHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "winnerCount", type: "uint256" },
    ],
    outputs: [{ name: "challengeId", type: "uint256" }],
  },
  {
    type: "event",
    name: "ChallengeCreated",
    inputs: [
      { indexed: true, name: "challengeId", type: "uint256" },
      { indexed: true, name: "brand", type: "address" },
      { indexed: false, name: "metadataHash", type: "bytes32" },
      { indexed: false, name: "prizePool", type: "uint256" },
      { indexed: false, name: "deadline", type: "uint256" },
      { indexed: false, name: "winnerCount", type: "uint256" },
    ],
    anonymous: false,
  },
] as const;

const stepDefinitions = [
  { id: "brand", eyebrow: "Step 1", title: "Brand identity", description: "Define the brand players will study before the recall rounds begin." },
  { id: "creative", eyebrow: "Step 2", title: "Creative memory cues", description: "Upload the logo and optional fact prompt that powers the intro and knowledge test." },
  { id: "campaign", eyebrow: "Step 3", title: "Campaign economics", description: "Set prize pool, timeline, and winner split defaults before funding the challenge." },
  { id: "review", eyebrow: "Step 4", title: "Review and create", description: "Review details and create the challenge on-chain in one step." },
] as const;

const inputClassName =
  "w-full rounded-2xl border border-app/45 bg-app-surface px-4 py-3 text-base text-app outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-lg";
const labelClassName = "text-sm font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-base";
const categoryOptions = ["Gaming", "Consumer", "Food", "Fintech", "Entertainment", "Lifestyle", "Sports", "Education"];

const initialFormState: FormState = {
  companyName: "",
  tagline: "",
  category: "Gaming",
  website: "",
  brandColor: "",
  brandFact: "",
  prizePool: "1",
  duration: "3600",
  winnerCount: "3",
};

const formatDuration = (duration: string) => {
  const numeric = Number(duration);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Not set";
  const hours = Math.floor(numeric / 3600);
  const minutes = Math.floor((numeric % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const isValidUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const CREATION_STEPS: { key: CreationStep; label: string }[] = [
  { key: "uploading", label: "Uploading logo to IPFS..." },
  { key: "saving", label: "Saving brand profile..." },
  { key: "creating", label: "Creating challenge on-chain..." },
  { key: "registering", label: "Registering metadata..." },
  { key: "done", label: "Challenge created!" },
];

export function BrandOnboardingFlow() {
  const router = useRouter();
  const { user, getAuthToken } = useAuth();
  const api = useApiClient();
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);

  // Creation state
  const [creationStep, setCreationStep] = useState<CreationStep>("idle");
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [createTxHash, setCreateTxHash] = useState<string | null>(null);

  const progress = ((currentStep + 1) / stepDefinitions.length) * 100;
  const isCreating = creationStep !== "idle" && creationStep !== "done" && creationStep !== "error";

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const reviewItems = useMemo(
    () => [
      { label: "Brand", value: form.companyName || "Not set" },
      { label: "Tagline", value: form.tagline || "Not set" },
      { label: "Category", value: form.category || "Not set" },
      { label: "Prize pool", value: `${form.prizePool || "0"} MON` },
      { label: "Duration", value: formatDuration(form.duration) },
      { label: "Winners", value: form.winnerCount || "0" },
    ],
    [form],
  );

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const getAuthTokenWithRetry = async (attempts = 4, delayMs = 350) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const token = await getAuthToken();
      if (token) return token;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return null;
  };

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (form.companyName.trim().length < 2) return "Enter a brand or company name.";
      if (form.tagline.trim().length < 2) return "Enter the tagline players should remember.";
      if (form.category.trim().length < 2) return "Choose a brand category.";
      if (!isValidUrl(form.website)) return "Website must be a valid URL.";
    }

    if (stepIndex === 1) {
      if (!logoFile) return "Upload a logo before continuing.";
      if (logoFile.size > 2 * 1024 * 1024) return "Logo file is too large. Max size is 2MB.";
      if (!logoFile.type.startsWith("image/")) return "Logo file must be an image.";
      if (form.brandFact.trim().length > 160) return "Brand fact must stay under 160 characters.";
    }

    if (stepIndex === 2) {
      const prizePool = Number(form.prizePool);
      const duration = Number(form.duration);
      const winnerCount = Number(form.winnerCount);
      if (!Number.isFinite(prizePool) || prizePool <= 0) return "Prize pool must be greater than 0 MON.";
      if (!Number.isInteger(duration) || duration < 30) return "Duration must be at least 30 seconds.";
      if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 10) return "Winner count must be between 1 and 10.";
    }

    return null;
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setCurrentStep((step) => Math.min(step + 1, stepDefinitions.length - 1));
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setCreatedChallengeId(null);
    setCreateTxHash(null);
    setCreationStep("idle");
    setLogoPreview((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  // ---------------------------------------------------------------------------
  // Single "Create Challenge" — combines upload + profile + on-chain + register
  // ---------------------------------------------------------------------------
  const handleCreateChallenge = async () => {
    const error = validateStep(0) || validateStep(1) || validateStep(2);
    if (error) {
      setStepError(error);
      return;
    }
    if (!logoFile) {
      setStepError("Upload a logo before creating the challenge.");
      return;
    }

    try {
      setStepError(null);
      setCreatedChallengeId(null);
      setCreateTxHash(null);

      // ---- Step 1: Upload logo ----
      setCreationStep("uploading");
      const token = await getAuthTokenWithRetry();
      if (!token) throw new Error("No auth token available.");

      const uploadFormData = new FormData();
      uploadFormData.append("file", logoFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: uploadFormData,
      });

      const uploadPayload = (await uploadResponse.json().catch(() => null)) as {
        logoPath?: string;
        error?: string | { message?: string };
      } | null;

      if (!uploadResponse.ok || !uploadPayload?.logoPath) {
        const msg = typeof uploadPayload?.error === "string"
          ? uploadPayload.error
          : uploadPayload?.error?.message || "Failed to upload logo";
        throw new Error(msg);
      }

      // ---- Step 2: Save brand profile + get contractDraft ----
      setCreationStep("saving");
      const profileResult = await api.post<OnboardResponse>(
        "/brand/profile",
        {
          companyName: form.companyName.trim(),
          tagline: form.tagline.trim(),
          logoPath: uploadPayload.logoPath,
          brandFact: form.brandFact.trim(),
          brandColor: form.brandColor.trim(),
          category: form.category.trim(),
          website: form.website.trim(),
          brandAddress: user?.walletAddress,
          challengeDefaults: {
            prizePool: form.prizePool.trim(),
            duration: Number(form.duration),
            winnerCount: Number(form.winnerCount),
          },
        },
      );

      // ---- Step 3: Create challenge on-chain ----
      setCreationStep("creating");
      const contractAddress = CONTRACT_ADDRESS as Address | undefined;
      if (!contractAddress) throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS.");

      const publicClient = createPublicClient({
        chain: MONAD_TESTNET,
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
      });

      const chainSmartWalletClient = smartWalletClient ?? (await getClientForChain({ id: CHAIN_ID }));
      if (!chainSmartWalletClient) throw new Error("Smart wallet not ready. Please reconnect.");

      const { contractDraft, profile } = profileResult;

      const createHash = await chainSmartWalletClient.sendTransaction({
        to: contractAddress,
        data: encodeFunctionData({
          abi: MONARCHADE_ABI,
          functionName: "createChallenge",
          args: [
            contractDraft.metadataHash as `0x${string}`,
            BigInt(contractDraft.duration),
            BigInt(contractDraft.winnerCount),
          ],
        }),
        value: parseEther(contractDraft.prizePool),
      });
      setCreateTxHash(createHash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

      let challengeId: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: MONARCHADE_ABI,
            data: log.data,
            topics: log.topics,
            eventName: "ChallengeCreated",
          });
          if (decoded.eventName === "ChallengeCreated") {
            challengeId = decoded.args.challengeId;
            break;
          }
        } catch {
          // ignore non-matching logs
        }
      }

      if (challengeId === null) throw new Error("Challenge created but ID could not be decoded.");

      // ---- Step 4: Register metadata in backend ----
      setCreationStep("registering");
      const createdId = Number(challengeId);
      const brandAddress = (profile.brandAddress ?? user?.walletAddress ?? "").trim();
      if (!brandAddress) throw new Error("Brand wallet address is missing.");

      const regToken = await getAuthTokenWithRetry();
      if (!regToken) throw new Error("No auth token for registration.");

      const registerResponse = await fetch(`${API_BASE_URL}/challenge/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${regToken}`,
        },
        body: JSON.stringify({
          challengeId: createdId,
          name: profile.companyName,
          logoPath: profile.logoPath,
          tagline: profile.tagline,
          brandFact: profile.brandFact ?? "",
          brandColor: profile.brandColor ?? "",
          category: profile.category,
          brandAddress,
          prizePool: contractDraft.prizePool,
          duration: contractDraft.duration,
          metadataHash: contractDraft.metadataHash,
          winnerCount: contractDraft.winnerCount,
        }),
      });

      if (!registerResponse.ok) {
        const regPayload = (await registerResponse.json().catch(() => null)) as
          | { error?: string | { message?: string } }
          | null;
        const msg = typeof regPayload?.error === "string"
          ? regPayload.error
          : regPayload?.error?.message || "Failed to register metadata.";
        throw new Error(msg);
      }

      // ---- Done ----
      setCreatedChallengeId(String(createdId));
      setCreationStep("done");
    } catch (err) {
      setStepError(err instanceof Error ? err.message : "Failed to create challenge.");
      setCreationStep("error");
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setForm(initialFormState);
    setLogoFile(null);
    setCreatedChallengeId(null);
    setCreateTxHash(null);
    setCreationStep("idle");
    setStepError(null);
    setLogoPreview((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
  };

  const activeStep = stepDefinitions[currentStep];

  return (
    <div className="space-y-6">
      {/* Header + Progress */}
      <section className="rounded-[2rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-app-soft/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-sm">
              Brand onboarding
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-app sm:text-4xl xl:text-5xl">
              Build a premium challenge from the brand side out.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-app-muted sm:text-lg xl:text-xl">
              Define your brand, upload creative assets, set prize economics, and launch on-chain in one step.
            </p>
          </div>

          <div className="w-full xl:max-w-sm">
            <div className="rounded-[1.5rem] bg-app-soft/70 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Progress</p>
                  <p className="mt-1 text-lg font-semibold text-app sm:text-xl">{currentStep + 1} of {stepDefinitions.length}</p>
                </div>
                <p className="text-sm font-semibold text-app-muted">{Math.round(progress)}%</p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-app">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Step tabs */}
        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {stepDefinitions.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => { if (!isCreating && !createdChallengeId) setCurrentStep(index); }}
              disabled={isCreating || Boolean(createdChallengeId)}
              className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                index === currentStep
                  ? "border-primary/30 bg-app-soft shadow-app"
                  : "border-app/35 bg-app-surface hover:bg-app-soft/60"
              } disabled:cursor-default disabled:opacity-60`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index <= currentStep ? "bg-primary text-white" : "bg-app-soft text-app-muted"
                  }`}
                  style={index <= currentStep ? { color: "var(--color-white)" } : undefined}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">{step.eyebrow}</p>
                  <p className="mt-1 text-base font-semibold text-app sm:text-lg">{step.title}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Live summary */}
        <div className="mt-5 rounded-[1.5rem] border border-app/35 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Live summary</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {reviewItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-app-soft/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-app sm:text-base">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step Content */}
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">{activeStep.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-app sm:text-4xl">{activeStep.title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-app-muted sm:text-lg">{activeStep.description}</p>

          {/* Step 1: Brand Identity */}
          {currentStep === 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClassName}>Company name</label>
                <input className={inputClassName} value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder="Nova Beverages" />
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Category</label>
                <select className={inputClassName} value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                  {categoryOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={labelClassName}>Tagline players should recall</label>
                <input className={inputClassName} value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Fuel focus. Win faster." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={labelClassName}>Website <span className="text-app-muted">(optional)</span></label>
                <input className={inputClassName} value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com" />
                {form.website.trim() && !isValidUrl(form.website) ? (
                  <p className="text-xs text-red-500">Enter a valid URL starting with https://</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Step 2: Creative */}
          {currentStep === 1 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-5">
                <div className="rounded-[1.6rem] border-2 border-dashed border-app/30 bg-app-soft/30 p-5 transition-colors hover:border-primary/40">
                  <label className={labelClassName}>Brand logo</label>
                  <label className="mt-3 flex cursor-pointer flex-col items-center gap-3 rounded-xl bg-app-surface p-6 transition hover:bg-app">
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Selected brand logo preview" width={160} height={160} unoptimized className="h-28 w-28 rounded-2xl object-cover shadow-app" />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-app-soft text-app-muted">
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-primary">{logoPreview ? "Change logo" : "Upload logo"}</span>
                  </label>
                  <p className="mt-2 text-center text-xs text-app-muted">PNG, JPG, SVG, or WebP. Max 2MB.</p>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>Brand color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.brandColor || "#853953"}
                      onChange={(e) => updateField("brandColor", e.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-app/45 bg-app-surface p-1"
                    />
                    <input
                      className={inputClassName}
                      value={form.brandColor}
                      onChange={(e) => updateField("brandColor", e.target.value)}
                      placeholder="#853953"
                    />
                  </div>
                  <p className="text-xs text-app-muted">Used in the brand color matching round.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className={labelClassName}>Brand fact <span className="text-app-muted">(optional)</span></label>
                  <textarea value={form.brandFact} onChange={(e) => updateField("brandFact", e.target.value)} placeholder="Founded in Lagos in 2019 and known for bold citrus blends." rows={4} className={inputClassName} />
                  <p className="text-xs text-app-muted">Powers the brand fact round. Without it, players get a logo identification round instead.</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 3: Economics */}
          {currentStep === 2 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <label className={labelClassName}>Prize pool (MON)</label>
                <input className={inputClassName} type="number" min="0.001" step="0.1" value={form.prizePool} onChange={(e) => updateField("prizePool", e.target.value)} />
                <p className="text-xs text-app-muted">5% platform fee is deducted on-chain at creation.</p>
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Challenge duration</label>
                <select className={inputClassName} value={form.duration} onChange={(e) => updateField("duration", e.target.value)}>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                  <option value="7200">2 hours</option>
                  <option value="14400">4 hours</option>
                  <option value="43200">12 hours</option>
                  <option value="86400">1 day</option>
                  <option value="259200">3 days</option>
                  <option value="604800">7 days</option>
                </select>
                <p className="text-xs text-app-muted">How long players can join after you start the challenge.</p>
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Winner count</label>
                <select className={inputClassName} value={form.winnerCount} onChange={(e) => updateField("winnerCount", e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={String(n)}>
                      {n} winner{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-app-muted">Top scorers who split the prize pool.</p>
              </div>
              <div className="rounded-[1.6rem] bg-app-soft/70 p-5 md:col-span-3">
                <p className="text-lg font-semibold text-app">Economics preview</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-app-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Prize</p>
                    <p className="mt-2 text-xl font-bold text-app">{form.prizePool || "0"} MON</p>
                  </div>
                  <div className="rounded-2xl bg-app-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Window</p>
                    <p className="mt-2 text-xl font-bold text-app">{formatDuration(form.duration)}</p>
                  </div>
                  <div className="rounded-2xl bg-app-surface p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Winners</p>
                    <p className="mt-2 text-xl font-bold text-app">{form.winnerCount || "0"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 4: Review + Create */}
          {currentStep === 3 ? (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {reviewItems.map((item) => (
                  <div key={item.label} className="rounded-[1.4rem] bg-app-soft/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-app">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.6rem] border border-app/45 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Wallet</p>
                <p className="mt-2 text-lg font-semibold text-app">{user?.walletAddress || "Wallet unavailable"}</p>
                <p className="mt-2 text-sm text-app-muted">
                  This deposits the prize pool into the challenge contract. You can start the challenge from the dashboard when ready.
                </p>
              </div>

              {/* Creation progress */}
              {isCreating || creationStep === "done" ? (
                <div className={`rounded-[1.6rem] border p-5 ${creationStep === "done" ? "border-emerald-500/30 bg-emerald-500/10" : "border-app/45 bg-app-soft/40"}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">
                    {creationStep === "done" ? "Challenge created" : "Creating challenge..."}
                  </p>
                  <div className="mt-4 space-y-2">
                    {CREATION_STEPS.map((step) => {
                      const stepOrder = CREATION_STEPS.findIndex((s) => s.key === step.key);
                      const currentOrder = CREATION_STEPS.findIndex((s) => s.key === creationStep);
                      const isDone = stepOrder < currentOrder || creationStep === "done";
                      const isActive = step.key === creationStep && creationStep !== "done";
                      const isPending = stepOrder > currentOrder && creationStep !== "done";

                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-white animate-pulse" : "bg-app-soft text-app-muted"
                          }`} style={isDone || isActive ? { color: "var(--color-white)" } : undefined}>
                            {isDone ? "\u2713" : isActive ? "\u2022" : "\u2022"}
                          </span>
                          <span className={`text-sm ${isDone ? "text-app" : isActive ? "font-semibold text-app" : "text-app-muted"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {createTxHash ? (
                    <div className="mt-4 rounded-2xl bg-app-surface/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Transaction</p>
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${createTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-xs text-primary underline hover:brightness-110"
                      >
                        {createTxHash}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Success state */}
              {creationStep === "done" && createdChallengeId ? (
                <div className="rounded-[1.8rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-app">
                        Challenge #{createdChallengeId} is ready
                      </h3>
                      <p className="mt-2 text-sm text-app-muted">
                        Your challenge is pending. Go to the dashboard and click &ldquo;Start Campaign&rdquo; when you want it to go live.
                      </p>
                    </div>
                    <ChallengeQR challengeId={createdChallengeId} size={120} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/brand/dashboard?refresh=${createdChallengeId}`}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:brightness-110"
                      style={{ color: "var(--color-white)" }}
                    >
                      Go to Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-6 py-3 text-base font-semibold text-app transition hover:bg-app"
                    >
                      Create another
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Create button (only when not creating and not done) */}
              {creationStep === "idle" || creationStep === "error" ? (
                <button
                  type="button"
                  onClick={() => void handleCreateChallenge()}
                  disabled={isCreating}
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-primary px-8 py-3 text-lg font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: "var(--color-white)" }}
                >
                  Create Challenge
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Error display */}
          {stepError ? (
            <div className="mt-5 rounded-[1.4rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
              {stepError}
            </div>
          ) : null}

          {/* Step navigation (hide when creating or done) */}
          {!createdChallengeId && !isCreating ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-app/35 pt-5">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-app-soft px-5 py-3 text-base font-semibold text-app transition hover:bg-app disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {currentStep < stepDefinitions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition hover:brightness-110"
                  style={{ color: "var(--color-white)" }}
                >
                  Continue
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
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

const START_CHALLENGE_ABI = [
  {
    type: "function",
    name: "startChallenge",
    stateMutability: "nonpayable",
    inputs: [{ name: "challengeId", type: "uint256" }],
    outputs: [],
  },
] as const;

const stepDefinitions = [
  { id: "brand", eyebrow: "Step 1", title: "Brand identity", description: "Define the brand players will study before the recall rounds begin." },
  { id: "creative", eyebrow: "Step 2", title: "Creative memory cues", description: "Upload the logo and optional fact prompt that powers the intro and knowledge test." },
  { id: "campaign", eyebrow: "Step 3", title: "Campaign economics", description: "Set prize pool, timeline, and winner split defaults before funding the challenge." },
  { id: "review", eyebrow: "Step 4", title: "Review and prepare", description: "Validate the challenge packet, save the profile, and prepare the on-chain draft." },
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

export function BrandOnboardingFlow() {
  const { user, getAuthToken } = useAuth();
  const api = useApiClient();
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCreatingOnchain, setIsCreatingOnchain] = useState(false);
  const [preparedResult, setPreparedResult] = useState<OnboardResponse | null>(null);
  const [createTxHash, setCreateTxHash] = useState<string | null>(null);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [startTxHash, setStartTxHash] = useState<string | null>(null);
  const [shareLinkCopyState, setShareLinkCopyState] = useState<"idle" | "copied">("idle");

  const progress = ((currentStep + 1) / stepDefinitions.length) * 100;

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
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

  const challengeShareLink =
    createdChallengeId && preparedResult?.contractDraft.metadataHash
      ? (typeof window === "undefined"
          ? `/challenge/${preparedResult.contractDraft.metadataHash}`
          : `${window.location.origin}/challenge/${preparedResult.contractDraft.metadataHash}`)
      : "";

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
    setPreparedResult(null);
    setCreatedChallengeId(null);
    setCreateTxHash(null);
    setLogoPreview((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handlePrepareProfile = async () => {
    const error = validateStep(0) || validateStep(1) || validateStep(2);
    if (error) {
      setStepError(error);
      return;
    }

    if (!logoFile) {
      setStepError("Upload a logo before preparing the challenge.");
      return;
    }

    try {
      setStepError(null);
      setIsSavingProfile(true);
      setPreparedResult(null);
      setCreatedChallengeId(null);
      setCreateTxHash(null);

      const token = await getAuthTokenWithRetry();
      if (!token) throw new Error("No auth token available.");

      const uploadFormData = new FormData();
      uploadFormData.append("file", logoFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "x-kyc-verified": "true",
        },
        body: uploadFormData,
      });

      const uploadPayload = (await uploadResponse.json().catch(() => null)) as {
        logoPath?: string;
        error?: string | { message?: string };
      } | null;

      if (!uploadResponse.ok || !uploadPayload?.logoPath) {
        const uploadMessage =
          typeof uploadPayload?.error === "string"
            ? uploadPayload.error
            : uploadPayload?.error?.message || "Failed to upload logo image";
        throw new Error(uploadMessage);
      }

      const result = await api.post<OnboardResponse>(
        "/brand/profile",
        {
          companyName: form.companyName.trim(),
          tagline: form.tagline.trim(),
          logoPath: uploadPayload.logoPath,
          brandFact: form.brandFact.trim(),
          brandColor: form.brandColor.trim(),
          category: form.category.trim(),
          website: form.website.trim(),
          challengeDefaults: {
            prizePool: form.prizePool.trim(),
            duration: Number(form.duration),
            winnerCount: Number(form.winnerCount),
          },
        },
        { headers: { "x-kyc-verified": "true" } },
      );

      setPreparedResult(result);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Failed to prepare brand profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateOnchain = async () => {
    if (!preparedResult) {
      setStepError("Prepare the challenge first.");
      return;
    }

    try {
      setStepError(null);
      setIsCreatingOnchain(true);
      setCreateTxHash(null);
      setCreatedChallengeId(null);

      const contractAddress = CONTRACT_ADDRESS as Address | undefined;
      if (!contractAddress) {
        throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in frontend environment.");
      }

      const publicClient = createPublicClient({
        chain: MONAD_TESTNET,
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
      });

      const chainSmartWalletClient = smartWalletClient ?? (await getClientForChain({ id: CHAIN_ID }));
      if (!chainSmartWalletClient) {
        throw new Error("Smart wallet is not ready yet. Please reconnect your Privy wallet and retry.");
      }

      const createHash = await chainSmartWalletClient.sendTransaction({
        to: contractAddress,
        data: encodeFunctionData({
          abi: MONARCHADE_ABI,
          functionName: "createChallenge",
          args: [
            preparedResult.contractDraft.metadataHash as `0x${string}`,
            BigInt(preparedResult.contractDraft.duration),
            BigInt(preparedResult.contractDraft.winnerCount),
          ],
        }),
        value: parseEther(preparedResult.contractDraft.prizePool),
      });
      setCreateTxHash(createHash);

      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
      let challengeId: bigint | null = null;

      for (const log of createReceipt.logs) {
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

      if (challengeId === null) {
        throw new Error("Challenge creation succeeded, but challenge id could not be decoded.");
      }

      const createdId = Number(challengeId);
      const brandAddress = (preparedResult.profile.brandAddress ?? user?.walletAddress ?? "").trim();
      if (!brandAddress) {
        throw new Error("Brand wallet address is missing. Please reconnect your wallet and try again.");
      }

      const token = await getAuthTokenWithRetry();
      if (!token) throw new Error("No auth token available. Please wait a moment and retry.");

      const registerResponse = await fetch(`${API_BASE_URL}/challenge/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "x-kyc-verified": "true",
        },
        body: JSON.stringify({
          challengeId: createdId,
          name: preparedResult.profile.companyName,
          logoPath: preparedResult.profile.logoPath,
          tagline: preparedResult.profile.tagline,
          brandFact: preparedResult.profile.brandFact ?? "",
          brandColor: preparedResult.profile.brandColor ?? "",
          category: preparedResult.profile.category,
          brandAddress,
          prizePool: preparedResult.contractDraft.prizePool,
          duration: preparedResult.contractDraft.duration,
          metadataHash: preparedResult.contractDraft.metadataHash,
          winnerCount: preparedResult.contractDraft.winnerCount,
        }),
      });

      const registerPayload = (await registerResponse.json().catch(() => null)) as
        | { error?: string | { message?: string } }
        | null;

      if (!registerResponse.ok) {
        const registerMessage =
          typeof registerPayload?.error === "string"
            ? registerPayload.error
            : registerPayload?.error?.message || "Failed to register challenge metadata.";
        throw new Error(registerMessage);
      }

      setCreatedChallengeId(String(createdId));
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Failed to create challenge on-chain.");
    } finally {
      setIsCreatingOnchain(false);
    }
  };

  const handleStartCreatedChallenge = async () => {
    if (!createdChallengeId) {
      setStepError("Create the challenge first before starting it.");
      return;
    }

    try {
      setStepError(null);
      setIsStartingChallenge(true);
      setStartTxHash(null);

      const contractAddress = CONTRACT_ADDRESS as Address | undefined;
      if (!contractAddress) {
        throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in frontend environment.");
      }

      const publicClient = createPublicClient({
        chain: MONAD_TESTNET,
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
      });

      const chainSmartWalletClient = smartWalletClient ?? (await getClientForChain({ id: CHAIN_ID }));
      if (!chainSmartWalletClient) {
        throw new Error("Smart wallet is not ready yet. Please reconnect your Privy wallet and retry.");
      }

      const txHash = await chainSmartWalletClient.sendTransaction({
        to: contractAddress,
        data: encodeFunctionData({
          abi: START_CHALLENGE_ABI,
          functionName: "startChallenge",
          args: [BigInt(createdChallengeId)],
        }),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await api.post<{ ok: boolean }>(
        "/challenge/start",
        { challengeId: Number(createdChallengeId) },
        { headers: { "x-kyc-verified": "true" } },
      );

      setStartTxHash(txHash);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Failed to start challenge.");
    } finally {
      setIsStartingChallenge(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!challengeShareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(challengeShareLink);
      setShareLinkCopyState("copied");
      window.setTimeout(() => setShareLinkCopyState("idle"), 1800);
    } catch {
      setShareLinkCopyState("idle");
    }
  };

  const activeStep = stepDefinitions[currentStep];

  return (
    <div className="space-y-6">
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
              This flow follows the architecture: brand metadata first, then prize economics, then profile preparation, and finally the on-chain create step.
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

        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {stepDefinitions.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(index)}
              className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                index === currentStep
                  ? "border-primary/30 bg-app-soft shadow-app"
                  : "border-app/35 bg-app-surface hover:bg-app-soft/60"
              }`}
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
                  <p className="mt-1 text-sm leading-relaxed text-app-muted">{step.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-app/35 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Live summary</p>
            <p className="text-sm text-app-muted">Current challenge snapshot</p>
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

      <section className="space-y-5">
        <div className="rounded-[2rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">{activeStep.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-app sm:text-4xl">{activeStep.title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-app-muted sm:text-lg">{activeStep.description}</p>

          {currentStep === 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className={labelClassName}>Company name</label>
                <input className={inputClassName} value={form.companyName} onChange={(e) => updateField("companyName", e.target.value)} placeholder="Nova Beverages" />
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Category</label>
                <select className={inputClassName} value={form.category} onChange={(e) => updateField("category", e.target.value)}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={labelClassName}>Tagline players should recall</label>
                <input className={inputClassName} value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Fuel focus. Win faster." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={labelClassName}>Website (Optional)</label>
                <input className={inputClassName} value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://example.com" />
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[1.6rem] border border-dashed border-app/45 bg-app-soft/40 p-5">
                <label className={labelClassName}>Brand logo</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="mt-3 block w-full text-sm text-app-muted file:mr-4 file:rounded-2xl file:border-0 file:bg-primary file:px-4 file:py-3 file:font-semibold file:text-white" />
                <p className="mt-3 text-sm text-app-muted">Use a clean square mark where possible. Max 2MB.</p>
                <div className="mt-5 flex min-h-48 items-center justify-center rounded-[1.6rem] bg-app-surface p-5">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Selected brand logo preview" width={160} height={160} unoptimized className="h-32 w-32 rounded-3xl object-cover" />
                  ) : (
                    <p className="text-center text-sm text-app-muted">Logo preview appears here once uploaded.</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className={labelClassName}>Optional brand fact</label>
                  <textarea value={form.brandFact} onChange={(e) => updateField("brandFact", e.target.value)} placeholder="Founded in Lagos in 2019 and known for bold citrus blends." rows={5} className={inputClassName} />
                  <p className="text-sm text-app-muted">Used for the knowledge round when supplied.</p>
                </div>
                <div className="space-y-2">
                  <label className={labelClassName}>Brand color</label>
                  <input className={inputClassName} value={form.brandColor} onChange={(e) => updateField("brandColor", e.target.value)} placeholder="#ff6a2a" />
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <label className={labelClassName}>Prize pool</label>
                <input className={inputClassName} type="number" min="0" step="0.1" value={form.prizePool} onChange={(e) => updateField("prizePool", e.target.value)} />
                <p className="text-sm text-app-muted">Sent on-chain as the challenge deposit.</p>
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Duration in seconds</label>
                <input className={inputClassName} type="number" min="30" step="30" value={form.duration} onChange={(e) => updateField("duration", e.target.value)} />
                <p className="text-sm text-app-muted">Players can join until the deadline passes.</p>
              </div>
              <div className="space-y-2">
                <label className={labelClassName}>Winner count</label>
                <input className={inputClassName} type="number" min="1" max="10" step="1" value={form.winnerCount} onChange={(e) => updateField("winnerCount", e.target.value)} />
                <p className="text-sm text-app-muted">Top players eligible for distribution.</p>
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
                  The create transaction deposits the prize pool into the challenge contract. After that, launch timing is managed from the Brand dashboard.
                </p>
              </div>

              {!preparedResult ? (
                <button
                  type="button"
                  onClick={() => void handlePrepareProfile()}
                  disabled={isSavingProfile}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:text-lg"
                  style={{ color: "var(--color-white)" }}
                >
                  {isSavingProfile ? "Preparing challenge..." : "Save profile and prepare challenge"}
                </button>
              ) : (
                <div className="rounded-[1.6rem] border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="text-lg font-semibold text-app">Challenge prepared</p>
                  <p className="mt-2 break-all text-sm text-app-muted">
                    Metadata hash committed for creation: {preparedResult.contractDraft.metadataHash}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCreateOnchain()}
                      disabled={isCreatingOnchain || Boolean(createdChallengeId)}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:text-lg"
                      style={{ color: "var(--color-white)" }}
                    >
                      {isCreatingOnchain ? "Creating on-chain..." : createdChallengeId ? "Challenge created" : "Create challenge on-chain"}
                    </button>
                  </div>
                </div>
              )}

              {createTxHash ? (
                <div className="rounded-[1.6rem] bg-app-soft/70 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Create transaction</p>
                  <p className="mt-2 break-all text-sm text-app sm:text-base">{createTxHash}</p>
                </div>
              ) : null}

              {createdChallengeId ? (
                <div className="rounded-[1.8rem] border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Ready for launch</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-app">
                    Challenge #{createdChallengeId} is registered and waiting to be started.
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm text-app-muted sm:text-base">
                    Your campaign has been funded and recorded. Return to the Brand dashboard when you want to move it from pending to live.
                  </p>
                  <div className="mt-4 rounded-[1.4rem] bg-app-surface/80 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Share challenge link</p>
                    <p className="mt-2 break-all text-sm font-medium text-app sm:text-base">
                      {challengeShareLink}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopyShareLink()}
                      className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-app-soft px-4 py-2 text-sm font-semibold text-app transition hover:bg-app sm:text-base"
                    >
                      {shareLinkCopyState === "copied" ? "Link copied" : "Copy share link"}
                    </button>
                  </div>
                  {startTxHash ? (
                    <p className="mt-3 break-all text-sm text-app-muted sm:text-base">
                      Start transaction: {startTxHash}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleStartCreatedChallenge()}
                      disabled={isStartingChallenge || Boolean(startTxHash)}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      style={{ color: "var(--color-white)" }}
                    >
                      {isStartingChallenge ? "Starting challenge..." : startTxHash ? "Challenge started" : "Start Challenge"}
                    </button>
                    <Link href={`/brand/dashboard?refresh=${createdChallengeId}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-6 py-3 text-base font-semibold text-app transition hover:bg-app">
                      Back To Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(0);
                        setForm(initialFormState);
                        setLogoFile(null);
                        setPreparedResult(null);
                        setCreateTxHash(null);
                        setCreatedChallengeId(null);
                        setStartTxHash(null);
                        setStepError(null);
                        setLogoPreview((currentUrl) => {
                          if (currentUrl) URL.revokeObjectURL(currentUrl);
                          return "";
                        });
                      }}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-6 py-3 text-base font-semibold text-app transition hover:bg-app"
                    >
                      Create another
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {stepError ? (
            <div className="mt-5 rounded-[1.4rem] border border-red-500/30 bg-red-500/10 p-4 text-red-600">
              {stepError}
            </div>
          ) : null}

          {!createdChallengeId ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-app/35 pt-5">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-app-soft px-5 py-3 text-base font-semibold text-app transition hover:bg-app disabled:opacity-50"
              >
                Back
              </button>

              {currentStep < stepDefinitions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-white transition hover:brightness-110"
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

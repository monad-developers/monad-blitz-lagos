import type { BrandProfile } from "@/lib/types";
import { readStoreFile, writeStoreFile } from "@/store/persistence";

const STORE_FILE = "brands-store.json";

const initialProfiles = readStoreFile<BrandProfile[]>(STORE_FILE, []);
const brandsByAddress = new Map<string, BrandProfile>(
  initialProfiles.map((profile) => [profile.brandAddress.toLowerCase(), profile]),
);

const persistProfiles = () => {
  writeStoreFile(STORE_FILE, [...brandsByAddress.values()]);
};

export const saveBrandProfile = (profile: BrandProfile) => {
  brandsByAddress.set(profile.brandAddress.toLowerCase(), profile);
  persistProfiles();
  return profile;
};

export const getBrandProfileByAddress = (address: string) => {
  return brandsByAddress.get(address.toLowerCase()) ?? null;
};

export const getBrandProfileByUserId = (userId: string) => {
  return [...brandsByAddress.values()].find((p) => p.userId === userId) ?? null;
};

export const listBrandProfiles = () => {
  return [...brandsByAddress.values()].sort((a, b) => b.updatedAt - a.updatedAt);
};

import type { ChallengeCategory } from "@/lib/player-dashboard";

type ChallengeTabsProps = {
  categories: Array<{ key: ChallengeCategory; label: string }>;
  activeCategory: ChallengeCategory;
  onSelect: (key: ChallengeCategory) => void;
};

export function ChallengeTabs({ categories, activeCategory, onSelect }: ChallengeTabsProps) {
  return (
    <div id="dashboard-challenges" className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="inline-flex min-w-full gap-1.5 rounded-xl border border-app/50 bg-app-soft/85 p-1 sm:min-w-max">
        {categories.map((category) => {
          const isActive = category.key === activeCategory;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.key)}
              className={`min-h-12 cursor-pointer rounded-lg px-4 py-2.5 text-base font-semibold transition-all duration-200 sm:text-lg ${
                isActive
                  ? "bg-app-surface text-app shadow-[0_4px_16px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
                  : "text-app-muted hover:bg-app-surface/70 hover:text-app"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

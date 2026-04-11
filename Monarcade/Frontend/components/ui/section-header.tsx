import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  description?: string;
  countLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  actionUnderTitle?: boolean;
  compact?: boolean;
  titleClassName?: string;
};

export function SectionHeader({
  title,
  description,
  countLabel,
  actionLabel,
  actionHref,
  actionUnderTitle = false,
  compact = false,
  titleClassName,
}: SectionHeaderProps) {
  const defaultTitleClassName = compact
    ? "text-[2.15rem] sm:text-4xl lg:text-[3.5rem] xl:text-[4rem] 2xl:text-[4.4rem]"
    : "text-[2.5rem] sm:text-5xl lg:text-[4.25rem] xl:text-[4.8rem] 2xl:text-[5.4rem]";

  return (
    <header className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full max-w-4xl">
        <h2
          className={`font-bold tracking-tight text-app ${titleClassName ?? defaultTitleClassName}`}
        >
          {title}
        </h2>
        {actionUnderTitle && actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="mt-3 inline-flex text-base font-semibold text-primary transition-all duration-200 hover:translate-x-0.5 hover:brightness-110 xl:text-lg 2xl:text-xl"
          >
            {actionLabel} -&gt;
          </Link>
        ) : null}
        {description ? (
          <p
            className={`mt-3 w-full leading-relaxed text-app-muted ${
              compact
                ? "text-[0.98rem] sm:text-lg lg:text-[1.35rem] xl:text-[1.55rem] 2xl:text-[1.7rem]"
                : "text-[1.05rem] sm:text-xl lg:text-[1.75rem] xl:text-[2rem] 2xl:text-[2.2rem]"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>
      {countLabel ? (
        <p
          className={`inline-flex self-start rounded-full bg-app-soft/85 px-3 py-1.5 font-semibold uppercase tracking-[0.16em] text-app-muted sm:self-auto sm:px-4 sm:py-2 ${
            compact ? "text-[0.72rem] sm:text-sm xl:text-base 2xl:text-lg" : "text-[0.82rem] sm:text-base xl:text-lg 2xl:text-xl"
          }`}
        >
          {countLabel}
        </p>
      ) : null}
      {!actionUnderTitle && actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex self-start text-base font-semibold text-primary transition-all duration-200 hover:translate-x-0.5 hover:brightness-110 sm:self-auto xl:text-lg 2xl:text-xl"
        >
          {actionLabel} -&gt;
        </Link>
      ) : null}
    </header>
  );
}

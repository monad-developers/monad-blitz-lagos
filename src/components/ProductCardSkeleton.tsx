'use client'

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface-container-low p-5 flex flex-col rounded-[12px] animate-pulse">
      <div className="aspect-square bg-surface-container-highest mb-4 rounded-[8px]"></div>
      <div className="h-2 w-1/3 bg-surface-container-highest mb-2 rounded"></div>
      <div className="h-4 w-3/4 bg-surface-container-highest mb-4 rounded"></div>
      <div className="mt-auto flex justify-between items-center">
        <div className="h-4 w-1/4 bg-surface-container-highest rounded"></div>
        <div className="h-8 w-8 bg-surface-container-highest rounded-full"></div>
      </div>
    </div>
  )
}

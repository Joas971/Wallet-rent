export function TokenListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-5 py-4"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-16 animate-pulse rounded-md bg-white/10" />
            <div className="h-2.5 w-28 animate-pulse rounded-md bg-white/5" />
          </div>
          <div className="hidden space-y-2 sm:block">
            <div className="h-3 w-20 animate-pulse rounded-md bg-white/8" />
            <div className="h-2 w-12 animate-pulse rounded-md bg-white/5" />
          </div>
          <div className="hidden space-y-2 md:block">
            <div className="h-3 w-24 animate-pulse rounded-md bg-white/10" />
            <div className="h-2 w-14 animate-pulse rounded-md bg-white/5" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-md bg-white/10" />
          </div>
          <div className="h-4 w-4 animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}

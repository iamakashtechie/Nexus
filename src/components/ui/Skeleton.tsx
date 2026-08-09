"use client";

import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-hover/60",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function NoteListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1 px-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-3 min-h-[56px]">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full pt-4 px-5 md:px-8 flex-1 space-y-4">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
      <div className="space-y-3 pt-6">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-10/12" />
        <Skeleton className="h-3 w-9/12" />
      </div>
    </div>
  );
}
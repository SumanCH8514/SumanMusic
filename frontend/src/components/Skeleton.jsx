import React from 'react';
import { cn } from '../lib/utils';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md border border-border-main/5",
        className
      )}
      {...props}
    />
  );
};

export const SongCardSkeleton = ({ viewMode = 'list' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 bg-bg-surface/30 rounded p-1 border border-border-main/5 skeleton-shimmer">
        <div className="w-12 h-12 rounded bg-border-main/15 shrink-0" />
        <div className="flex-1 min-w-0 py-1 space-y-2 pr-3">
          <div className="h-3 w-4/5 rounded bg-border-main/20" />
          <div className="h-2.5 w-1/2 rounded bg-border-main/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 rounded-2xl bg-bg-surface/30 border border-border-main/5 skeleton-shimmer">
      <div className="w-full aspect-square rounded-xl bg-border-main/15" />
      <div className="space-y-2">
        <div className="h-3.5 w-4/5 rounded bg-border-main/20" />
        <div className="h-2.5 w-1/2 rounded bg-border-main/10" />
      </div>
    </div>
  );
};

export const AlbumCardSkeleton = () => {
  return (
    <div className="flex-shrink-0 w-36 space-y-2">
      <div className="aspect-square rounded-md bg-bg-surface/40 border border-border-main/5 skeleton-shimmer" />
      <div className="h-3 w-4/5 rounded bg-border-main/20 skeleton-shimmer" />
      <div className="h-2.5 w-1/2 rounded bg-border-main/10 skeleton-shimmer" />
    </div>
  );
};

export const HomeSkeleton = ({ viewMode = 'list' }) => {
  return (
    <div className="flex flex-col gap-8 pb-48 animate-pulse duration-1000">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-44 rounded-lg bg-bg-surface/60 skeleton-shimmer" />
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-bg-surface/40 skeleton-shimmer" />
            <div className="w-6 h-6 rounded-full bg-bg-surface/40 skeleton-shimmer" />
          </div>
        </div>
        <div className="md:hidden h-11 w-full rounded-md bg-bg-surface/40 skeleton-shimmer" />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-bg-surface/60 skeleton-shimmer" />
          <div className="h-3 w-16 rounded bg-bg-surface/40 skeleton-shimmer" />
        </div>
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <AlbumCardSkeleton key={`album-skel-${i}`} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-bg-surface/60 skeleton-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-16 rounded bg-bg-surface/40 skeleton-shimmer" />
            <div className="w-7 h-7 rounded-lg bg-bg-surface/40 skeleton-shimmer" />
          </div>
        </div>

        <div className={cn(
          viewMode === 'list'
            ? "grid grid-cols-2 md:grid-cols-3 gap-3"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        )}>
          {Array.from({ length: 12 }).map((_, i) => (
            <SongCardSkeleton key={`song-skel-${i}`} viewMode={viewMode} />
          ))}
        </div>
      </section>
    </div>
  );
};

export const LibrarySkeleton = ({ viewMode = 'grid' }) => {
  return (
    <div className="flex flex-col gap-6 pb-48 animate-pulse duration-1000">
      <div className="flex items-center gap-2 overflow-x-hidden pb-1">
        {['All', 'Tracks', 'Artists', 'Albums', 'Liked', 'Playlists', 'Recent'].map((name, i) => (
          <div key={`tab-skel-${i}`} className="h-8 w-20 rounded-full bg-bg-surface/50 skeleton-shimmer shrink-0" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-64 rounded-xl bg-bg-surface/40 skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-bg-surface/40 skeleton-shimmer" />
          <div className="h-8 w-8 rounded-lg bg-bg-surface/40 skeleton-shimmer" />
        </div>
      </div>

      <div className={cn(
        viewMode === 'list'
          ? "space-y-2.5"
          : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      )}>
        {Array.from({ length: 15 }).map((_, i) => (
          <SongCardSkeleton key={`lib-skel-${i}`} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};

export const OnlineLibrarySkeleton = () => {
  return (
    <div className="flex flex-col gap-8 pb-48 animate-pulse duration-1000">
      <div className="flex items-center gap-2 overflow-hidden pb-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`chip-skel-${i}`} className="h-8 w-24 rounded-full bg-bg-surface/50 skeleton-shimmer shrink-0" />
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded bg-bg-surface/60 skeleton-shimmer" />
            <div className="h-3 w-64 rounded bg-bg-surface/30 skeleton-shimmer" />
          </div>
          <div className="h-6 w-16 rounded-full bg-bg-surface/40 skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`feed-1-${i}`} className="flex flex-col gap-2.5 p-3 rounded-2xl bg-bg-surface/40 border border-border-main/5 skeleton-shimmer">
              <div className="aspect-square w-full rounded-xl bg-border-main/15" />
              <div className="h-3 w-3/4 rounded bg-border-main/20" />
              <div className="h-2.5 w-1/2 rounded bg-border-main/10" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-40 rounded bg-bg-surface/60 skeleton-shimmer" />
            <div className="h-3 w-56 rounded bg-bg-surface/30 skeleton-shimmer" />
          </div>
          <div className="h-6 w-16 rounded-full bg-bg-surface/40 skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`feed-2-${i}`} className="flex flex-col gap-2.5 p-3 rounded-2xl bg-bg-surface/40 border border-border-main/5 skeleton-shimmer">
              <div className="aspect-square w-full rounded-xl bg-border-main/15" />
              <div className="h-3.5 w-3/4 rounded bg-border-main/20" />
              <div className="h-2.5 w-1/2 rounded bg-border-main/10" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const ArtistsSkeleton = ({ viewMode = 'grid' }) => {
  return (
    <div className={cn(
      "grid gap-6 animate-pulse duration-1000 pb-48",
      viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1"
    )}>
      {Array.from({ length: 12 }).map((_, idx) => (
        viewMode === 'grid' ? (
          <div key={`artist-skel-${idx}`} className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-bg-surface/30 border border-border-main/5 skeleton-shimmer">
            <div className="w-full aspect-square rounded-full bg-border-main/20" />
            <div className="h-4 w-3/4 rounded bg-border-main/25 mt-1" />
            <div className="h-2.5 w-1/3 rounded bg-border-main/15" />
          </div>
        ) : (
          <div key={`artist-skel-${idx}`} className="flex items-center gap-4 p-3 rounded-2xl bg-bg-surface/30 border border-border-main/5 skeleton-shimmer">
            <div className="w-16 h-16 rounded-full bg-border-main/20 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-border-main/25" />
              <div className="h-2.5 w-1/5 rounded bg-border-main/15" />
            </div>
          </div>
        )
      ))}
    </div>
  );
};

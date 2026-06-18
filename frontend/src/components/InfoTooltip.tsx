import { useEffect, useId, useRef, useState } from 'react';

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5v5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function InfoTooltip({
  body,
  compact = false,
  title,
  triggerLabel = 'i'
}: {
  body: string;
  compact?: boolean;
  title: string;
  triggerLabel?: string;
}) {
  const tooltipId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [supportsHover, setSupportsHover] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateMode = () => {
      const nextSupportsHover = mediaQuery.matches;
      setSupportsHover(nextSupportsHover);
      if (nextSupportsHover) {
        setIsOpen(false);
      }
    };

    updateMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMode);
      return () => mediaQuery.removeEventListener('change', updateMode);
    }

    mediaQuery.addListener(updateMode);
    return () => mediaQuery.removeListener(updateMode);
  }, []);

  useEffect(() => {
    if (!isOpen || supportsHover || typeof document === 'undefined') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, supportsHover]);

  const tooltipClassName = supportsHover
    ? 'pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 max-w-[min(18rem,calc(100vw-4rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-normal leading-5 text-amber-950 shadow-lg group-hover:block'
    : `absolute left-0 top-full z-20 mt-2 w-64 max-w-[min(18rem,calc(100vw-4rem))] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-normal leading-5 text-amber-950 shadow-lg ${isOpen ? 'block' : 'hidden'}`;

  return (
    <div ref={containerRef} className="group relative inline-flex shrink-0">
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 focus:border-amber-300 focus:bg-amber-50 focus:text-amber-900 focus:outline-none ${compact ? 'h-5 w-5' : 'h-8 w-8'}`}
        aria-label={title}
        aria-describedby={tooltipId}
        aria-expanded={!supportsHover ? isOpen : undefined}
        title={title}
        onClick={event => {
          if (!supportsHover) {
            setIsOpen(current => !current);
            return;
          }
          event.currentTarget.blur();
        }}
      >
        {triggerLabel === 'i' ? <InfoIcon /> : triggerLabel}
      </button>
      <div id={tooltipId} role="tooltip" className={tooltipClassName}>
        <div className="font-semibold">{title}</div>
        <p className="mt-1">{body}</p>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown, HiSearch } from 'react-icons/hi';
import {
  PHONE_DIAL_OPTIONS,
  type PhoneDialOption,
  dialCodeFlagEmoji,
  parsePhoneDialValue,
  phoneDialOptionValue,
} from '@/utils/phoneDialCodes';

export interface PhoneDialCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Shown as red border on trigger + message below */
  error?: string;
}

function findOptionByValue(v: string): PhoneDialOption | undefined {
  return PHONE_DIAL_OPTIONS.find((o) => phoneDialOptionValue(o) === v);
}

const DROPDOWN_LIST_MAX_PX = 300;
const DROPDOWN_Z = 200;

type PanelCoords = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

function measurePanelCoords(triggerEl: HTMLElement): PanelCoords {
  const rect = triggerEl.getBoundingClientRect();
  const gap = 4;
  const searchBlock = 56;
  const panelEstimate = searchBlock + DROPDOWN_LIST_MAX_PX + 16;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openBelow = spaceBelow >= Math.min(panelEstimate, 220) || spaceBelow >= spaceAbove;
  if (openBelow) {
    return { left: rect.left, width: rect.width, top: rect.bottom + gap };
  }
  return { left: rect.left, width: rect.width, bottom: vh - rect.top + gap };
}

export function PhoneDialCodeSelect({
  value,
  onChange,
  disabled = false,
  id: idProp,
  className = '',
  error,
}: PhoneDialCodeSelectProps) {
  const reactId = useId();
  const baseId = idProp ?? `phone-dial-${reactId.replace(/:/g, '')}`;
  const listboxId = `${baseId}-listbox`;
  const searchId = `${baseId}-search`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [panelCoords, setPanelCoords] = useState<PanelCoords | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function closeDropdown() {
    setOpen(false);
    setPanelCoords(null);
  }

  const updatePanelCoords = useCallback(() => {
    const el = containerRef.current;
    if (!open || !el) {
      setPanelCoords(null);
      return;
    }
    setPanelCoords(measurePanelCoords(el));
  }, [open]);

  useLayoutEffect(() => {
    updatePanelCoords();
  }, [open, updatePanelCoords]);

  useEffect(() => {
    if (!open) return;
    updatePanelCoords();
    const onWin = () => updatePanelCoords();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open, updatePanelCoords]);

  const selected = useMemo(() => findOptionByValue(value), [value]);
  const parsed = parsePhoneDialValue(value);
  const triggerFlag = selected ? dialCodeFlagEmoji(selected.iso2) : dialCodeFlagEmoji(parsed.iso2);
  const triggerDial = selected?.dial ?? parsed.dial;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PHONE_DIAL_OPTIONS;
    return PHONE_DIAL_OPTIONS.filter((o) => {
      return (
        o.dial.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q) ||
        o.iso2.toLowerCase().includes(q)
      );
    });
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const idx = PHONE_DIAL_OPTIONS.findIndex((o) => phoneDialOptionValue(o) === value);
    setHighlighted(idx >= 0 ? idx : 0);
    queueMicrotask(() => searchInputRef.current?.focus());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    setHighlighted((h) => (filtered.length === 0 ? 0 : Math.min(h, filtered.length - 1)));
  }, [filtered.length, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      closeDropdown();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open, filtered.length]);

  const selectOption = (o: PhoneDialOption) => {
    onChange(phoneDialOptionValue(o));
    closeDropdown();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (filtered.length ? Math.min(i + 1, filtered.length - 1) : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[highlighted];
      if (o) selectOption(o);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  };

  const invalid = Boolean(error);

  const dropdownPanel =
    open && panelCoords ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={baseId}
        style={{
          position: 'fixed',
          left: panelCoords.left,
          width: panelCoords.width,
          zIndex: DROPDOWN_Z,
          ...(panelCoords.top != null ? { top: panelCoords.top } : {}),
          ...(panelCoords.bottom != null ? { bottom: panelCoords.bottom } : {}),
        }}
        className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/10"
      >
        <div className="shrink-0 border-b border-gray-100 px-2 pb-2 pt-1">
          <label htmlFor={searchId} className="sr-only">
            Search country or dialing code
          </label>
          <div className="relative">
            <HiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              autoComplete="off"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search country or code"
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <ul
          ref={listRef}
          style={{ maxHeight: DROPDOWN_LIST_MAX_PX }}
          className="min-h-0 overflow-y-auto overscroll-contain py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
          ) : (
            filtered.map((o, i) => {
              const optValue = phoneDialOptionValue(o);
              const isSelected = optValue === value;
              const isHi = i === highlighted;
              return (
                <li key={optValue} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${o.country}, ${o.dial}`}
                    title={`${o.country} ${o.dial}`}
                    className={`flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isHi ? 'bg-brand-50 text-brand-900' : 'text-gray-900 hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => selectOption(o)}
                  >
                    <span className="text-lg leading-none shrink-0" aria-hidden>
                      {dialCodeFlagEmoji(o.iso2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{o.country}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-gray-500">{o.dial}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={baseId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setPanelCoords(null);
            return;
          }
          if (containerRef.current) setPanelCoords(measurePanelCoords(containerRef.current));
          setOpen(true);
        }}
        className={`flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-gray-50 ${
          invalid ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-lg leading-none shrink-0" aria-hidden>
            {triggerFlag}
          </span>
          <span className="font-mono font-medium text-gray-900 truncate">{triggerDial}</span>
        </span>
        <HiChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {typeof document !== 'undefined' && dropdownPanel ? createPortal(dropdownPanel, document.body) : null}

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

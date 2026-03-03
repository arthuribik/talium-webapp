import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { HiSearch } from 'react-icons/hi';

export type SearchableListOption = string | { value: string; label: string };

export interface SearchableListProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableListOption[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  /** When true, typed text that is not in the list is accepted as the value on blur or Enter */
  allowCustom?: boolean;
}

function normalizeOptions(options: SearchableListOption[]): { value: string; label: string }[] {
  return options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );
}

export function SearchableList({
  value,
  onChange,
  options,
  placeholder = 'Search or select...',
  disabled = false,
  readOnly = false,
  className = '',
  id,
  allowCustom = false,
}: SearchableListProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const listId = listboxId.replace(/:/g, '-');

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const displayValue = useMemo(() => {
    if (value === '') return '';
    const opt = normalized.find((o) => o.value === value);
    return opt ? opt.label : value;
  }, [normalized, value]);

  const filterQuery = open ? inputValue.trim().toLowerCase() : '';
  const filtered = useMemo(() => {
    if (!filterQuery) return normalized;
    return normalized.filter(
      (opt) =>
        opt.label.toLowerCase().includes(filterQuery) ||
        opt.value.toLowerCase().includes(filterQuery),
    );
  }, [normalized, filterQuery]);

  const canOpen = !disabled && !readOnly;

  useEffect(() => {
    if (!open) return;
    setHighlightedIndex(0);
  }, [open, filterQuery]);

  useEffect(() => {
    if (!open) return;
    setInputValue(displayValue);
  }, [open, displayValue]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const item = el.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const commitCustomValue = (trimmed: string) => {
    if (!allowCustom || !trimmed) return;
    if (trimmed === value) return;
    const match = normalized.some(
      (o) => o.value.toLowerCase() === trimmed.toLowerCase() || o.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!match) onChange(trimmed);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitCustomValue(inputValue.trim());
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, inputValue, allowCustom]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        if (canOpen && filtered.length > 0) setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : i));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex] !== undefined) {
          onChange(filtered[highlightedIndex].value);
          setOpen(false);
        } else if (allowCustom && inputValue.trim()) {
          commitCustomValue(inputValue.trim());
          setOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (opt: { value: string; label: string }) => {
    onChange(opt.value);
    setOpen(false);
  };

  const showInput = open && canOpen ? inputValue : displayValue;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={showInput}
          onChange={(e) => {
            const v = e.target.value;
            if (open) setInputValue(v);
            else onChange(v);
          }}
          onFocus={() => {
            if (canOpen) {
              setOpen(true);
              setInputValue(displayValue);
            }
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null;
            const focusLeftContainer = !next || !containerRef.current?.contains(next);
            if (allowCustom && open && focusLeftContainer) {
              commitCustomValue(inputValue.trim());
            }
            if (focusLeftContainer) setOpen(false);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed ${className}`}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-activedescendant={
            open && filtered[highlightedIndex]
              ? `${listId}-option-${highlightedIndex}`
              : undefined
          }
        />
      </div>
      {open && canOpen && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500" role="option">
              No matches
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt.value + opt.label}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleSelect(opt)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlightedIndex ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

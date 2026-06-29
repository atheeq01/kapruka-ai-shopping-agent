import React, { useState, useRef, useEffect, useId } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}) => {
  const uid = useId();
  const portalId = `searchable-select-${uid}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const updateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 240;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  const openDropdown = () => {
    updateDropdownPosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const handleScroll = () => updateDropdownPosition();
    const handleResize = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const dropdown = document.getElementById(portalId);
      if (dropdown?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, portalId]);

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const dropdown = open ? (
    <div
      id={portalId}
      style={dropdownStyle}
      className="overflow-hidden rounded-xl border border-pink-100 bg-white shadow-xl shadow-pink-200/40 ring-1 ring-black/[0.02]"
    >
      <div className="relative border-b border-pink-100/70">
        <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full bg-transparent py-2.5 pl-10 pr-9 text-sm text-gray-700 outline-none placeholder:text-gray-400"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>
      <ul className="searchable-scroll max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <li className="px-4 py-2 text-center text-sm text-gray-400">No results</li>
        ) : (
          filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => select(opt)}
              className={`cursor-pointer py-2 pl-10 pr-4 text-sm text-gray-700 transition-colors hover:bg-pink-50 hover:text-pink-600 ${
                opt === value ? 'bg-pink-50/70 font-semibold text-pink-600' : ''
              }`}
            >
              {opt}
            </li>
          ))
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? (setOpen(false), setQuery('')) : openDropdown())}
        className="w-full flex items-center justify-between border border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white/90 hover:border-pink-300 focus:ring-2 focus:ring-pink-300/30 focus:border-pink-400 outline-none text-left transition-colors"
      >
        <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <span
              onMouseDown={clear}
              className="text-gray-400 hover:text-gray-600 flex items-center"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
};

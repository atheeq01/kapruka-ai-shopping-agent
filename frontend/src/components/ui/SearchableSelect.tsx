import React, { useState, useRef, useEffect } from 'react';
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
      const dropdown = document.getElementById('searchable-select-portal');
      if (dropdown?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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
    <div id="searchable-select-portal" style={dropdownStyle} className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
      <div className="p-2 border-b border-gray-100 flex items-center gap-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
        ) : (
          filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => select(opt)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-kapruka-orange hover:text-white transition-colors ${
                opt === value ? 'bg-kapruka-orange/10 font-medium' : ''
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
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:border-kapruka-orange/50 focus:ring-2 focus:ring-kapruka-orange/20 focus:border-kapruka-orange outline-none text-left transition-colors"
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

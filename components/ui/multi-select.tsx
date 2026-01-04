'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  value = [],
  onChange,
  options,
  placeholder = '선택하세요',
  className,
  disabled,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[2.5rem] flex items-center gap-2 px-3 py-2 text-sm bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-md',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-cyan-500/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer',
          'text-gray-300'
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(option.value, e);
                }}
              >
                {option.label}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(option.value, e);
                  }}
                  className="hover:bg-cyan-500/30 rounded cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 sticky top-0 bg-black/80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="검색..."
              className="w-full px-3 py-2 text-sm bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              autoFocus
            />
          </div>
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">검색 결과가 없습니다</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2',
                      isSelected && 'bg-cyan-500/20 text-cyan-300'
                    )}
                  >
                    <span className={cn('w-4 h-4 border rounded flex items-center justify-center', isSelected && 'bg-cyan-500 border-cyan-500')}>
                      {isSelected && <span className="text-xs">✓</span>}
                    </span>
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}



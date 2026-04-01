"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Prediction {
  placeId: string;
  description: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (parts: { street: string; streetNr: string; plz: string; city: string }) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setPredictions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(val)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setOpen(data.predictions?.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  async function handleSelect(p: Prediction) {
    setOpen(false);
    setPredictions([]);
    onChange(p.description.split(",")[0]); // show just street part in input
    const res = await fetch(`/api/places/details?placeId=${p.placeId}`);
    const parts = await res.json();
    onSelect(parts);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onMouseDown={() => handleSelect(p)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors"
              >
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700 leading-tight">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

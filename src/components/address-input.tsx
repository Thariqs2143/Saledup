
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import type { RawResult } from 'leaflet-geosearch/dist/providers/openStreetMapProvider';
import 'leaflet-geosearch/dist/geosearch.css';

interface AddressInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onLocationSelect: (location: RawResult | null) => void;
}

const provider = new OpenStreetMapProvider();

export function AddressInput({ value, onValueChange, onLocationSelect }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<RawResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (value.length > 2) {
        setIsLoading(true);
        try {
          const results = await provider.search({ query: value });
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Geocoding error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 500); // Debounce API calls

    return () => clearTimeout(handler);
  }, [value]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: RawResult) => {
    onValueChange(suggestion.label);
    onLocationSelect(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            onLocationSelect(null); // Clear location if user types manually
          }}
          placeholder="Start typing your shop's address..."
          className="pl-10"
          autoComplete="off"
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="px-4 py-2 hover:bg-accent cursor-pointer text-sm"
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

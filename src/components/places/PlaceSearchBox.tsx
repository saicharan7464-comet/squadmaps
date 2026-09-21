import React, { useState, useEffect, useRef } from 'react';
import { Place, PlaceCategory } from '../../types/places';
import { LatLng } from '../../types/navigation';
import { nominatimPlacesProvider } from '../../services/places/nominatimPlacesProvider';
import { Search, X, MapPin, Star, Navigation, Coffee, Fuel, Zap, Hotel, Utensils, Building } from 'lucide-react';

interface PlaceSearchBoxProps {
  userLocation: LatLng | null;
  onSelectPlace: (place: Place) => void;
  onSuggestToSquad?: (place: Place) => void;
  placeholder?: string;
  isSquadActive?: boolean;
}

const CATEGORIES: { id: PlaceCategory; label: string; icon: any }[] = [
  { id: 'restaurant', label: 'Food', icon: Utensils },
  { id: 'petrol', label: 'Fuel', icon: Fuel },
  { id: 'ev_charging', label: 'EV Charger', icon: Zap },
  { id: 'cafe', label: 'Cafes', icon: Coffee },
  { id: 'hotel', label: 'Hotels', icon: Hotel },
  { id: 'hospital', label: 'Hospitals', icon: Building }
];

export const PlaceSearchBox: React.FC<PlaceSearchBoxProps> = ({
  userLocation,
  onSelectPlace,
  onSuggestToSquad,
  placeholder = 'Search destination, city, or landmark...',
  isSquadActive = false
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const searchTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search
  const performSearch = async (searchTerm: string, cat: PlaceCategory | null) => {
    if (!searchTerm && !cat) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const places = await nominatimPlacesProvider.searchPlaces(
        searchTerm,
        userLocation || undefined,
        cat || undefined
      );
      setResults(places);
      setIsOpen(true);
    } catch (err) {
      console.warn('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(val, activeCategory);
    }, 350);
  };

  const handleCategoryClick = (cat: PlaceCategory) => {
    const nextCat = activeCategory === cat ? null : cat;
    setActiveCategory(nextCat);
    performSearch(query, nextCat);
  };

  const handleClear = () => {
    setQuery('');
    setActiveCategory(null);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: 'var(--z-controls)' }}>
      {/* Search Input Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 14px',
          gap: '10px',
          backgroundColor: 'var(--bg-glass-card)'
        }}
      >
        <Search size={20} color="var(--accent-cyan)" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '15px',
            fontFamily: 'inherit'
          }}
        />

        {isLoading && (
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid var(--accent-cyan)',
              borderTopColor: 'transparent',
              animation: 'radarSweep 0.8s linear infinite'
            }}
          />
        )}

        {query && (
          <button onClick={handleClear} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '8px 0',
          scrollbarWidth: 'none'
        }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: isSelected ? 'var(--accent-cyan)' : 'var(--bg-glass)',
                color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '8px',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {results.map((place) => (
            <div
              key={place.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              className="glass-card"
              onClick={() => {
                onSelectPlace(place);
                setIsOpen(false);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <MapPin size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#FFFFFF',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {place.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {place.address}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {place.rating && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-amber)'
                    }}
                  >
                    <Star size={12} fill="var(--accent-amber)" />
                    {place.rating}
                  </span>
                )}

                {isSquadActive && onSuggestToSquad && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSuggestToSquad(place);
                      setIsOpen(false);
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      color: 'var(--accent-purple)',
                      border: '1px solid var(--accent-purple)'
                    }}
                  >
                    Suggest
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

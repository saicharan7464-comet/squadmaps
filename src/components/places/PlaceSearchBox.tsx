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
  showCategories?: boolean;
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
  isSquadActive = false,
  showCategories = true
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0, zIndex: 'var(--z-controls)' }}>
      {/* Search Input Bar */}
      <div
        className="cockpit-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 14px',
          gap: '10px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <Search size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
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
            minWidth: 0,
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
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
              animation: 'radarSweep 0.8s linear infinite',
              flexShrink: 0
            }}
          />
        )}

        {query && (
          <button
            onClick={handleClear}
            className="btn-icon"
            style={{ width: '24px', height: '24px', color: 'var(--text-muted)', flexShrink: 0 }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      {showCategories && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            maxWidth: '100%',
            width: '100%',
            minWidth: 0,
            padding: '8px 0',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
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
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: isSelected
                    ? 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)'
                    : 'var(--bg-surface)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  boxShadow: isSelected ? '0 0 12px rgba(0, 102, 255, 0.35)' : 'var(--shadow-sm)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} color={isSelected ? 'var(--accent-cyan)' : 'currentColor'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div
          className="cockpit-card animate-modal-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '8px',
            boxShadow: 'var(--shadow-xl)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            zIndex: 100
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
                transition: 'background 0.15s',
                marginBottom: '4px',
                border: '1px solid transparent'
              }}
              className="cockpit-card-interactive"
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
                      color: 'var(--text-primary)',
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
                    type="button"
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
                      backgroundColor: 'var(--accent-purple-dim)',
                      color: 'var(--accent-purple)',
                      border: '1px solid rgba(139, 92, 246, 0.4)'
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

      {/* Empty Search Feedback */}
      {isOpen && !isLoading && results.length === 0 && query.trim().length > 2 && (
        <div
          className="surface-card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            padding: '14px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '13px',
            boxShadow: 'var(--shadow-md)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)'
          }}
        >
          No destinations found matching "{query}".
        </div>
      )}
    </div>
  );
};

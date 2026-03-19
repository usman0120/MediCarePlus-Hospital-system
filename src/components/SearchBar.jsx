import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTimes,
  faHistory,
  faUser,
  faUserMd,
  faCalendarAlt,
  faFileMedical,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import Fuse from 'fuse.js';

const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  data = [],
  searchKeys = ['name', 'id', 'phone', 'email'],
  onResultSelect,
  recentSearches = [],
  onSaveRecent,
  filters = [],
  className = '',
  showFilters = false,
  autoFocus = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [recentVisible, setRecentVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const fuseRef = useRef(null);

  // Helper functions (defined first)
  const getResultIcon = useCallback((result) => {
    if (result.role === 'doctor') return faUserMd;
    if (result.role === 'patient') return faUser;
    if (result.type === 'appointment') return faCalendarAlt;
    if (result.type === 'record') return faFileMedical;
    return faSearch;
  }, []);

  const getResultDisplay = useCallback((result) => {
    if (result.fullName) return result.fullName;
    if (result.name) return result.name;
    if (result.title) return result.title;
    return result.id || '';
  }, []);

  const getResultSubDisplay = useCallback((result) => {
    const parts = [];
    if (result.role) parts.push(result.role);
    if (result.department) parts.push(result.department);
    if (result.id) parts.push(`ID: ${result.id.slice(-6)}`);
    if (result.phone) parts.push(result.phone);
    if (result.email) parts.push(result.email);
    return parts.join(' • ');
  }, []);

  // Define performSearch with useCallback
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);

    // If we have data and Fuse instance, perform fuzzy search
    if (fuseRef.current) {
      const searchResults = fuseRef.current.search(searchQuery);
      const filteredResults = searchResults
        .filter(result => selectedFilter === 'all' || result.item.type === selectedFilter)
        .map(result => ({
          ...result.item,
          score: result.score
        }));
      setResults(filteredResults);
    }

    // Call external search handler if provided
    if (onSearch) {
      try {
        const externalResults = await onSearch(searchQuery, selectedFilter);
        if (externalResults) {
          setResults(externalResults);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }

    // Save to recent searches
    if (onSaveRecent && searchQuery.trim()) {
      onSaveRecent({
        query: searchQuery,
        timestamp: new Date(),
        filter: selectedFilter
      });
    }

    setLoading(false);
    setShowResults(true);
    setRecentVisible(false);
  }, [onSearch, onSaveRecent, selectedFilter]);

  // Define handleResultSelect with useCallback
  const handleResultSelect = useCallback((result) => {
    setQuery(getResultDisplay(result));
    setShowResults(false);
    setRecentVisible(false);
    
    if (onResultSelect) {
      onResultSelect(result);
    }
  }, [getResultDisplay, onResultSelect]);

  // Define handleRecentSelect with useCallback
  const handleRecentSelect = useCallback((recent) => {
    setQuery(recent.query);
    performSearch(recent.query);
  }, [performSearch]);

  // Initialize Fuse for fuzzy search
  useEffect(() => {
    if (data.length > 0) {
      fuseRef.current = new Fuse(data, {
        keys: searchKeys,
        threshold: 0.3,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
      });
    }
  }, [data, searchKeys]);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setRecentVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showResults && !recentVisible) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < (results.length + recentSearches.length - 1) ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > -1 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            if (highlightedIndex < results.length) {
              handleResultSelect(results[highlightedIndex]);
            } else {
              const recentIndex = highlightedIndex - results.length;
              if (recentSearches[recentIndex]) {
                handleRecentSelect(recentSearches[recentIndex]);
              }
            }
          }
          break;
        case 'Escape':
          setShowResults(false);
          setRecentVisible(false);
          setHighlightedIndex(-1);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, recentVisible, results, recentSearches, highlightedIndex, handleResultSelect, handleRecentSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && resultsRef.current) {
      const highlightedElement = resultsRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHighlightedIndex(-1);

    if (value.trim()) {
      performSearch(value);
    } else {
      setResults([]);
      setShowResults(false);
      setRecentVisible(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setRecentVisible(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const renderRecentSearches = () => (
    <div className="p-2">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold text-gray-500 uppercase">Recent Searches</span>
        <button 
          onClick={() => {/* Clear all recent searches */}} 
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Clear All
        </button>
      </div>
      {recentSearches.map((recent, index) => (
        <button
          key={index}
          onClick={() => handleRecentSelect(recent)}
          className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 ${
            highlightedIndex === results.length + index ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <FontAwesomeIcon icon={faHistory} className="text-gray-400 w-4" />
          <div className="flex-1">
            <p className="text-sm text-gray-900 dark:text-white">{recent.query}</p>
            <p className="text-xs text-gray-500">
              {new Date(recent.timestamp).toLocaleDateString()}
            </p>
          </div>
          {recent.filter !== 'all' && (
            <span className="text-xs text-gray-500">({recent.filter})</span>
          )}
        </button>
      ))}
    </div>
  );

  const renderSearchResults = () => (
    <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
      {loading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        results.map((result, index) => (
          <button
            key={index}
            onClick={() => handleResultSelect(result)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start space-x-3 ${
              highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              <FontAwesomeIcon 
                icon={getResultIcon(result)} 
                className="text-gray-400 w-4" 
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getResultDisplay(result)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getResultSubDisplay(result)}
              </p>
            </div>
            {result.score && (
              <span className="text-xs text-gray-400">
                {Math.round((1 - result.score) * 100)}% match
              </span>
            )}
          </button>
        ))
      ) : query && (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query) {
              setShowResults(true);
            } else {
              setRecentVisible(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          autoFocus={autoFocus}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {showFilters && filters.length > 0 && (
        <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-2">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                selectedFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Results Dropdown */}
      {(showResults || recentVisible) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          {recentVisible && recentSearches.length > 0 && renderRecentSearches()}
          {showResults && renderSearchResults()}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
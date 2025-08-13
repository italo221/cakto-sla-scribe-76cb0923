import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DateFilterConfig } from '@/components/ui/date-filter';

const STORAGE_KEY = 'ticket_date_filter';

export const useDateFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [dateFilter, setDateFilter] = useState<DateFilterConfig>(() => {
    // Try to load from URL first
    const dateField = searchParams.get('dateField') as DateFilterConfig['dateField'] || 'data_criacao';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const preset = searchParams.get('range') || 'all';
    
    if (from || to || preset !== 'all') {
      return {
        dateField,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        preset
      };
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          dateField: parsed.dateField || 'data_criacao',
          from: parsed.from ? new Date(parsed.from) : undefined,
          to: parsed.to ? new Date(parsed.to) : undefined,
          preset: parsed.preset || 'all'
        };
      }
    } catch (error) {
      console.warn('Failed to parse stored date filter:', error);
    }
    
    return {
      dateField: 'data_criacao',
      preset: 'all'
    };
  });

  // Update URL when filter changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    // Always set dateField
    newParams.set('dateField', dateFilter.dateField);
    
    if (dateFilter.from) {
      newParams.set('from', dateFilter.from.toISOString());
    } else {
      newParams.delete('from');
    }
    
    if (dateFilter.to) {
      newParams.set('to', dateFilter.to.toISOString());
    } else {
      newParams.delete('to');
    }
    
    if (dateFilter.preset && dateFilter.preset !== 'all') {
      newParams.set('range', dateFilter.preset);
    } else {
      newParams.delete('range');
    }
    
    setSearchParams(newParams, { replace: true });
  }, [dateFilter, searchParams, setSearchParams]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dateField: dateFilter.dateField,
        from: dateFilter.from?.toISOString(),
        to: dateFilter.to?.toISOString(),
        preset: dateFilter.preset
      }));
    } catch (error) {
      console.warn('Failed to store date filter:', error);
    }
  }, [dateFilter]);

  const updateDateFilter = useCallback((newFilter: DateFilterConfig) => {
    setDateFilter(newFilter);
  }, []);

  const clearDateFilter = useCallback(() => {
    setDateFilter({
      dateField: 'data_criacao',
      preset: 'all'
    });
  }, []);

  const getFilterParams = useCallback(() => {
    return {
      dateField: dateFilter.dateField,
      from: dateFilter.from?.toISOString(),
      to: dateFilter.to?.toISOString()
    };
  }, [dateFilter]);

  const hasActiveFilter = !!(dateFilter.from || dateFilter.to);

  return {
    dateFilter,
    updateDateFilter,
    clearDateFilter,
    getFilterParams,
    hasActiveFilter
  };
};
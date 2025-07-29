import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface UseVirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getItemHeight?: (index: number) => number;
}

export const useVirtualization = <T,>(
  items: T[],
  options: UseVirtualizationOptions
) => {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    getItemHeight
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calcular índices visíveis de forma otimizada
  const visibleRange = useMemo(() => {
    if (getItemHeight) {
      // Para alturas variáveis (mais complexo)
      let totalHeight = 0;
      let startIndex = 0;
      let endIndex = 0;

      // Encontrar startIndex
      for (let i = 0; i < items.length; i++) {
        const height = getItemHeight(i);
        if (totalHeight + height > scrollTop) {
          startIndex = i;
          break;
        }
        totalHeight += height;
      }

      // Encontrar endIndex
      totalHeight = 0;
      for (let i = startIndex; i < items.length; i++) {
        totalHeight += getItemHeight(i);
        if (totalHeight > containerHeight) {
          endIndex = i + 1;
          break;
        }
      }

      return {
        startIndex: Math.max(0, startIndex - overscan),
        endIndex: Math.min(items.length, endIndex + overscan)
      };
    } else {
      // Para altura fixa (mais simples e rápido)
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        items.length,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      );

      return {
        startIndex: Math.max(0, startIndex - overscan),
        endIndex: Math.min(items.length, endIndex + overscan)
      };
    }
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan, getItemHeight]);

  // Itens visíveis
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    }));
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // Altura total da lista
  const totalHeight = useMemo(() => {
    if (getItemHeight) {
      return items.reduce((total, _, index) => total + getItemHeight(index), 0);
    }
    return items.length * itemHeight;
  }, [items.length, itemHeight, getItemHeight]);

  // Offset do primeiro item visível
  const offsetY = useMemo(() => {
    if (getItemHeight) {
      let offset = 0;
      for (let i = 0; i < visibleRange.startIndex; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    }
    return visibleRange.startIndex * itemHeight;
  }, [visibleRange.startIndex, itemHeight, getItemHeight]);

  // Handler de scroll otimizado
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Função para rolar para um item específico
  const scrollToItem = useCallback((index: number) => {
    if (!scrollElementRef.current) return;

    let offset = 0;
    if (getItemHeight) {
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
    } else {
      offset = index * itemHeight;
    }

    scrollElementRef.current.scrollTo({
      top: offset,
      behavior: 'smooth'
    });
  }, [itemHeight, getItemHeight]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    scrollToItem,
    scrollElementRef
  };
};
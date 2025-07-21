import { useState, useEffect } from 'react';

interface TicketTimeConfig {
  'P0': number; // 4 horas
  'P1': number; // 24 horas  
  'P2': number; // 3 dias úteis
  'P3': number; // 7 dias úteis
}

const TICKET_TIME_LIMITS: TicketTimeConfig = {
  'P0': 4 * 60 * 60 * 1000, // 4 horas em ms
  'P1': 24 * 60 * 60 * 1000, // 24 horas em ms
  'P2': 3 * 24 * 60 * 60 * 1000, // 3 dias em ms
  'P3': 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
};

export const useTicketCountdown = (dataCriacao: string, criticidade: string) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const startTime = new Date(dataCriacao).getTime();
    const timeLimit = TICKET_TIME_LIMITS[criticidade as keyof TicketTimeConfig] || TICKET_TIME_LIMITS['P3'];
    const deadline = startTime + timeLimit;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = deadline - now;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
      } else {
        setTimeRemaining(remaining);
        setIsExpired(false);
      }
    };

    // Atualizar imediatamente
    updateCountdown();

    // Atualizar a cada segundo
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [dataCriacao, criticidade]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getUrgencyLevel = () => {
    if (isExpired) return 'expired';
    
    const totalTime = TICKET_TIME_LIMITS[criticidade as keyof TicketTimeConfig] || TICKET_TIME_LIMITS['P3'];
    const percentageRemaining = (timeRemaining / totalTime) * 100;
    
    if (percentageRemaining <= 10) return 'critical';
    if (percentageRemaining <= 25) return 'warning';
    return 'normal';
  };

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    urgencyLevel: getUrgencyLevel()
  };
};
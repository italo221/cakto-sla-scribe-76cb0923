import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fade-in");

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("fade-out");
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === "fade-out") {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("fade-in");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [transitionStage, location]);

  return (
    <div
      className={`content-fade-in macos-scrollbar h-full transition-opacity duration-200 ${
        transitionStage === "fade-out" ? "opacity-0" : "opacity-100"
      }`}
      key={displayLocation.pathname}
    >
      {children}
    </div>
  );
}
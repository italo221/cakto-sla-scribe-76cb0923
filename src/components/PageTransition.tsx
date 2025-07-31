import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="macos-scrollbar h-full">
      {children}
    </div>
  );
}
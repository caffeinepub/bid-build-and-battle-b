import React, { useEffect, useRef, useState } from 'react';

interface BidHighlightProps {
  children: React.ReactNode;
  trigger: unknown;
  className?: string;
}

export default function BidHighlight({ children, trigger, className = '' }: BidHighlightProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (prevTrigger.current !== trigger && trigger !== undefined) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 800);
      prevTrigger.current = trigger;
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={`transition-all duration-300 ${isFlashing ? 'animate-bid-flash' : ''} ${className}`}>
      {children}
    </div>
  );
}

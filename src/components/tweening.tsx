
// --- Smart Animation Components ---

import { useEffect, useRef, useState } from "react";

// A hook that counts from 'start' to 'end' over 'duration'
export const useCounter = (end: number, duration = 1500) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = countRef.current; // Start from current visual value
    const change = end - startValue;

    if (change === 0) return;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // EaseOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);

      const current = startValue + (change * ease);
      setCount(current);
      countRef.current = current;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure exact final value
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
};

// Component that identifies numbers in a string and animates them individually
export const SmartAnimatedValue = ({ value }: { value: string | number }) => {
  const strValue = String(value);

  // Split by numbers (integer or float)
  // Regex captures: (numbers) and (non-numbers)
  const parts = strValue.split(/([\d]+\.?[\d]*)/);

  return (
    <span className="inline-flex items-baseline">
      {parts.map((part, i) => {
        const isNumber = !isNaN(parseFloat(part)) && part.trim() !== '';

        if (isNumber) {
          return <AnimatedNumber key={i} target={parseFloat(part)} originalStr={part} />;
        }
        return <span key={i} className="whitespace-pre">{part}</span>;
      })}
    </span>
  );
};

// Helper for the number part
const AnimatedNumber = ({ target, originalStr }: { target: number, originalStr: string }) => {
  const current = useCounter(target);

  // Preserve decimal places if original had them
  const hasDecimals = originalStr.includes('.');
  const decimals = hasDecimals ? originalStr.split('.')[1].length : 0;

  return <span className="tabular-nums">{current.toFixed(decimals)}</span>;
};

// Component for Text Transitions (Up/Down)
const AnimatedText = ({ text, className }: { text: string, className?: string }) => {
  return (
    <span key={text} className={`animate-in fade-in slide-in-from-bottom-1 duration-[1500ms] inline-block ${className}`}>
      {text}
    </span>
  );
};
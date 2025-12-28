import { useEffect, useRef, useState } from 'react';

export default function FadeInOnScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted on client to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.2, // Adjust how much should be visible to trigger fade
      }
    );

    const node = ref.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [isMounted]);

  // On server and initial client render, show content without animation
  // After mount, apply animation classes
  return (
    <div
      ref={ref}
      className={`transition-all duration-[1500ms] ease-out transform ${
        !isMounted || isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {children}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 350);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }
      className="fixed bottom-8 right-8 z-50 rounded-xl border border-cyan-400/30 bg-black/70 backdrop-blur-md p-3 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all duration-300 hover:scale-110 hover:bg-cyan-500 hover:text-white"
    >
      <ChevronUp size={20} />
    </button>
  );
}
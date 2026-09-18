"use client";

import { useEffect, useRef, useState } from "react";

// Chronometre affiche dans les boutons qui declenchent un appel IA (dialogue,
// recherche de sources, lancement de veille) - redemarre a 0 a chaque
// passage a "actif", s'arrete des que "actif" repasse a false.
export function useChrono(actif: boolean): number {
  const [secondes, setSecondes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (actif) {
      setSecondes(0);
      intervalRef.current = setInterval(() => setSecondes((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actif]);

  return secondes;
}

export function formaterDuree(secondes: number): string {
  if (secondes < 60) return `${secondes}s`;
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

"use client";

import { useEffect, useState } from "react";

// Chronometre le temps ecoule pendant qu'un traitement tourne (ex :
// generation d'un brouillon via Ollama), mis a jour toutes les secondes.
export function useMinuteur(actif: boolean): string {
  const [secondes, setSecondes] = useState(0);

  useEffect(() => {
    if (!actif) {
      setSecondes(0);
      return;
    }
    const debut = Date.now();
    const intervalle = setInterval(() => {
      setSecondes(Math.floor((Date.now() - debut) / 1000));
    }, 1000);
    return () => clearInterval(intervalle);
  }, [actif]);

  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return minutes > 0 ? `${minutes} min ${String(reste).padStart(2, "0")} s` : `${secondes} s`;
}

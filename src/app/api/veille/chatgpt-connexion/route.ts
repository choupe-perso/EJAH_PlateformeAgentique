// Ouvre une fenetre de navigateur VISIBLE pour que l'utilisateur se
// connecte lui-meme a ChatGPT (EXG-005 : aucune saisie automatisee
// d'identifiant). Plateforme locale : le "serveur" est la machine de
// l'utilisateur, ouvrir une fenetre ici est equivalent a le faire
// localement.

import { NextResponse } from "next/server";
import { ouvrirPourConnexionManuelle } from "@/integrations/chatgptWeb/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Ne pas attendre la fermeture de la fenetre : on renvoie tout de
    // suite, l'utilisateur se connecte a son rythme dans la fenetre ouverte.
    void ouvrirPourConnexionManuelle();
    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return NextResponse.json(
      { ok: false, erreurs: [erreur instanceof Error ? erreur.message : "Impossible d'ouvrir la fenêtre."] },
      { status: 500 }
    );
  }
}

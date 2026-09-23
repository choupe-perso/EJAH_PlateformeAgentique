/**
 * Cas d'usage "agent anonymizer" : orchestre l'appel technique
 * (integrations/python-agent-runtime.ts) et applique les politiques
 * propres à EJAH que le paquet Python ne connaît pas (gate d'accès
 * "consultant ADBI", avertissement légal de non-garantie de résultat -
 * voir python/agents/anonymizer/README.md section "ce que ce paquet
 * n'implémente pas").
 */
import {
  executePythonAgent,
  listPythonAgents,
  downloadPythonAgentArtifact,
  type PythonAgentSummary,
} from "@/integrations/python-agent-runtime";

const AGENT_ID = "anonymizer";

export const LEGAL_DISCLAIMER =
  "La détection automatisée de données personnelles n'est ni exhaustive ni exempte d'erreur. Vérifiez toujours le résultat avant toute diffusion.";

export async function getAnonymizerSummary(): Promise<PythonAgentSummary> {
  const agents = await listPythonAgents();
  const agent = agents.find((a) => a.id === AGENT_ID);
  if (!agent) {
    throw new Error(
      `Agent '${AGENT_ID}' non trouvé sur la gateway Python - vérifiez qu'il est bien installé sous python/agents/.`
    );
  }
  return agent;
}

export interface AnonymizerFileInput {
  filename: string;
  data: Buffer;
  contentType?: string;
}

export interface RunAnonymizerParams {
  command: "inspect" | "anonymize" | "deanonymize";
  consentAdbi: boolean;
  consentDisclaimer: boolean;
  documents: AnonymizerFileInput[];
  vault?: AnonymizerFileInput;
  passphrase?: string;
  irreversible?: boolean;
}

export interface AnonymizerFileResult {
  input: string;
  entitiesCount?: number;
  error: string | null;
  downloadUrl?: string | null;
}

export interface RunAnonymizerResult {
  command: string;
  message: string;
  results: AnonymizerFileResult[];
  vaultDownloadUrl?: string | null;
}

export async function runAnonymizerCommand(
  params: RunAnonymizerParams
): Promise<RunAnonymizerResult> {
  if (!params.consentAdbi) {
    throw new Error(
      "Confirmation requise : \"Êtes-vous un(e) consultant(e) ADBI ?\" doit être cochée."
    );
  }
  if (!params.consentDisclaimer) {
    throw new Error("L'avertissement légal doit être coché avant toute utilisation.");
  }
  if (params.documents.length === 0) {
    throw new Error("Au moins un document est requis.");
  }

  const raw = await executePythonAgent(AGENT_ID, {
    command: params.command,
    fields: {
      passphrase: params.passphrase,
      irreversible: params.irreversible,
    },
    files: [
      ...params.documents.map((doc) => ({
        field: "documents",
        filename: doc.filename,
        data: doc.data,
        contentType: doc.contentType,
      })),
      ...(params.vault
        ? [
            {
              field: "vault",
              filename: params.vault.filename,
              data: params.vault.data,
              contentType: params.vault.contentType,
            },
          ]
        : []),
    ],
  });

  // Ré-écrit les URLs de téléchargement de la gateway (127.0.0.1:9010, non
  // joignable depuis le navigateur) vers notre propre route de proxy.
  const proxy = (gatewayUrl: string) =>
    `/api/agents/anonymizer/download?path=${encodeURIComponent(gatewayUrl)}`;

  return {
    command: raw.command,
    message: raw.message,
    results: raw.results.map((r) => ({
      input: r.input.split(/[/\\]/).pop() ?? r.input,
      entitiesCount: r.entities_count,
      error: r.error,
      downloadUrl: r.download_url ? proxy(r.download_url) : null,
    })),
    vaultDownloadUrl: raw.vault_download_url ? proxy(raw.vault_download_url) : null,
  };
}

export async function downloadAnonymizerArtifact(gatewayPath: string): Promise<Buffer> {
  if (!gatewayPath.startsWith(`/agents/${AGENT_ID}/download/`)) {
    throw new Error("Chemin de téléchargement invalide.");
  }
  return downloadPythonAgentArtifact(gatewayPath);
}

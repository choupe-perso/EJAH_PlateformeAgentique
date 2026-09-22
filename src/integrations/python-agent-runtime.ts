/**
 * Contrat d'accès technique à la gateway locale des agents Python
 * (python/gateway/, voir docs/ARCHITECTURE.md section 5bis). Un seul point
 * d'intégration pour tous les agents Python, quel que soit leur nombre :
 * pas de logique métier ici (aucune interprétation propre à un agent en
 * particulier), uniquement l'appel HTTP générique décrit par le
 * contract.yaml de chaque agent.
 *
 * Si la gateway n'est pas joignable, l'appel échoue explicitement - aucun
 * repli implicite vers un autre mécanisme (règle EJAH : pas de changement
 * implicite de moteur).
 */

export interface PythonAgentAccessControl {
  gate_question: string;
  gate_required_answer: string;
}

export interface PythonAgentSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  commands: string[];
  access_control?: PythonAgentAccessControl | null;
}

export interface PythonAgentFileInput {
  /** Nom du champ attendu par le contract.yaml de l'agent (ex. "documents", "vault"). */
  field: string;
  filename: string;
  data: Buffer | Blob;
  contentType?: string;
}

export interface PythonAgentExecuteOptions {
  command: string;
  fields?: Record<string, string | boolean | undefined | null>;
  files?: PythonAgentFileInput[];
}

export interface PythonAgentFileResult {
  input: string;
  entities_count?: number;
  error: string | null;
  download_url?: string | null;
}

export interface PythonAgentExecuteResult {
  command: string;
  message: string;
  results: PythonAgentFileResult[];
  vault_download_url?: string | null;
}

function getGatewayBaseUrl(): string {
  const url = process.env.PYTHON_AGENT_GATEWAY_URL;
  if (!url) {
    throw new Error(
      "PYTHON_AGENT_GATEWAY_URL n'est pas defini dans .env.local - la gateway des agents Python n'est pas configuree pour cet environnement."
    );
  }
  return url.replace(/\/$/, "");
}

async function parseErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (body?.detail) return body.detail;
  } catch {
    // ignore, on retombe sur le statut HTTP brut
  }
  return `${response.status} ${response.statusText}`;
}

export async function listPythonAgents(): Promise<PythonAgentSummary[]> {
  const base = getGatewayBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/agents`);
  } catch (cause) {
    throw new Error(
      `Gateway agents Python injoignable sur ${base} - est-elle demarree ?`,
      { cause }
    );
  }
  if (!response.ok) {
    throw new Error(`Echec de listage des agents Python : ${await parseErrorDetail(response)}`);
  }
  return (await response.json()) as PythonAgentSummary[];
}

export async function executePythonAgent(
  agentId: string,
  options: PythonAgentExecuteOptions
): Promise<PythonAgentExecuteResult> {
  const base = getGatewayBaseUrl();

  const form = new FormData();
  form.append("command", options.command);
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    if (value === undefined || value === null) continue;
    form.append(key, typeof value === "boolean" ? String(value) : value);
  }
  for (const file of options.files ?? []) {
    const blob =
      file.data instanceof Blob
        ? file.data
        : new Blob([new Uint8Array(file.data)], {
            type: file.contentType ?? "application/octet-stream",
          });
    form.append(file.field, blob, file.filename);
  }

  let response: Response;
  try {
    response = await fetch(`${base}/agents/${encodeURIComponent(agentId)}/execute`, {
      method: "POST",
      body: form,
    });
  } catch (cause) {
    throw new Error(
      `Gateway agents Python injoignable sur ${base} - est-elle demarree ?`,
      { cause }
    );
  }

  if (!response.ok) {
    throw new Error(`Echec d'execution de l'agent '${agentId}' : ${await parseErrorDetail(response)}`);
  }
  return (await response.json()) as PythonAgentExecuteResult;
}

/** Télécharge un artefact produit par un agent (download_url renvoyé par executePythonAgent). */
export async function downloadPythonAgentArtifact(downloadUrl: string): Promise<Buffer> {
  const base = getGatewayBaseUrl();
  const url = downloadUrl.startsWith("http") ? downloadUrl : `${base}${downloadUrl}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(`Gateway agents Python injoignable sur ${base} - est-elle demarree ?`, { cause });
  }
  if (!response.ok) {
    throw new Error(`Echec de telechargement (${downloadUrl}) : ${await parseErrorDetail(response)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

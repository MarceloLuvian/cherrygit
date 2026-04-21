const SHA_RE = /^[0-9a-f]{4,40}$/i;
const REPO_FULLNAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// Ref-name rules: no spaces, no double-dots, no leading '-', no control chars.
// Keep permissive but block shell injection-ish characters.
const BRANCH_RE = /^(?!-)(?!.*\.\.)[A-Za-z0-9._\-/]+$/;

export function validateSha(sha: string): string {
  if (typeof sha !== 'string' || !SHA_RE.test(sha)) {
    throw new Error(`SHA invalido: ${sha}`);
  }
  return sha;
}

export function validateRepoFullName(fullName: string): string {
  if (typeof fullName !== 'string' || !REPO_FULLNAME_RE.test(fullName)) {
    throw new Error(`Nombre de repo invalido: ${fullName}`);
  }
  return fullName;
}

export function validateBranchName(branch: string): string {
  if (typeof branch !== 'string' || !BRANCH_RE.test(branch) || branch.length > 255) {
    throw new Error(`Nombre de rama invalido: ${branch}`);
  }
  return branch;
}

export function validateIsoDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error(`Fecha invalida (esperado YYYY-MM-DD): ${d}`);
  }
  return d;
}

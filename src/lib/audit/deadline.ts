import { AsyncLocalStorage } from "node:async_hooks";
const deadlines = new AsyncLocalStorage<AbortSignal>();
export function auditSignal(
  local?: AbortSignal | null,
): AbortSignal | undefined {
  const deadline = deadlines.getStore();
  return deadline && local
    ? AbortSignal.any([deadline, local])
    : (deadline ?? local ?? undefined);
}
export function withAuditDeadline<T>(work: () => Promise<T>): Promise<T> {
  return deadlines.run(AbortSignal.timeout(50_000), work);
}

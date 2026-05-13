/**
 * Sera UUID & Encoding Utilities (Frontend)
 */

export function uuidStringToBigInt(uuid: string): bigint {
  return BigInt(`0x${uuid.replace(/-/g, '')}`);
}

export function encodeStandaloneUuid(orderId: string, executorId: number): string {
  const raw = uuidStringToBigInt(orderId);
  const group = raw >> 16n;
  const result = (BigInt(executorId) << 252n) | (raw << 124n) | (group << 12n);
  return result.toString();
}

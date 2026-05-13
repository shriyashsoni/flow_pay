/**
 * Sera UUID & Encoding Utilities
 * Handles the composite uint256 generation for Sera Orders
 */

export function uuidStringToBigInt(uuid: string): bigint {
  return BigInt(`0x${uuid.replace(/-/g, '')}`);
}

/**
 * Generates the uuid_int required by Sera
 * Layout: [255:252] executor_id | [251:124] full UUID4 bits | [123:12] group_id | [11:0] leg_id
 */
export function encodeStandaloneUuid(orderId: string, executorId: number): string {
  const raw = uuidStringToBigInt(orderId);
  const group = raw >> 16n;
  const result = (BigInt(executorId) << 252n) | (raw << 124n) | (group << 12n);
  return result.toString();
}

/**
 * Encodes UUID for Virtual Liquidity Batches
 */
export function encodeVlUuid(orderId: string, executorId: number, legId: number, groupOrderId: string): string {
  const raw = uuidStringToBigInt(orderId);
  const group = uuidStringToBigInt(groupOrderId) >> 16n;
  const result = (BigInt(executorId) << 252n) | (raw << 124n) | (group << 12n) | BigInt(legId);
  return result.toString();
}

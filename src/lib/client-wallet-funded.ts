import { Transaction } from "@/models/Transaction";

/** True once the client has completed at least one wallet top-up (Konnect / Paymee / demo POST). */
export async function hasClientCompletedTopup(clientUserId: string): Promise<boolean> {
  const row = await Transaction.findOne({ type: "TOPUP", toUserId: clientUserId }).select("_id").lean();
  return !!row;
}

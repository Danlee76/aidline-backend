import { rpc, scValToNative } from '@stellar/stellar-sdk';

interface EventBase {
  eventId: string;
  ledger: number;
  txHash: string;
  closedAt: Date;
}

export type AidlineEvent = EventBase &
  (
    | { type: 'campaign_created'; campaignId: bigint }
    | { type: 'donated'; campaignId: bigint; donor: string; amount: bigint }
    | {
        type: 'milestone_released';
        campaignId: bigint;
        index: number;
        amount: bigint;
        proofUri: string;
      }
    | { type: 'campaign_cancelled'; campaignId: bigint }
    | { type: 'refunded'; campaignId: bigint; donor: string; amount: bigint }
    | { type: 'verifier_updated'; verifier: string; active: boolean }
    | { type: 'verifier_reassigned'; campaignId: bigint; oldVerifier: string; newVerifier: string }
  );

/**
 * Turns a raw RPC event into a typed Aidline event. Returns null for events
 * this indexer does not know about, so new contract events never crash it.
 */
export function decodeEvent(ev: rpc.Api.EventResponse): AidlineEvent | null {
  const topics = ev.topic.map((t) => scValToNative(t));
  const data = (scValToNative(ev.value) ?? {}) as Record<string, unknown>;
  const base: EventBase = {
    eventId: ev.id,
    ledger: ev.ledger,
    txHash: ev.txHash,
    closedAt: new Date(ev.ledgerClosedAt),
  };

  switch (topics[0]) {
    case 'created':
    case 'campaign_created':
      return { ...base, type: 'campaign_created', campaignId: BigInt(topics[1]) };
    case 'donated':
      return {
        ...base,
        type: 'donated',
        campaignId: BigInt(topics[1]),
        donor: String(topics[2]),
        amount: BigInt(data.amount as bigint),
      };
    case 'released':
    case 'milestone_released':
      return {
        ...base,
        type: 'milestone_released',
        campaignId: BigInt(topics[1]),
        index: topics[0] === 'released' ? Number(topics[2]) : Number(data.index),
        amount: BigInt(topics[0] === 'released' ? (data as unknown as unknown[])[0] : data.amount as bigint),
        proofUri: String(topics[0] === 'released' ? (data as unknown as unknown[])[1] : data.proof_uri),
      };
    case 'canceled':
    case 'campaign_cancelled':
      return { ...base, type: 'campaign_cancelled', campaignId: BigInt(topics[1]) };
    case 'refunded':
      return {
        ...base,
        type: 'refunded',
        campaignId: BigInt(topics[1]),
        donor: String(topics[2]),
        amount: BigInt(data.amount as bigint),
      };
    case 'verifier':
    case 'verifier_updated':
      return {
        ...base,
        type: 'verifier_updated',
        verifier: String(topics[1]),
        active: Boolean(topics[0] === 'verifier' ? scValToNative(ev.value) : data.active),
      };
    case 'vf_reass': {
      const values = scValToNative(ev.value) as unknown[];
      return { ...base, type: 'verifier_reassigned', campaignId: BigInt(topics[1]), oldVerifier: String(values[0]), newVerifier: String(values[1]) };
    }
    default:
      return null;
  }
}

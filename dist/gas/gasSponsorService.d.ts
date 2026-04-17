import { Horizon, Keypair, xdr } from '@stellar/stellar-sdk';
/**
 * Build a Stellar transaction with the gas sponsor as the fee source,
 * sign with both the sponsor keypair and any additional operation signers,
 * then submit to Horizon.
 *
 * The sponsor account pays all network fees — users never need XLM.
 * Requirements: 6.2
 *
 * @param operations - Stellar XDR operations to include in the transaction
 * @param signers    - Additional keypairs that must sign (e.g. the operation source account)
 * @returns The submitted transaction hash
 */
export declare function buildAndSubmit(operations: xdr.Operation[], signers: Keypair[]): Promise<string>;
/**
 * Fetch the sponsor account's current XLM balance.
 * Requirements: 6.4
 */
export declare function getXlmBalance(): Promise<string>;
/**
 * Check the sponsor XLM reserve and emit an alert if below the minimum threshold.
 * Requirements: 6.4
 */
export declare function checkXlmReserve(server?: Horizon.Server): Promise<void>;
//# sourceMappingURL=gasSponsorService.d.ts.map
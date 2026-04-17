import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { config } from '../config/env';

const STELLAR_NETWORK_PASSPHRASE =
  config.stellarNetwork === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

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
export async function buildAndSubmit(
  operations: xdr.Operation[],
  signers: Keypair[]
): Promise<string> {
  const server = new Horizon.Server(config.stellarHorizonUrl);
  const sponsorKeypair = Keypair.fromSecret(config.gasSponsorSecret);

  // Load the sponsor account to get the current sequence number
  const sponsorAccount = await server.loadAccount(config.gasSponsorAddress);

  const txBuilder = new TransactionBuilder(sponsorAccount, {
    fee: '100', // base fee in stroops
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  });

  for (const op of operations) {
    txBuilder.addOperation(op);
  }

  txBuilder.setTimeout(30);
  const transaction = txBuilder.build();

  // Sponsor always signs (fee source)
  transaction.sign(sponsorKeypair);

  // Additional signers (e.g. the account performing the operation)
  for (const signer of signers) {
    transaction.sign(signer);
  }

  const result = await server.submitTransaction(transaction);

  // Check XLM reserve after each submission (Requirement 6.4)
  checkXlmReserve(server).catch((err) => {
    console.error('[GasSponsor] Reserve check failed:', err);
  });

  return result.hash;
}

/**
 * Fetch the sponsor account's current XLM balance.
 * Requirements: 6.4
 */
export async function getXlmBalance(): Promise<string> {
  const server = new Horizon.Server(config.stellarHorizonUrl);
  const account = await server.loadAccount(config.gasSponsorAddress);

  const nativeBalance = account.balances.find(
    (b) => b.asset_type === 'native'
  );

  return nativeBalance?.balance ?? '0';
}

/**
 * Check the sponsor XLM reserve and emit an alert if below the minimum threshold.
 * Requirements: 6.4
 */
export async function checkXlmReserve(server?: Horizon.Server): Promise<void> {
  const horizonServer = server ?? new Horizon.Server(config.stellarHorizonUrl);
  const account = await horizonServer.loadAccount(config.gasSponsorAddress);

  const nativeBalance = account.balances.find(
    (b) => b.asset_type === 'native'
  );

  const balance = parseFloat(nativeBalance?.balance ?? '0');
  const minReserve = config.minXlmReserve;

  if (balance < minReserve) {
    const message =
      `[GasSponsor] ALERT: XLM reserve low! ` +
      `Current: ${balance} XLM, Minimum: ${minReserve} XLM`;

    console.error(message);
    await sendOperatorAlert(balance, minReserve);
  }
}

/**
 * Send an alert email to platform operators when XLM reserve is low.
 * Uses a simple SMTP-style log for now; replace with a real email client as needed.
 * Requirements: 6.4
 */
async function sendOperatorAlert(
  currentBalance: number,
  minReserve: number
): Promise<void> {
  // In production, integrate with an email provider (e.g. SendGrid, SES).
  // For now, we emit a structured log that can be picked up by alerting systems.
  console.error(
    JSON.stringify({
      level: 'CRITICAL',
      service: 'GasSponsor',
      event: 'xlm_reserve_low',
      currentBalance,
      minReserve,
      message: `Gas sponsor XLM balance (${currentBalance}) is below minimum reserve (${minReserve}). Top up required.`,
      timestamp: new Date().toISOString(),
    })
  );
}

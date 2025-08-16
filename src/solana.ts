import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { CONFIG } from './config';

export function getConnection(): Connection {
  return new Connection(CONFIG.heliusRpc, { commitment: 'confirmed' });
}

export function getKeypair(): Keypair {
  const secret = bs58.decode(CONFIG.walletPrivateKeyBase58);
  return Keypair.fromSecretKey(secret);
}

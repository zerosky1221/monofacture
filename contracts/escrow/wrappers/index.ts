/**
 * Monofacture Escrow Contract Wrappers
 *
 * Export all contract wrappers for use in backend and tests.
 */

export {
  EscrowDeal,
  EscrowStatus,
  OP,
  buildEscrowDataCell,
  generateTonConnectPayload,
  generatePaymentDeepLink,
  type EscrowDealConfig,
  type EscrowData,
} from './EscrowDeal';

export {
  EscrowFactory,
  FACTORY_OP,
  buildFactoryDataCell,
  type EscrowFactoryConfig,
  type CreateDealParams,
} from './EscrowFactory';

export {
  TolkEscrowDeal,
  EscrowStatus as TolkEscrowStatus,
  OP as TOLK_OP,
  buildTolkEscrowDataCell,
  generateTonConnectPayload as tolkGenerateTonConnectPayload,
  generatePaymentDeepLink as tolkGeneratePaymentDeepLink,
  type TolkEscrowDealConfig,
  type EscrowData as TolkEscrowData,
} from './TolkEscrowDeal';

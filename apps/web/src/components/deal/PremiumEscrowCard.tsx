import { motion } from 'framer-motion';
import { Shield, ExternalLink } from '../icons';
import { ESCROW_STATUS_COLORS } from './constants';
import { cardVariants, pulseAnimation, scaleVariants } from './animations';
import { fromNano } from '@ton/core';
import { useTranslation } from '../../i18n';

interface EscrowData {
  status: string;
  escrowWalletAddress?: string;
  totalAmount?: string;
  amount?: string;
  platformFee?: string;
  expiresAt?: string;
}

interface PremiumEscrowCardProps {
  escrow: EscrowData;
  isTestnet?: boolean;
}

function formatTon(nanoTon: string | undefined): string {
  if (!nanoTon) return '0';
  try {
    return fromNano(BigInt(nanoTon));
  } catch {
    return nanoTon;
  }
}

export function PremiumEscrowCard({ escrow, isTestnet = true }: PremiumEscrowCardProps) {
  const { t } = useTranslation();
  const statusColors = ESCROW_STATUS_COLORS[escrow.status] || ESCROW_STATUS_COLORS.PENDING;
  const explorerUrl = isTestnet
    ? `https://testnet.tonviewer.com/${escrow.escrowWalletAddress}`
    : `https://tonviewer.com/${escrow.escrowWalletAddress}`;

  const totalAmount = parseFloat(formatTon(escrow.totalAmount)) || 0;
  const publisherAmount = parseFloat(formatTon(escrow.amount)) || 0;
  const progressPercent = totalAmount > 0 ? (publisherAmount / totalAmount) * 100 : 95;

  return (
    <motion.div variants={cardVariants}>
      <div className="relative p-[1px] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #3390ec 0%, #3390ec 100%)',
          }}
        />

        <div className="relative bg-black rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={pulseAnimation}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(51,144,236,0.2) 0%, rgba(51,144,236,0.2) 100%)',
              }}
            >
              <Shield className="w-5 h-5 text-[#3390ec]" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{t('escrow.title')}</h3>
              <p className="text-xs text-white/50">{t('escrow.securedBy')}</p>
            </div>
            <motion.span
              key={escrow.status}
              variants={scaleVariants}
              initial="hidden"
              animate="visible"
              className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
            >
              {escrow.status}
            </motion.span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">{t('escrow.totalLocked')}</span>
              <span className="text-white font-bold text-lg">
                {formatTon(escrow.totalAmount)} TON
              </span>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #22C55E 0%, #3390ec 100%)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-[#22C55E]">
                  {t('escrow.publisher')} {formatTon(escrow.amount)} TON
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white/30" />
                <span className="text-white/50">
                  {t('escrow.fee')} {formatTon(escrow.platformFee)} TON
                </span>
              </div>
            </div>

            {escrow.expiresAt && (
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-white/60">{t('escrow.deadline')}</span>
                <span className="text-white/80">
                  {new Date(escrow.expiresAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {escrow.escrowWalletAddress && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/5 rounded-xl text-[#3390ec] hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">{t('escrow.viewOnBlockchain')}</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default PremiumEscrowCard;

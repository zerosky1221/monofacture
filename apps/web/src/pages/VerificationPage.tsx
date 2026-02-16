import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Shield, ShieldCheck, Clock, CheckCircle, AlertCircle } from '../components/icons';
import { verificationApi } from '../api/verification';
import type { VerificationRequest } from '../api/verification';
import { useTranslation } from '../i18n';

const TIER_COLORS: Record<string, string> = {
  NONE: '#666',
  BASIC: '#888',
  VERIFIED: '#3390ec',
  PREMIUM: '#F59E0B',
  ENTERPRISE: '#22C55E',
};

const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
  PENDING: { icon: Clock, color: '#F59E0B' },
  APPROVED: { icon: CheckCircle, color: '#22C55E' },
  REJECTED: { icon: AlertCircle, color: '#EF4444' },
};

export function VerificationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const TIER_INFO: Record<string, { label: string; color: string; description: string }> = {
    NONE: { label: t('verification.tierNone'), color: '#666', description: t('verification.tierNoneDesc') },
    BASIC: { label: t('verification.tierBasic'), color: '#888', description: t('verification.tierBasicDesc') },
    VERIFIED: { label: t('verification.tierVerified'), color: '#3390ec', description: t('verification.tierVerifiedDesc') },
    PREMIUM: { label: t('verification.tierPremium'), color: '#F59E0B', description: t('verification.tierPremiumDesc') },
    ENTERPRISE: { label: t('verification.tierEnterprise'), color: '#22C55E', description: t('verification.tierEnterpriseDesc') },
  };

  const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    PENDING: { icon: Clock, color: '#F59E0B', label: t('verification.statusPending') },
    APPROVED: { icon: CheckCircle, color: '#22C55E', label: t('verification.statusApproved') },
    REJECTED: { icon: AlertCircle, color: '#EF4444', label: t('verification.statusRejected') },
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ['verification-requests'],
    queryFn: verificationApi.getMyRequests,
  });

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('verification.title')}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">{t('verification.tiers')}</h3>
          <div className="space-y-3">
            {Object.entries(TIER_INFO).filter(([k]) => k !== 'NONE').map(([key, info]) => (
              <div key={key} className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: info.color }} strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-white font-medium">{info.label}</p>
                  <p className="text-xs text-[#666]">{info.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-sm font-medium text-[#999] uppercase tracking-wider">{t('verification.myRequests')}</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : requests?.length ? (
          <div className="space-y-2">
            {requests.map((req: VerificationRequest) => {
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusCfg.icon;
              const tierInfo = TIER_INFO[req.tier] || TIER_INFO.NONE;

              return (
                <div key={req.id} className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: tierInfo.color }} strokeWidth={1.5} />
                      <p className="text-white font-medium text-sm">{tierInfo.label} — {t('verification.verificationTitle')}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className="w-3.5 h-3.5" style={{ color: statusCfg.color }} strokeWidth={1.5} />
                      <span className="text-xs font-medium" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                    </div>
                  </div>
                  {req.channel && (
                    <p className="text-[#999] text-xs">{t('verification.channel')} {req.channel.title}</p>
                  )}
                  {req.reviewNotes && req.status === 'REJECTED' && (
                    <p className="text-[#EF4444] text-xs mt-2">{t('verification.reason')} {req.reviewNotes}</p>
                  )}
                  <p className="text-[#666] text-[10px] mt-2">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 text-center">
            <Shield className="w-10 h-10 text-[#666] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-white font-medium mb-1">{t('verification.noRequests')}</p>
            <p className="text-[#666] text-sm">{t('verification.requestFromSettings')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerificationPage;

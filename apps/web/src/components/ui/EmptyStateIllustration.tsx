import { Compass, Package, Bell, Star, Search, Heart, Wallet, AlertTriangle, Users, Megaphone, Globe } from '../icons';
import { Button } from './Button';

type IllustrationType =
  | 'no-channels' | 'no-deals' | 'no-notifications' | 'no-reviews'
  | 'no-results' | 'no-favorites' | 'no-transactions' | 'error'
  | 'offline' | 'no-referrals' | 'no-campaigns';

const ILLUSTRATIONS: Record<IllustrationType, { icon: any; color: string; bgColor: string }> = {
  'no-channels': { icon: Megaphone, color: '#3390ec', bgColor: 'rgba(51,144,236,0.1)' },
  'no-deals': { icon: Package, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' },
  'no-notifications': { icon: Bell, color: '#888', bgColor: 'rgba(136,136,136,0.1)' },
  'no-reviews': { icon: Star, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' },
  'no-results': { icon: Search, color: '#888', bgColor: 'rgba(136,136,136,0.1)' },
  'no-favorites': { icon: Heart, color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)' },
  'no-transactions': { icon: Wallet, color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)' },
  'error': { icon: AlertTriangle, color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)' },
  'offline': { icon: Globe, color: '#888', bgColor: 'rgba(136,136,136,0.1)' },
  'no-referrals': { icon: Users, color: '#3390ec', bgColor: 'rgba(51,144,236,0.1)' },
  'no-campaigns': { icon: Compass, color: '#22C55E', bgColor: 'rgba(34,197,94,0.1)' },
};

interface Props {
  type: IllustrationType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  tips?: string[];
}

export function EmptyStateIllustration({ type, title, description, action, tips }: Props) {
  const config = ILLUSTRATIONS[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ backgroundColor: config.bgColor }}
      >
        <Icon className="w-10 h-10" style={{ color: config.color }} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-[#999] text-sm mb-6 max-w-[260px]">{description}</p>
      {action && (
        <div className="w-full max-w-[280px] mb-6">
          <Button className="w-full" size="lg" onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-[280px] bg-[#111] border border-[#1A1A1A] rounded-xl p-4">
          <p className="text-xs text-[#666] uppercase tracking-wider mb-2">Tips</p>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-[#999] flex items-start gap-2">
                <span className="text-[#666]">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

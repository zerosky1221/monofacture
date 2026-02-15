import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Search,
  CreditCard,
  Package,
  AlertTriangle,
  User,
  Flag,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  Megaphone,
  Users,
  Handshake,
  Wallet,
  ShieldCheck,
  Gift,
  AlertCircle,
} from '../components/icons';
import type { IconProps } from '../components/icons';
import { api } from '../lib/api';
import { formatRelative } from '../lib/date';
import { useTelegram } from '../providers/TelegramProvider';
import { getFaqData, searchFaq, getFaqCount } from '../constants/faq';
import type { FaqSection, FaqItem } from '../constants/faq';
import { Spinner } from '@telegram-tools/ui-kit';
import { useTranslation } from '../i18n';

type TabType = 'help' | 'tickets';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketsResponse {
  data: Ticket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

const QUICK_ACTIONS = [
  { labelKey: 'support.quickAction.paymentIssue', icon: CreditCard, color: 'text-[#EF4444]', category: 'PAYMENT_ISSUE' },
  { labelKey: 'support.quickAction.dealProblem', icon: Package, color: 'text-[#F97316]', category: 'DEAL_PROBLEM' },
  { labelKey: 'support.quickAction.dispute', icon: AlertTriangle, color: 'text-[#F59E0B]', category: 'DISPUTE' },
  { labelKey: 'support.quickAction.reportUser', icon: User, color: 'text-[#EF4444]', category: 'USER_REPORT' },
  { labelKey: 'support.quickAction.reportChannel', icon: Flag, color: 'text-[#EF4444]', category: 'CHANNEL_REPORT' },
  { labelKey: 'support.quickAction.verification', icon: CheckCircle, color: 'text-[#3390ec]', category: 'CHANNEL_VERIFICATION' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-[#3390ec]',
  IN_PROGRESS: 'bg-[#F59E0B]',
  WAITING_USER: 'bg-[#F97316]',
  RESOLVED: 'bg-[#22C55E]',
  CLOSED: 'bg-[#666]',
};

const SECTION_ICONS: Record<string, React.FC<IconProps>> = {
  HelpCircle,
  Megaphone,
  Users,
  Handshake,
  Wallet,
  ShieldCheck,
  Gift,
  AlertCircle,
};

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function FaqAccordionItem({ item, isOpen, onToggle }: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#1A1A1A] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 py-3.5 px-4 text-left active:bg-white/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <span className={`text-[14px] leading-snug pr-2 transition-colors ${isOpen ? 'text-white font-medium' : 'text-[#CCC]'}`}>
          {item.question}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 mt-0.5 text-[#666] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="px-4 pb-4 text-[13px] text-[#999] leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

function FaqSectionCard({ section, openItemId, onToggleItem }: {
  section: FaqSection;
  openItemId: string | null;
  onToggleItem: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = SECTION_ICONS[section.icon] || HelpCircle;

  return (
    <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 active:bg-white/[0.02] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
          <Icon className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white text-[15px] font-medium">{section.title}</p>
          <p className="text-[#666] text-[12px]">{section.items.length} {t('support.questions')}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#666] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-[#1A1A1A]">
          {section.items.map((item) => (
            <FaqAccordionItem
              key={item.id}
              item={item}
              isOpen={openItemId === item.id}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchResults({ query, openItemId, onToggleItem, lang }: {
  query: string;
  openItemId: string | null;
  onToggleItem: (itemId: string) => void;
  lang: string;
}) {
  const { t } = useTranslation();
  const results = searchFaq(query, lang);

  if (results.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 text-center">
        <Search className="w-8 h-8 text-[#666] mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-[#999] text-sm">{t('support.noResults')} "{query}"</p>
        <p className="text-[#666] text-xs mt-1">{t('support.tryDifferent')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider px-1">
        {results.length === 1 ? t('support.resultFound') : t('support.resultsFound', { count: results.length })}
      </p>
      <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
        {results.map((item) => (
          <div key={item.id}>
            <div className="px-4 pt-2">
              <span className="text-[10px] text-[#3390ec] font-medium uppercase tracking-wider">
                {item.sectionTitle}
              </span>
            </div>
            <FaqAccordionItem
              item={item}
              isOpen={openItemId === item.id}
              onToggle={() => onToggleItem(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupportPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const faqData = getFaqData(language);

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: async () => {
      const response = await api.get<TicketsResponse>('/support/tickets');
      return response.data;
    },
  });

  const tickets = ticketsData?.data || [];
  const openTicketCount = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_USER'
  ).length;

  const handleToggleItem = useCallback((itemId: string) => {
    setOpenItemId((prev) => (prev === itemId ? null : itemId));
  }, []);

  const tabs: { key: TabType; label: string; icon: typeof HelpCircle; count?: number }[] = [
    { key: 'help', label: t('support.helpCenter'), icon: HelpCircle },
    { key: 'tickets', label: t('support.myTickets'), icon: MessageSquare, count: openTicketCount },
  ];

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-full pb-4 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('support.title')}</h1>
        </div>
      </div>

      <div className="pb-24">

      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  hapticFeedback('selection');
                  setActiveTab(tab.key);
                }}
                className={`flex-1 h-10 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-black'
                    : 'bg-[#1A1A1A] text-[#999]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-black/20 text-black'
                        : 'bg-[#333] text-[#999]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'help' ? (
          <div className="space-y-5">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t('common.search')} FAQ...`}
                className="w-full h-11 pl-10 pr-4 bg-[#111] border border-[#1A1A1A] rounded-xl text-white text-sm placeholder-[#666] outline-none focus:border-[#333] transition-colors"
              />
            </div>

            {isSearching ? (
              <SearchResults
                query={searchQuery}
                openItemId={openItemId}
                onToggleItem={handleToggleItem}
                lang={language}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {faqData.map((section) => (
                    <FaqSectionCard
                      key={section.id}
                      section={section}
                      openItemId={openItemId}
                      onToggleItem={handleToggleItem}
                    />
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">
                    {t('support.needMoreHelp')}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.category}
                          onClick={() => {
                            hapticFeedback('impact');
                            navigate(`/support/new?category=${action.category}`);
                          }}
                          className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-3 flex flex-col items-center gap-2 active:bg-[#1A1A1A] transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                            <Icon className={`w-5 h-5 ${action.color}`} strokeWidth={1.5} />
                          </div>
                          <span className="text-white text-xs font-medium text-center leading-tight">
                            {t(action.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                hapticFeedback('impact');
                navigate('/support/new');
              }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-white text-black rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
              {t('support.newTicket')}
            </button>

            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="24px" color="secondary" />
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      hapticFeedback('selection');
                      navigate(`/support/tickets/${ticket.id}`);
                    }}
                    className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-left active:bg-[#1A1A1A] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {ticket.subject}
                        </p>
                        <p className="text-[#666] text-xs mt-0.5">
                          #{ticket.ticketNumber} · {formatCategory(ticket.category)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full text-white flex-shrink-0 ${
                          STATUS_COLORS[ticket.status] || 'bg-[#666]'
                        }`}
                      >
                        {formatStatus(ticket.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#666] text-xs">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        <span>{formatRelative(ticket.updatedAt)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-7 h-7 text-[#666]" strokeWidth={1.5} />
                </div>
                <p className="text-white font-medium text-[15px] mb-1">{t('support.myTickets')}</p>
                <p className="text-[#666] text-[13px]">
                  {t('support.contact')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default SupportPage;

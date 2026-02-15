import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Loader2 } from '../icons';
import { chatApi, ChatMessage } from '../../api/chat';
import { useAuth } from '../../hooks/useAuth';
import { useTelegram } from '../../providers/TelegramProvider';
import { Spinner, Input } from '@telegram-tools/ui-kit';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

interface Props {
  dealId: string;
}

function useTemplates() {
  const { t } = useTranslation();
  return [
    t('dealChat.templateQuestion'),
    t('dealChat.templateWhen'),
    t('dealChat.templateApproved'),
    t('dealChat.templateChanges'),
    t('dealChat.templatePayment'),
    t('dealChat.templatePublished'),
  ];
}

export function DealChat({ dealId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hapticFeedback } = useTelegram();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const TEMPLATES = useTemplates();

  const { data, isLoading } = useQuery({
    queryKey: ['chat', dealId],
    queryFn: () => chatApi.getMessages(dealId),
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(dealId, content),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat', dealId] });
    },
    onError: () => toast.error(t('dealChat.failedToSend')),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.items]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    hapticFeedback('impact');
    sendMutation.mutate(trimmed);
  };

  const handleTemplate = (tpl: string) => {
    setMessage(tpl);
    setShowTemplates(false);
  };

  const messages = data?.items || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="24px" color="secondary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#666] text-sm">{t('dealChat.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg: ChatMessage) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.isSystem
                      ? 'bg-[#1A1A1A] text-[#999]'
                      : isMe
                        ? 'bg-white text-black rounded-br-md'
                        : 'bg-[#3390ec]/20 border border-[#3390ec]/30 text-white rounded-bl-md'
                  }`}>
                    {!isMe && !msg.isSystem && msg.sender?.firstName && (
                      <p className="text-[#3390ec] text-xs font-medium mb-1">{msg.sender.firstName}</p>
                    )}
                    <p className={`text-sm leading-relaxed ${isMe ? 'text-black' : msg.isSystem ? 'text-[#999]' : 'text-white'}`}>
                      {msg.content}
                    </p>
                    <p className={`text-[10px] mt-1.5 ${isMe ? 'text-black/40 text-right' : 'text-white/40'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showTemplates && (
        <div className="px-4 pb-2">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-3 space-y-1.5">
            {TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplate(tpl)}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-[#999] hover:bg-[#1A1A1A] transition-colors"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-3 pt-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#1A1A1A] text-[#999] active:scale-95 transition-all"
          >
            <span className="text-lg">+</span>
          </button>
          <div className="flex-1">
            <Input
              value={message}
              onChange={(v) => setMessage(v)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t('dealChat.placeholder')}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              message.trim() ? 'bg-white text-black active:scale-95' : 'bg-[#1A1A1A] text-[#666]'
            }`}
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

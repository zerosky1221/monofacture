import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from '../components/icons';
import { DealChat } from '../components/chat/DealChat';
import { useTranslation } from '../i18n';

export function DealChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!id) return null;

  return (
    <div className="min-h-full flex flex-col page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#3390ec]" strokeWidth={1.5} />
            <h1 className="text-xl font-semibold text-white">{t('dealChat.title')}</h1>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <DealChat dealId={id} />
      </div>
    </div>
  );
}

export default DealChatPage;

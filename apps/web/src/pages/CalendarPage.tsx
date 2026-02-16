import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Package, Clock } from '../components/icons';
import { api } from '../lib/api';
import { useTranslation } from '../i18n';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: deals } = useQuery({
    queryKey: ['calendar-deals', currentYear, currentMonth],
    queryFn: async () => {
      const res = await api.get('/deals/calendar', {
        params: { month: currentMonth + 1, year: currentYear },
      });
      return res.data || [];
    },
  });

  const dealsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    (deals || []).forEach((deal: any) => {
      const date = deal.scheduledPostTime ? new Date(deal.scheduledPostTime).toISOString().split('T')[0] : null;
      if (date) {
        if (!map.has(date)) map.set(date, []);
        map.get(date)!.push(deal);
      }
    });
    return map;
  }, [deals]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const selectedDeals = selectedDate ? dealsByDate.get(selectedDate) || [] : [];

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('calendar.title')}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] rotate-180">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-lg font-semibold text-white">{t(`calendar.months.${currentMonth}`)} {currentYear}</h2>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A]">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[0, 1, 2, 3, 4, 5, 6].map(d => (
              <div key={d} className="text-center text-[10px] text-[#666] font-medium py-1">{t(`calendar.daysShort.${d}`)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasDeals = dealsByDate.has(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                    isSelected ? 'bg-white text-black' :
                    isToday ? 'bg-[#1A1A1A] text-white' :
                    'text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  <span className="font-medium">{day}</span>
                  {hasDeals && !isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3390ec] mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[#999]">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selectedDeals.length > 0 ? (
              selectedDeals.map((deal: any) => (
                <button
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 flex items-center gap-3 text-left active:bg-[#1A1A1A] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3390ec]/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#3390ec]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">#{deal.referenceNumber}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#666]" strokeWidth={1.5} />
                      <span className="text-[#666] text-xs">
                        {deal.scheduledPostTime ? new Date(deal.scheduledPostTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    deal.status === 'COMPLETED' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
                    deal.status === 'POSTED' ? 'bg-[#3390ec]/20 text-[#3390ec]' :
                    'bg-[#F59E0B]/20 text-[#F59E0B]'
                  }`}>
                    {deal.status}
                  </span>
                </button>
              ))
            ) : (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-6 text-center">
                <p className="text-[#666] text-sm">{t('calendar.noDeals')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarPage;

interface ReviewTagsProps {
  tags: string[];
  selectedTags?: string[];
  onToggle?: (tag: string) => void;
  readonly?: boolean;
}

const ADVERTISER_TAGS = [
  'Quality placement',
  'Fast publishing',
  'Good communication',
  'Followed brief',
  'Recommended',
  'Great reach',
];

const CHANNEL_OWNER_TAGS = [
  'Clear brief',
  'Fast payment',
  'Pleasant communication',
  'Interesting content',
  'Recommended',
  'Professional',
];

const CHANNEL_REVIEW_TAGS = [
  'Active audience',
  'Good reach',
  'Real followers',
  'High engagement',
  'Matches description',
  'Fast view growth',
  'Quality audience',
];

export function getTagsForRole(role: 'advertiser' | 'channelOwner' | 'channel') {
  if (role === 'channel') return CHANNEL_REVIEW_TAGS;
  return role === 'advertiser' ? ADVERTISER_TAGS : CHANNEL_OWNER_TAGS;
}

export function ReviewTags({ tags, selectedTags, onToggle, readonly = false }: ReviewTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selectedTags?.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            disabled={readonly}
            onClick={() => onToggle?.(tag)}
            className={`px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-white text-black'
                : readonly
                  ? 'bg-[#1A1A1A] text-[#999] border border-white/5'
                  : 'bg-[#1A1A1A] text-[#999] border border-white/5 hover:border-white/20 active:scale-95'
            } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../api/favorites';
import { useTelegram } from '../providers/TelegramProvider';

export function useFavorites() {
  const queryClient = useQueryClient();
  const { hapticFeedback } = useTelegram();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: favoritesApi.getIds,
    staleTime: 60000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ channelId, isFavorite }: { channelId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await favoritesApi.remove(channelId);
      } else {
        await favoritesApi.add(channelId);
      }
    },
    onMutate: async ({ channelId, isFavorite }) => {
      hapticFeedback('impact');
      await queryClient.cancelQueries({ queryKey: ['favorite-ids'] });
      const previous = queryClient.getQueryData<string[]>(['favorite-ids']);
      queryClient.setQueryData<string[]>(['favorite-ids'], old => {
        if (isFavorite) return old?.filter(id => id !== channelId) || [];
        return [...(old || []), channelId];
      });
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['favorite-ids'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-ids'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const isFavorite = (channelId: string) => favoriteIds.includes(channelId);
  const toggle = (channelId: string) => {
    toggleMutation.mutate({ channelId, isFavorite: isFavorite(channelId) });
  };

  return { favoriteIds, isFavorite, toggle, isLoading: toggleMutation.isPending };
}

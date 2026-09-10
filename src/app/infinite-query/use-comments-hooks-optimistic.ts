import { postData } from '@/lib/fetch-utils';
import {
  InfiniteData,
  QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { CommentsResponse } from '../api/comments/route';
import { Comment } from '../api/comments/data';

const queryKey: QueryKey = ['comments'];
export function useCreateCommentMutationOptimistic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newComment: { text: string }) =>
      postData<{ comment: Comment }>('/api/comments', newComment),
    onMutate: async (newCommentData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<
          InfiniteData<CommentsResponse, number | undefined>
        >(queryKey);

      const optimisticComment: Comment = {
        id: Date.now(), // Temporary ID for the optimistic comment
        text: newCommentData.text,
        user: {
          name: 'Current User', // Replace with actual user data if available
          avatar: 'CU', // Replace with actual user avatar if available
        },
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<
        InfiniteData<CommentsResponse, number | undefined>
      >(queryKey, (oldData) => {
        const firstPage = oldData?.pages[0];
        if (firstPage) {
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                totalComments: firstPage.totalComments + 1,
                comments: [optimisticComment, ...firstPage.comments],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
        // Invalidate and refetch comments after a successful mutation
        // queryClient.invalidateQueries({ queryKey: ['comments'] });
      });
      return { previousData }; // if we get error we have to reset to previous data which we do below
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
  });
}

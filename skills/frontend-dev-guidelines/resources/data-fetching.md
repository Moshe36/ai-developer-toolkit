# Data Fetching — Apollo Client GraphQL

## Setup & Types

File structure:
```
backendApi/
  graphql/
    operations/
      {feature}/
        queries/
          get{Feature}.graphql
          get{Feature}s.graphql
        mutations/
          create{Feature}.graphql
          update{Feature}.graphql
        subscriptions/
          {feature}Updated.graphql
    generatedTypes/
      types.ts   # Auto-generated — never edit manually
```

After creating/modifying any `.graphql` file:
```bash
npm run graphql-typegen
```

Generated types use `Dto` suffix (`PostDto`, `UserDto`) and produce typed hooks (`useGetPostsViewQuery`, `useUpdatePostMutation`).

### Operation file examples

```graphql
# operations/posts/queries/getPostsView.graphql
query GetPostsView($limit: Int, $offset: Int) {
  posts(limit: $limit, offset: $offset) {
    id
    title
    createdAt
    author { id name }
  }
}

# operations/posts/mutations/updatePost.graphql
mutation UpdatePost($id: Int!, $input: UpdatePostInput!) {
  updatePost(id: $id, input: $input) {
    id
    title
    content
  }
}

# operations/posts/subscriptions/postUpdated.graphql
subscription PostUpdated($postId: Int!) {
  postUpdated(postId: $postId) {
    id
    title
    updatedAt
  }
}
```

---

## Query Pattern

```typescript
import { useGetPostView } from '@/services/backendAPI/graphql/generatedTypes/types.ts';

export const PostView: React.FC<{ postId: number }> = ({ postId }) => {
  const { post, isLoading, error } = useGetPostView({ id: postId });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;

  return <h2>{post.title}</h2>;
};
```

Common options: `pollInterval`, `fetchPolicy` (`cache-first` default, `network-only`, `cache-and-network`), `skip`, `onCompleted`, `onError`.

---

## Mutation Pattern

Wrap generated mutations in a custom hook:

```typescript
import { useSaveMarkerGeneratedMutation } from '@/services/backendAPI/graphql/generatedTypes/types.ts';

export const useSaveMarkerMutation = () => {
  const [mutate, { loading }] = useSaveMarkerGeneratedMutation();
  const { t } = useTranslation();

  const executeSaveMarker = useCallback(
    async (input: MarkerFormInputs, isEditing: boolean) => {
      return await mutate({
        variables: { marker: fromSaveMarker(input) },
        onError: () => Toasts.error(t('markerSendError'), { isRemovingPrevToasts: true }),
        onCompleted: () => {
          const key = isEditing ? 'markerEditedSuccessfully' : 'markerAddedSuccessfully';
          Toasts.success(t(key), { isRemovingPrevToasts: true });
        },
      });
    },
    [mutate, t],
  );

  return { executeSaveMarker, savingInProgress: loading };
};
```

Always disable submit buttons while `loading` to prevent duplicate submissions.

---

## Cache Update Pattern

Use Immer to produce updated cache state:

```typescript
const [mutate] = useDeleteDistanceMeasurementMutation({
  optimisticResponse: (vars): DeleteDistanceMeasurementMutation => ({
    deleteMeasurement: { id: vars.id },
  }),
  update(cache, { data }) {
    if (!data?.deleteMeasurement) return;

    const cachedData = cache.readQuery<EntitiesForMapGeneratedQuery>({
      query: EntitiesForMapGeneratedDocument,
    });
    if (!cachedData) return;

    cache.writeQuery({
      query: EntitiesForMapGeneratedDocument,
      data: produce(cachedData, (draft) => {
        draft.distanceMeasurements = draft.distanceMeasurements.filter(
          (m) => m.id !== data.deleteMeasurement?.id,
        );
      }),
    });
  },
});
```

---

## Subscription Pattern

```typescript
import { usePostUpdatedSubscription } from '@/services/backendAPI/graphql/generatedTypes/types.ts';

export const LivePost: React.FC<{ postId: number }> = ({ postId }) => {
  const { data, loading } = usePostUpdatedSubscription({
    variables: { postId },
    onData: ({ data }) => Toasts.info('Post updated!'),
  });

  if (loading) return <Spinner />;

  return <h2>{data?.postUpdated.title}</h2>;
};
```

---

## Error Handling

Component-level — prefer `onError` callback over reading `error` from the hook when side effects (toasts, navigation) are needed:

```typescript
onError: (error) => {
  error.graphQLErrors.forEach(({ message, extensions }) => {
    if (extensions?.code === 'UNAUTHENTICATED') navigate('/login');
    else Toasts.error(message);
  });
  if (error.networkError) Toasts.error('Network error');
}
```

Global errors are handled via `onError` link in Apollo Client setup — don't duplicate that logic per-component.

---

## Key Rules

- Always run `npm run graphql-typegen` after schema/operation changes
- Always handle `isLoading` and `error` states before rendering data
- Wrap generated mutation hooks in a custom hook — don't call them directly in components
- Use `optimisticResponse` for delete/update operations where the result shape is known
- Use Immer (`produce`) for all cache writes
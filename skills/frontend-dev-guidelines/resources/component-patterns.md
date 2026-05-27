# Component Patterns

---

## React.FC Pattern (Required)
```typescript
interface IMyComponentProps {
  userId: number;
  onAction?: () => void;
  className?: string;
}

export const MyComponent: React.FC<IMyComponentProps> = ({
  userId,
  onAction,
  className,
}) => {
  return (
    <div className={className}>
      <button onClick={onAction}>{userId}</button>
    </div>
  );
};

export default MyComponent;
```

**Conventions:**
- Interface name prefixed with `I`, suffixed with `Props`
- Destructure props in parameters
- Named export + default export

---

## Component Structure (Strict Ordering)
```typescript
// 1. Imports
import React, { useState, useCallback } from 'react';
import { useGetRadioById } from '@/features/Radio/hooks/useGetRadioById';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';

// 2. Interfaces
interface IRadioHeaderProps {
  radioId: number;
  onRadioUpdate?: (radio: IRadio) => void;
}

// 3. Component
export const RadioHeader: React.FC<IRadioHeaderProps> = ({
  radioId,
  onRadioUpdate,
}) => {
  // 4. Hooks (state → queries → effects)
  const [isEditing, setIsEditing] = useState(false);
  const { radioData, isLoading, isError } = useGetRadioById(radioId);

  // 5. Event handlers (memoized when passed as props or used in deps)
  const handleEdit = useCallback(() => setIsEditing(true), []);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    onRadioUpdate?.(radioData);
  }, [radioData, onRadioUpdate]);

  // 6. Early returns
  if (isLoading) return <div>Loading...</div>;
  if (isError || !radioData) return <div>Radio not found</div>;

  // 7. Render
  return (
    <div className="p-4">
      <h2>{radioData.name}</h2>
      <Button onClick={isEditing ? handleSave : handleEdit}>
        {isEditing ? 'Save' : 'Edit'}
      </Button>
    </div>
  );
};

// 8. Default export
export default RadioHeader;
```

---

## Container / Presentational Pattern

Use when a component needs to fetch data **and** render UI — split responsibilities.
```typescript
// Presentational: pure UI, no data fetching
interface IUserCardProps {
  user: IUser;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const UserCard: React.FC<IUserCardProps> = ({
  user,
  isDeleting,
  onEdit,
  onDelete,
}) => (
  <div className="p-4 border rounded">
    <h3>{user.name}</h3>
    <p>{user.email}</p>
    <Button onClick={onEdit}>Edit</Button>
    <Button onClick={onDelete} disabled={isDeleting}>Delete</Button>
  </div>
);

// Container: data fetching + logic only
export const UserCardContainer: React.FC<{ userId: number }> = ({ userId }) => {
  const { userData, isLoading, isError } = useGetUserById(userId);
  const { deleteUser, isDeleting } = useDeleteUser();

  const handleEdit = useCallback(() => { /* ... */ }, []);
  const handleDelete = useCallback(() => {
    deleteUser({ variables: { id: userId } });
  }, [userId, deleteUser]);

  if (isLoading) return <div>Loading...</div>;
  if (isError || !userData) return <div>Error loading user.</div>;

  return (
    <UserCard
      user={userData}
      isDeleting={isDeleting}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};
```

---

## Form Pattern (React Hook Form + Yup)

Schema defined as a static class helper, keeping it co-located but out of the component.
```typescript
// LoginDialogFormHelper.ts
export class LoginDialogFormHelper {
  static readonly schema = yup.object({
    username: yup.string().min(3).required(),
    password: yup.string().min(6).required(),
  });
}

// LoginForm.tsx
interface ILoginFormData {
  username: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const form = useForm<ILoginFormData>({
    resolver: yupResolver(LoginDialogFormHelper.schema),
    defaultValues: { username: Constats.TEXT.EMPTY, password: Constats.TEXT.EMPTY },
    mode: 'onChange',
  });

  const { formState: { errors, isSubmitting } } = form;

  const onSubmit = async (data: ILoginFormData) => {
    try {
      const user = await login(data);
      if (user) {
        onLoginSuccess(user);
      } else {
        form.setError('root', { type: 'manual', message: t('invalidCredentials') });
      }
    } catch {
      form.setError('root', { type: 'manual', message: t('invalidCredentials') });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormInput fieldName="username" placeholder={t('username')} />
        <FormPasswordInput />
        {errors.root && (
          <Label className="text-content-status-error">{errors.root.message}</Label>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {t('login')}
        </Button>
      </form>
    </Form>
  );
};
```

---

## Key Rules

| Rule | Detail |
|------|--------|
| `useCallback` | Always memoize handlers passed as props or used in `useEffect` deps |
| `useMemo` | For expensive derivations (filter, sort, reduce over large arrays) |
| Inline handlers | Acceptable for simple, non-prop-passed callbacks |
| `key` in lists | Always use stable unique IDs — never array index |
| No `any` | Define explicit interfaces; use generated `*Dto` types from codegen |
| Early returns | Handle loading/error/empty before the main render |
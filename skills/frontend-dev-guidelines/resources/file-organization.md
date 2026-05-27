# File Organization

Feature-based architecture with Apollo Client GraphQL and Redux Toolkit.

---

## features/ vs components/ Distinction

### When to Create a New Feature

Create a new feature directory when:
1. Feature has 3+ components
2. Feature has its own GraphQL operations
3. Feature has domain-specific business logic
4. Feature will grow over time

### When to Create a New Component

Create in `components/` when:
1. Component used in 3+ features
2. Component is truly reusable
3. Component has no feature-specific logic
4. Component is a UI pattern (Button, Dialog, Form)


### features/ Directory

**Purpose**: Domain-specific features with their own logic, components, and types

**When to use:**
- Feature has multiple related components
- Feature has GraphQL operations
- Feature has domain-specific logic
- Feature has custom hooks/utilities

**Examples:**
- `features/Link/` - Link management
- `features/Radio/` - Radio configuration
- `features/Login/` - Authentication flows
- `features/Map/` - Map visualization

**Structure:**
```
features/
  my-feature/
    components/
      SubComponent.tsx        # Related components
    hooks/
      useMyFeature.ts         # Custom hooks
    types/
      index.ts                # TypeScript types
	MyFeature.tsx           # Main component entry point
```

### components/ Directory

**Purpose**: Truly reusable components used across multiple features

**When to use:**
- Component is used in 3+ places
- Component is generic (no feature-specific logic)
- Component is a UI primitive or pattern

**Examples:**
- `components/common/` - Shadcn UI components (button, dialog, input)
- `components/Button/` - Custom button components
- `components/Dialog/` - Custom dialog components
- `components/Form/` - Reusable form components
- `components/Table/` - Reusable table components

**Structure:**
```
components/
  Button/
    common/
		button.tsx              # Shadcn UI components
    Button.tsx              # Custom components
  Dialog/
	common/
		dialog.tsx
    Dialog.tsx
```

---

## Redux Structure

### Redux Store Organization

```
redux/
	app/
		store.ts                    # Redux store configuration
		hooks.ts                    # Typed hooks (useAppDispatch, useAppSelector)
	slices/
		Chats/
			ChatSlice.ts              # Chat state slice
			ChatActions.ts              # Chat actions slice
		Link/
			LinkSlice.ts              # Link state slice
			LinkActions.ts              # Link actions slice
```

---

## Feature Directory Structure (Detailed)

### Complete Feature Example

```
features/
  posts/
    components/
      PostList.tsx            # Main container component
      PostCard.tsx            # Post card component
      PostFilters.tsx         # Filter controls
	  /PostForm					# Component sub folder if includes other sub sub components
		PostForm.tsx            # Create/edit form
		components/
			FormButtons.tsx
			PostFormConfirmationModal.tsx
		hooks/
			useUpdatePost.ts	#
    hooks/
      usePosts.ts             # Custom hook for posts logic
      usePostForm.ts          # Form handling hook

    types/
      index.ts                # Feature-specific types

    index.ts                  # Public exports
```

---

## Naming Conventions

### Files

- **Components**: PascalCase - `PostCard.tsx`, `UserProfile.tsx`
- **Hooks**: camelCase with "use" prefix - `useAuth.ts`, `usePosts.ts`
- **Utilities**: camelCase - `formatDate.ts`, `validators.ts`
- **Types**: camelCase - `index.ts`, `user.ts`
- **GraphQL**: lowercase with hyphens - `queries.graphql`, `mutations.graphql`

---


## Common Mistakes to Avoid

❌ **Don't put feature-specific components in components/**
```
components/
  PostCard.tsx  ❌ Feature-specific
```

✅ **Put them in features/**
```
features/
  posts/
    components/
      PostCard.tsx  ✅ Correct location
```

---

## Best Practices

1. **Feature-first organization**: Group by feature, not by file type
2. **Colocate related files**: Keep related code together
3. **Use path aliases**: `@/` instead of `../../../`
4. **GraphQL operations centralized**: All in `backendApi/graphql/operations/`
5. **Generate types after changes**: Run `npm run graphql-typegen`
7. **Components are focused**: Single responsibility
8. **Naming is consistent**: Follow conventions

---

**Remember**: Good file organization makes code easier to find, understand, and maintain!
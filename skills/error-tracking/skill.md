---
name: error-tracking
description: Add Sentry error tracking and performance monitoring to frontend and backend services. Use for error handling in React components, Apollo Client errors, Redux errors, and backend API errors. ALL ERRORS MUST BE CAPTURED TO SENTRY.
---

# Sentry Error Tracking

**Stack:** Sentry + React + Apollo + Redux + Node.js/Express

---

## 🚨 CRITICAL RULE

**ALL ERRORS MUST BE CAPTURED TO SENTRY** - No exceptions. Never use console.error alone.

---

## Quick Decision Tree

```
Error Tracking Task?
├─ Frontend Error
│  ├─ React Component Error?
│  │  ├─ Setup: <ErrorBoundary> wrapper + Sentry.captureException
│  │  └─ Test: Throw error, verify in Sentry dashboard
│  │
│  ├─ Apollo GraphQL Error?
│  │  ├─ Global: onError link → Sentry.captureException
│  │  ├─ Component: useQuery onError → Sentry.withScope
│  │  └─ Context: operationName, query, variables, path
│  │
│  ├─ Redux Error?
│  │  ├─ Middleware: sentryMiddleware → capture action errors
│  │  ├─ Thunk: try/catch → Sentry.captureException
│  │  └─ Context: action type, payload
│  │
│  ├─ Form Error?
│  │  ├─ Submit: try/catch → Sentry.captureException
│  │  └─ Context: form name, fields, validation errors
│  │
│  └─ Performance Issue?
│     ├─ Component: Sentry.withProfiler
│     └─ Transaction: Sentry.startTransaction + spans
│
├─ Backend Error
│  ├─ Express Route?
│  │  ├─ Middleware: Sentry.Handlers.requestHandler() FIRST
│  │  ├─ Error: Sentry.Handlers.errorHandler() LAST
│  │  └─ Route: try/catch → Sentry.captureException
│  │
│  ├─ Controller?
│  │  ├─ BaseController.handleError() pattern
│  │  └─ Context: controller name, method, parameters
│  │
│  └─ Service?
│     ├─ try/catch → Sentry.captureException
│     └─ Context: service name, operation, user context
│
└─ Setup/Testing?
   ├─ Frontend: Sentry.init() in main.tsx (FIRST import)
   ├─ Backend: Sentry.init() in instrument.ts (FIRST import)
   └─ Test: Create test button/route, verify capture

Details in resources/sentry-integration.md
```

---

## Essential Checklists

**Frontend Setup:**
- [ ] `Sentry.init()` in main.tsx (FIRST import)
- [ ] `<ErrorBoundary>` wrapping App
- [ ] Apollo `onError` link configured
- [ ] Redux `sentryMiddleware` added
- [ ] User context set when logged in

**Backend Setup:**
- [ ] `Sentry.init()` in instrument.ts (FIRST import)
- [ ] `Sentry.Handlers.requestHandler()` middleware FIRST
- [ ] `Sentry.Handlers.errorHandler()` middleware LAST
- [ ] All try/catch blocks call `Sentry.captureException()`

**Error Capture:**
- [ ] `Sentry.captureException(error, { ... })` for ALL errors
- [ ] Add context: tags, user, component, operation
- [ ] Filter sensitive data (passwords, tokens)
- [ ] Test error appears in Sentry dashboard

---

## Core Patterns

**React Error Boundary:**
```typescript
import * as Sentry from '@sentry/react';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Apollo Error Link:**
```typescript
const errorLink = onError(({ graphQLErrors, operation }) => {
  graphQLErrors?.forEach(({ message, path }) => {
    Sentry.captureException(new Error(message), {
      tags: { type: 'graphql' },
      contexts: {
        graphql: {
          operationName: operation.operationName,
          path,
        },
      },
    });
  });
});
```

**Component Error:**
```typescript
try {
  await submitForm(data);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'LoginForm' },
    contexts: { form: { fields: Object.keys(data) } },
  });
  toast.error('Submission failed');
}
```

**Redux Thunk:**
```typescript
export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId: number) => {
    try {
      return await api.getUser(userId);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { type: 'redux-thunk' },
        contexts: { request: { userId } },
      });
      throw error;
    }
  }
);
```

**Backend Route:**
```typescript
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/users' },
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**User Context:**
```typescript
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';

export const useSentryUser = () => {
  const user = useAppSelector(state => state.user.currentUser);

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id.toString(),
        email: user.email,
        username: user.username,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
};
```

---

## Import Cheatsheet

```typescript
// Frontend
import * as Sentry from '@sentry/react';
import { onError } from '@apollo/client/link/error';

// Backend
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
```

---

## Resource Guide

| Need | Read |
|------|------|
| Complete setup | [sentry-integration.md](resources/sentry-integration.md) |
| Error boundaries | [sentry-integration.md#error-boundaries](resources/sentry-integration.md) |
| Apollo errors | [sentry-integration.md#apollo-client-error-tracking](resources/sentry-integration.md) |
| Redux errors | [sentry-integration.md#redux-error-tracking](resources/sentry-integration.md) |
| Backend setup | [sentry-integration.md#backend-sentry-integration](resources/sentry-integration.md) |
| Testing | [sentry-integration.md#testing-sentry-integration](resources/sentry-integration.md) |

---

## Core Rules

1. **Capture ALL errors**: Never use `console.error` alone - always `Sentry.captureException()`
2. **Add context**: Tags (component, type), contexts (user, operation, data)
3. **Filter sensitive data**: Strip passwords, tokens, cookies in `beforeSend`
4. **Set user context**: Use `Sentry.setUser()` when user logs in
5. **Error boundaries required**: Wrap app and features with `<ErrorBoundary>`
6. **Initialize first**: Import Sentry init BEFORE React/Express
7. **Test integration**: Create test error, verify in Sentry dashboard
8. **Use breadcrumbs**: Add navigation/action breadcrumbs for debugging
9. **Performance tracking**: Use `Sentry.withProfiler` for slow components
10. **Environment vars**: `VITE_SENTRY_DSN` (frontend), `SENTRY_DSN` (backend)

---

## Common Mistakes to Avoid

❌ **NEVER** use `console.error` without `Sentry.captureException`
❌ **NEVER** swallow errors silently (empty catch blocks)
❌ **NEVER** expose sensitive data (passwords, tokens) in error context
❌ **NEVER** use generic error messages without context
❌ **NEVER** skip error boundaries in React apps
❌ **NEVER** forget to set user context when available

---

## Environment Setup

```env
# Frontend (.env)
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id

# Backend (.env)
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

---

## Testing

**Frontend Test:**
```typescript
<button onClick={() => Sentry.captureException(new Error('Test error'))}>
  Test Sentry
</button>
```

**Backend Test:**
```typescript
app.get('/test/sentry', (req, res) => {
  Sentry.captureException(new Error('Test backend error'));
  res.json({ message: 'Error sent to Sentry' });
});
```

---

**Remember**: Good error tracking is essential for reliable applications. Always capture to Sentry!

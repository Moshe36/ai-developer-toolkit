# Sentry Integration - Complete Examples

Comprehensive Sentry setup and error tracking patterns for React + Apollo + Redux frontend and Node.js backend.

---

## Frontend Sentry Setup

### 1. Initialization (main.tsx)

**CRITICAL**: Import instrument.ts FIRST, before React

```typescript
// src/main.tsx - MUST be imported first, before React
import * as Sentry from '@sentry/react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect: React.useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

---

## Error Boundaries

### Application-Level Error Boundary

```typescript
import * as Sentry from '@sentry/react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture to Sentry with component stack
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2">
              <Button onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in App.tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Feature-Level Error Boundary

```typescript
export const FeatureErrorBoundary: React.FC<{ children: ReactNode; featureName: string }> = ({
  children,
  featureName
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-4 bg-red-50 rounded">
          <p className="text-red-600">Error in {featureName}: {error.message}</p>
          <button onClick={resetError}>Retry</button>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag('feature', featureName);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

// Usage
<FeatureErrorBoundary featureName="user-profile">
  <UserProfile />
</FeatureErrorBoundary>
```

---

## Apollo Client Error Tracking

### Global Error Link

```typescript
// src/apollo/client.ts
import { ApolloClient, InMemoryCache, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import * as Sentry from '@sentry/react';
import toast from 'react-hot-toast';

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      const errorMessage = `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`;

      console.error(errorMessage);

      // Capture to Sentry with context
      Sentry.captureException(new Error(message), {
        tags: {
          type: 'graphql',
          errorCode: extensions?.code as string,
        },
        contexts: {
          graphql: {
            operationName: operation.operationName,
            query: operation.query.loc?.source.body,
            variables: operation.variables,
            path,
            locations,
          },
        },
      });

      // Show user-friendly error
      if (extensions?.code === 'UNAUTHENTICATED') {
        toast.error('Please log in to continue');
      } else if (extensions?.code === 'FORBIDDEN') {
        toast.error('You do not have permission');
      } else {
        toast.error(message);
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    Sentry.captureException(networkError, {
      tags: {
        type: 'network',
        operationName: operation.operationName,
      },
      contexts: {
        network: {
          statusCode: 'statusCode' in networkError ? networkError.statusCode : undefined,
          result: 'result' in networkError ? networkError.result : undefined,
        },
      },
    });

    toast.error('Network error. Please check your connection.');
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
});
```

### Component-Level Apollo Error Handling

```typescript
import { useQuery } from '@apollo/client';
import * as Sentry from '@sentry/react';

export const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    onError: (error) => {
      // Additional context beyond global error link
      Sentry.withScope((scope) => {
        scope.setContext('user', { userId });
        scope.setTag('component', 'UserProfile');
        Sentry.captureException(error);
      });
    },
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;

  return <div>{data?.user.name}</div>;
};
```

---

## Redux Error Tracking

### Redux Middleware

```typescript
// src/redux/middleware/sentryMiddleware.ts
import * as Sentry from '@sentry/react';
import type { Middleware } from '@reduxjs/toolkit';

export const sentryMiddleware: Middleware = () => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        type: 'redux',
        action: action.type,
      },
      contexts: {
        redux: {
          action: action.type,
          payload: action.payload,
        },
      },
    });
    throw error;
  }
};

// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { sentryMiddleware } from './middleware/sentryMiddleware';

export const store = configureStore({
  reducer: {
    // your reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sentryMiddleware),
});
```

### Redux Thunk Error Handling

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import * as Sentry from '@sentry/react';

export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (userId: number, { rejectWithValue }) => {
    try {
      const response = await api.getUser(userId);
      return response.data;
    } catch (error) {
      // Capture to Sentry
      Sentry.captureException(error, {
        tags: {
          type: 'redux-thunk',
          action: 'fetchUser',
        },
        contexts: {
          request: { userId },
        },
      });

      return rejectWithValue(error.message);
    }
  }
);
```

---

## Performance Monitoring

### Track Component Performance

```typescript
import * as Sentry from '@sentry/react';

export const ExpensiveComponent: React.FC = Sentry.withProfiler(
  ({ data }) => {
    // Expensive rendering logic
    return <div>{/* ... */}</div>;
  },
  { name: 'ExpensiveComponent' }
);
```

### Track Custom Transactions

```typescript
const handleDataLoad = async () => {
  const transaction = Sentry.startTransaction({
    name: 'Load User Dashboard',
    op: 'ui.load',
  });

  try {
    const span = transaction.startChild({
      op: 'fetch',
      description: 'Fetch user data',
    });

    const userData = await fetchUserData();
    span.finish();

    const renderSpan = transaction.startChild({
      op: 'render',
      description: 'Render dashboard',
    });

    renderDashboard(userData);
    renderSpan.finish();

  } catch (error) {
    Sentry.captureException(error);
  } finally {
    transaction.finish();
  }
};
```

---

## User Context & Tags

### Set User Context

```typescript
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useAppSelector } from '@/redux/hooks';

export const useSentryUser = () => {
  const currentUser = useAppSelector(state => state.user.currentUser);

  useEffect(() => {
    if (currentUser) {
      Sentry.setUser({
        id: currentUser.id.toString(),
        email: currentUser.email,
        username: currentUser.username,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [currentUser]);
};

// Use in App.tsx
export const App: React.FC = () => {
  useSentryUser();
  return <Router />;
};
```

### Custom Tags & Context

```typescript
import * as Sentry from '@sentry/react';

// Add custom context
Sentry.setContext('feature', {
  name: 'user-dashboard',
  version: '2.0',
});

// Add custom tags
Sentry.setTag('page', 'dashboard');
Sentry.setTag('userType', 'premium');

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to settings',
  level: 'info',
});
```

---

## Form Error Tracking

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import toast from 'react-hot-toast';

export const LoginForm: React.FC = () => {
  const { handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: FormData) => {
    try {
      await login(data);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          type: 'form-submission',
          form: 'login',
        },
        contexts: {
          form: {
            fields: Object.keys(data),
            errors: Object.keys(errors),
          },
        },
      });

      toast.error('Login failed. Please try again.');
    }
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* ... */}</form>;
};
```

---

## Backend Sentry Integration

### Backend Initialization

```typescript
// src/instrument.ts - MUST be imported first
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### Express Middleware

```typescript
// src/app.ts
import './instrument'; // FIRST!
import * as Sentry from '@sentry/node';
import express from 'express';

const app = express();

// Request handler MUST be first
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Your routes
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

// Error handler MUST be last
app.use(Sentry.Handlers.errorHandler());
```

### Controller Pattern

```typescript
import * as Sentry from '@sentry/node';

export class BaseController {
  protected handleError(error: Error, context: string) {
    Sentry.captureException(error, {
      tags: {
        controller: this.constructor.name,
        method: context,
      },
    });
    console.error(`[${this.constructor.name}.${context}] Error:`, error);
  }
}

export class UserController extends BaseController {
  async getUser(req: Request, res: Response) {
    try {
      const user = await this.userService.findById(req.params.id);
      res.json(user);
    } catch (error) {
      this.handleError(error, 'getUser');
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
}
```

---

## Testing Sentry Integration

### Frontend Test Component

```typescript
export const SentryTest: React.FC = () => {
  const testError = () => {
    Sentry.captureException(new Error('Test frontend error'));
  };

  const testCrash = () => {
    throw new Error('Test component crash');
  };

  return (
    <div>
      <button onClick={testError}>Test Sentry Error</button>
      <button onClick={testCrash}>Test Error Boundary</button>
    </div>
  );
};
```

### Backend Test Route

```typescript
app.get('/api/test/sentry', (req, res) => {
  try {
    throw new Error('Test backend error');
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Test error sent to Sentry' });
  }
});
```

---

## Environment Variables

```env
# .env
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
```

---

## Common Mistakes to Avoid

❌ **NEVER** use console.error without Sentry
❌ **NEVER** swallow errors silently
❌ **NEVER** expose sensitive data (passwords, tokens) in error context
❌ **NEVER** use generic error messages without context
❌ **NEVER** skip error boundaries in React apps
❌ **NEVER** forget to set user context when available
❌ **NEVER** send PII (Personally Identifiable Information) to Sentry

---

## Best Practices

1. **Always add context**: Include relevant user, component, or operation info
2. **Use appropriate severity**: error, warning, info, debug
3. **Filter sensitive data**: Before sending to Sentry
4. **Set user context**: When user is authenticated
5. **Use error boundaries**: At app and feature levels
6. **Track performance**: For slow operations
7. **Add breadcrumbs**: For debugging complex flows
8. **Test error handling**: Regularly verify Sentry integration
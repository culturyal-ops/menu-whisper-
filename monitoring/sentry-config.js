// Sentry error tracking configuration
// Add to backend/src/index.ts

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: 0.1,
    integrations: [
      new ProfilingIntegration()
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      
      // Don't send rate limit errors
      if (event.exception?.values?.[0]?.value?.includes('rate limit')) {
        return null;
      }
      
      return event;
    },
    
    // Context enrichment
    beforeBreadcrumb(breadcrumb) {
      // Add custom context
      if (breadcrumb.category === 'http') {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString()
        };
      }
      return breadcrumb;
    }
  });
}

// Error handler middleware
export function sentryErrorHandler(err, req, res, next) {
  Sentry.captureException(err, {
    tags: {
      path: req.path,
      method: req.method
    },
    user: {
      id: req.userId,
      restaurantId: req.restaurantId
    },
    extra: {
      body: req.body,
      query: req.query
    }
  });
  
  next(err);
}

// Manual error capture
export function captureError(error, context = {}) {
  Sentry.captureException(error, {
    extra: context
  });
}

// Performance monitoring
export function startTransaction(name, op) {
  return Sentry.startTransaction({
    name,
    op
  });
}

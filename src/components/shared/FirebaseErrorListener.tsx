
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import type { FirestorePermissionError } from '@/lib/errors';
import { auth } from '@/lib/firebase';

function constructErrorForOverlay(permissionError: FirestorePermissionError): Error {
  const { path, operation, requestResourceData } = permissionError.context;
  const currentUser = auth.currentUser;

  const contextualInfo = {
    auth: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      // Add other relevant token fields if needed
      token: {
        email_verified: currentUser.emailVerified,
        phone_number: currentUser.phoneNumber,
      }
    } : null,
    method: operation,
    path: `/databases/(default)/documents/${path}`,
    request: {
      resource: {
        data: requestResourceData || null
      }
    }
  };

  const detailedMessage = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(contextualInfo, null, 2)}`;
  
  const errorForOverlay = new Error(detailedMessage);
  errorForOverlay.name = 'FirestorePermissionError';
  // The stack trace is not very useful here as it points to our handler, 
  // so we can optionally clear it or leave it. For Next.js overlay, it's better to have it.
  errorForOverlay.stack = permissionError.stack;

  return errorForOverlay;
}

export default function FirebaseErrorListener() {
  useEffect(() => {
    const handler = (error: FirestorePermissionError) => {
      // Don't handle errors in production, let them fail silently
      if (process.env.NODE_ENV === 'production') {
        return;
      }
      
      const syntheticError = constructErrorForOverlay(error);
      
      // Throw the error so the Next.js development overlay can catch it.
      // We wrap it in a timeout to break out of the current event loop
      // and ensure it's caught as an unhandled error.
      setTimeout(() => {
        throw syntheticError;
      });
    };

    errorEmitter.on('permission-error', handler);

    return () => {
      errorEmitter.off('permission-error', handler);
    };
  }, []);

  return null;
}

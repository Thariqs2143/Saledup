
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

const FIRESTORE_PERMISSION_ERROR_NAME = 'FirestorePermissionError';

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  private readonly isFirestorePermissionError = true;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
    super(message);
    this.name = FIRESTORE_PERMISSION_ERROR_NAME;
    this.context = context;

    // This is necessary for 'instanceof' to work correctly in some environments
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  public static isFirestorePermissionError(
    err: unknown
  ): err is FirestorePermissionError {
    return (
      err instanceof Error &&
      (err as FirestorePermissionError).isFirestorePermissionError === true &&
      err.name === FIRESTORE_PERMISSION_ERROR_NAME
    );
  }
}

    
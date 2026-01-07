/**
 * Error Handling Utilities
 * 
 * Centralized error handling for the SWARM Marketplace.
 * Requirements: 12.1, 12.2
 */

// ===========================================
// Smart Contract Error Codes
// ===========================================

/**
 * Known smart contract revert reasons mapped to user-friendly messages
 * Requirements: 12.1 - Display revert reason in user-friendly language
 */
export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  // SwarmRegistry errors
  'SwarmNotFound': 'Swarm not found. Please check the swarm ID.',
  'NotSwarmOwner': 'Only the swarm owner can perform this action.',
  'SwarmInactive': 'This swarm is no longer active.',
  'EmptyAgents': 'At least one agent is required to register a swarm.',
  
  // JobEscrow errors
  'JobNotFound': 'Job not found. Please check the job ID.',
  'InvalidJobStatus': 'This action cannot be performed on a job with the current status.',
  'InvalidPayment': 'Payment amount must be greater than zero.',
  'DuplicateBid': 'Your swarm has already bid on this job.',
  'NotJobClient': 'Only the job client can perform this action.',
  'NotAssignedSwarm': 'Only the assigned swarm can perform this action.',
  
  // AgentPayments errors
  'InvalidShares': 'Agent and share arrays must have the same length.',
  'SharesSumInvalid': 'Share percentages must sum to 100%.',
  
  // ERC20 errors
  'ERC20InsufficientAllowance': 'Token approval failed. Please approve the spending amount first.',
  'ERC20InsufficientBalance': 'Insufficient token balance for this transaction.',
  'TransferFailed': 'Token transfer failed. Please check your balance and try again.',
  
  // Generic errors
  'insufficient allowance': 'Token approval failed. Please try again.',
  'insufficient balance': 'Insufficient balance for this transaction.',
};

/**
 * User action error messages
 */
export const USER_ACTION_MESSAGES: Record<string, string> = {
  'user rejected': 'Transaction was rejected by user.',
  'User denied': 'Transaction was rejected by user.',
  'user denied': 'Transaction was rejected by user.',
  'rejected': 'Transaction was rejected.',
};

// ===========================================
// Error Parsing Functions
// ===========================================

/**
 * Parse blockchain revert reason to user-friendly message
 * Requirements: 12.1 - Display revert reason in user-friendly language
 * 
 * @param error - The error object from a failed transaction
 * @returns A user-friendly error message
 */
export function parseRevertReason(error: Error | unknown): string {
  if (!error) {
    return 'An unknown error occurred. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for user rejection first
  for (const [key, message] of Object.entries(USER_ACTION_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Check for known contract errors
  for (const [errorCode, message] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
    if (errorMessage.includes(errorCode)) {
      return message;
    }
  }
  
  // Try to extract revert reason from error message
  // Format: reason="ErrorMessage"
  const reasonMatch = errorMessage.match(/reason="([^"]+)"/);
  if (reasonMatch && reasonMatch[1]) {
    // Check if the extracted reason is a known error
    const extractedReason = reasonMatch[1];
    if (CONTRACT_ERROR_MESSAGES[extractedReason]) {
      return CONTRACT_ERROR_MESSAGES[extractedReason];
    }
    return extractedReason;
  }
  
  // Try to extract from reverted with custom error
  // Format: reverted with custom error 'ErrorName()'
  const customErrorMatch = errorMessage.match(/reverted with custom error '([^'(]+)/);
  if (customErrorMatch && customErrorMatch[1]) {
    const errorName = customErrorMatch[1];
    if (CONTRACT_ERROR_MESSAGES[errorName]) {
      return CONTRACT_ERROR_MESSAGES[errorName];
    }
    return `Transaction failed: ${errorName}`;
  }
  
  // Try to extract from execution reverted
  // Format: execution reverted: ErrorMessage
  const executionRevertedMatch = errorMessage.match(/execution reverted:?\s*(.+?)(?:\n|$)/i);
  if (executionRevertedMatch && executionRevertedMatch[1]) {
    const revertMessage = executionRevertedMatch[1].trim();
    if (revertMessage && revertMessage !== 'undefined') {
      return revertMessage;
    }
  }
  
  // Check for network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Check for gas errors
  if (errorMessage.includes('gas') || errorMessage.includes('out of gas')) {
    return 'Transaction ran out of gas. Please try again with higher gas limit.';
  }
  
  // Check for nonce errors
  if (errorMessage.includes('nonce')) {
    return 'Transaction nonce error. Please reset your wallet or wait for pending transactions.';
  }
  
  // Generic fallback
  return 'Transaction failed. Please try again.';
}

/**
 * Parse API error to user-friendly message
 * Requirements: 12.2 - Display appropriate error messages and retry options
 * 
 * @param error - The error object from an API call
 * @returns A user-friendly error message
 */
export function parseApiError(error: Error | unknown): string {
  if (!error) {
    return 'An unknown error occurred. Please try again.';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for common API errors
  if (errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('401')) {
    return 'Please connect your wallet to continue.';
  }
  
  if (errorMessage.includes('FORBIDDEN') || errorMessage.includes('403')) {
    return 'You are not authorized to perform this action.';
  }
  
  if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (errorMessage.includes('CONFLICT') || errorMessage.includes('409')) {
    return 'This action conflicts with existing data. Please refresh and try again.';
  }
  
  if (errorMessage.includes('VALIDATION_ERROR') || errorMessage.includes('400')) {
    return 'Invalid input data. Please check your entries and try again.';
  }
  
  if (errorMessage.includes('SERVICE_UNAVAILABLE') || errorMessage.includes('503')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  if (errorMessage.includes('INTERNAL_ERROR') || errorMessage.includes('500')) {
    return 'An internal error occurred. Please try again later.';
  }
  
  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    return 'Request timed out. Please try again.';
  }
  
  // Return the original message if it's reasonably short and readable
  if (errorMessage.length < 100 && !errorMessage.includes('Error:')) {
    return errorMessage;
  }
  
  return 'An error occurred. Please try again.';
}

// ===========================================
// Balance Error Formatting
// ===========================================

/**
 * Format insufficient balance error with both amounts
 * Requirements: 12.4 - Display current balance and required amount
 * 
 * @param currentBalance - Current balance as string (in token units, not wei)
 * @param requiredAmount - Required amount as string (in token units, not wei)
 * @param symbol - Token symbol (e.g., 'MNEE')
 * @returns Formatted error message
 */
export function formatInsufficientBalanceError(
  currentBalance: string,
  requiredAmount: string,
  symbol: string = 'MNEE'
): string {
  return `Insufficient balance. You have ${currentBalance} ${symbol}, need ${requiredAmount} ${symbol}.`;
}

// ===========================================
// Error Type Guards
// ===========================================

/**
 * Check if error is a user rejection
 */
export function isUserRejectionError(error: Error | unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes('user rejected') ||
    message.toLowerCase().includes('user denied') ||
    message.toLowerCase().includes('rejected')
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: Error | unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('connection') ||
    message.toLowerCase().includes('fetch')
  );
}

/**
 * Check if error is an insufficient balance error
 */
export function isInsufficientBalanceError(error: Error | unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('InsufficientBalance') ||
    message.includes('insufficient balance')
  );
}

// ===========================================
// Error Logging
// ===========================================

/**
 * Log error to console in development, or to monitoring service in production
 * Requirements: 12.6 - Log all errors appropriately
 * 
 * @param error - The error to log
 * @param context - Additional context about where the error occurred
 */
export function logError(error: Error | unknown, context?: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`[SWARM Error]${context ? ` ${context}:` : ''}`, {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
  } else {
    // In production, you would send to a monitoring service like Sentry
    // For now, we'll just log to console
    console.error(`[SWARM Error]${context ? ` ${context}:` : ''}`, errorMessage);
  }
}

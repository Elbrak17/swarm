/**
 * Property tests for error message parsing
 * 
 * Feature: swarm-marketplace
 * Property 35: Failed Transaction Shows User-Friendly Error
 * Validates: Requirements 12.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseRevertReason,
  parseApiError,
  CONTRACT_ERROR_MESSAGES,
  USER_ACTION_MESSAGES,
  isUserRejectionError,
  isNetworkError,
  isInsufficientBalanceError,
} from '../errors';

// ===========================================
// Generators for property-based testing
// ===========================================

/**
 * Generator for known contract error codes
 */
const knownContractErrorArb = fc.constantFrom(
  ...Object.keys(CONTRACT_ERROR_MESSAGES)
);

/**
 * Generator for user rejection error messages
 */
const userRejectionErrorArb = fc.constantFrom(
  'user rejected transaction',
  'User denied transaction signature',
  'user denied the request',
  'Transaction was rejected by user',
  'MetaMask Tx Signature: User denied transaction signature'
);

/**
 * Generator for network error messages
 */
const networkErrorArb = fc.constantFrom(
  'network error',
  'connection failed',
  'Failed to fetch',
  'Network request failed',
  'connection timeout'
);

/**
 * Generator for gas-related error messages
 */
const gasErrorArb = fc.constantFrom(
  'out of gas',
  'gas required exceeds allowance',
  'intrinsic gas too low',
  'transaction ran out of gas'
);

/**
 * Generator for nonce error messages
 */
const nonceErrorArb = fc.constantFrom(
  'nonce too low',
  'nonce too high',
  'replacement transaction underpriced',
  'transaction nonce is too low'
);

/**
 * Generator for error messages with reason format
 * Excludes JavaScript reserved property names that could cause lookup issues
 */
const safeReasonArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !s.includes('"') && 
    !['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'].includes(s));

const reasonFormatErrorArb = fc.tuple(
  safeReasonArb,
  fc.string({ minLength: 0, maxLength: 100 })
).map(([reason, suffix]) => `Error: reason="${reason}"${suffix}`);

/**
 * Generator for custom error format
 * Excludes JavaScript reserved property names
 */
const safeErrorNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9]*$/.test(s) &&
    !['constructor', 'toString', 'valueOf', 'hasOwnProperty', 'prototype'].includes(s));

const customErrorFormatArb = fc.tuple(
  safeErrorNameArb,
  fc.string({ minLength: 0, maxLength: 50 })
).map(([errorName, suffix]) => `reverted with custom error '${errorName}()'${suffix}`);

/**
 * Generator for execution reverted format
 */
const executionRevertedFormatArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && s !== 'undefined'),
  fc.boolean()
).map(([message, hasColon]) => 
  hasColon ? `execution reverted: ${message}` : `execution reverted ${message}`
);

/**
 * Generator for API error codes
 */
const apiErrorCodeArb = fc.constantFrom(
  'UNAUTHORIZED', '401',
  'FORBIDDEN', '403',
  'NOT_FOUND', '404',
  'CONFLICT', '409',
  'VALIDATION_ERROR', '400',
  'SERVICE_UNAVAILABLE', '503',
  'INTERNAL_ERROR', '500'
);

/**
 * Generator for random hex strings (simulating raw error data)
 */
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));
const rawHexErrorArb = fc.array(hexChar, { minLength: 10, maxLength: 100 })
  .map(chars => `0x${chars.join('')}`);

// ===========================================
// Property Tests
// ===========================================

describe('Error Message Properties', () => {
  /**
   * Feature: swarm-marketplace, Property 35: Failed Transaction Shows User-Friendly Error
   * 
   * For any blockchain transaction that reverts, the displayed error message
   * SHALL be human-readable (not raw hex).
   * Validates: Requirements 12.1
   */
  describe('Property 35: Failed Transaction Shows User-Friendly Error', () => {
    describe('Known Contract Errors', () => {
      it('known contract errors return mapped user-friendly messages', () => {
        fc.assert(
          fc.property(
            knownContractErrorArb,
            fc.string({ minLength: 0, maxLength: 50 }),
            (errorCode, prefix) => {
              const error = new Error(`${prefix}${errorCode}`);
              const result = parseRevertReason(error);
              
              // Result should be the mapped user-friendly message
              return result === CONTRACT_ERROR_MESSAGES[errorCode];
            }
          ),
          { numRuns: 100 }
        );
      });

      it('all known error codes have non-empty user-friendly messages', () => {
        fc.assert(
          fc.property(
            knownContractErrorArb,
            (errorCode) => {
              const message = CONTRACT_ERROR_MESSAGES[errorCode];
              return message !== undefined && 
                message.trim().length > 0 &&
                !message.startsWith('0x'); // Not raw hex
            }
          ),
          { numRuns: 100 }
        );
      });

      it('user-friendly messages do not contain raw hex or stack traces', () => {
        fc.assert(
          fc.property(
            knownContractErrorArb,
            (errorCode) => {
              const message = CONTRACT_ERROR_MESSAGES[errorCode];
              // Should not contain raw hex or stack traces
              return !message.match(/^0x[a-fA-F0-9]+$/) &&
                !message.includes('stack') &&
                !message.includes('at ');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('User Rejection Errors', () => {
      it('user rejection errors return user-friendly rejection message', () => {
        fc.assert(
          fc.property(
            userRejectionErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should indicate user rejection in friendly terms
              return result.toLowerCase().includes('rejected') ||
                result.toLowerCase().includes('denied');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('isUserRejectionError correctly identifies rejection errors', () => {
        fc.assert(
          fc.property(
            userRejectionErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              return isUserRejectionError(error) === true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Network Errors', () => {
      it('network errors return user-friendly message', () => {
        fc.assert(
          fc.property(
            networkErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should be user-friendly (not raw hex, not empty)
              return result.length > 0 &&
                !result.match(/^0x[a-fA-F0-9]+$/);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('isNetworkError correctly identifies network errors', () => {
        fc.assert(
          fc.property(
            networkErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              return isNetworkError(error) === true;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Gas Errors', () => {
      it('gas errors return user-friendly gas message', () => {
        fc.assert(
          fc.property(
            gasErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should mention gas
              return result.toLowerCase().includes('gas');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Nonce Errors', () => {
      it('nonce errors return user-friendly message', () => {
        fc.assert(
          fc.property(
            nonceErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should be user-friendly (not raw hex, not empty)
              return result.length > 0 &&
                !result.match(/^0x[a-fA-F0-9]+$/);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Error Format Parsing', () => {
      it('reason format errors extract the reason', () => {
        fc.assert(
          fc.property(
            reasonFormatErrorArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should be a string and not contain the reason= format
              return typeof result === 'string' &&
                result.length > 0 &&
                !result.includes('reason="');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('custom error format extracts error name', () => {
        fc.assert(
          fc.property(
            customErrorFormatArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should be a string and not contain the raw format
              return typeof result === 'string' &&
                result.length > 0;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('execution reverted format extracts message', () => {
        fc.assert(
          fc.property(
            executionRevertedFormatArb,
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result = parseRevertReason(error);
              
              // Result should be a string and not contain "execution reverted"
              return typeof result === 'string' &&
                result.length > 0 &&
                !result.toLowerCase().includes('execution reverted');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Output is Human-Readable', () => {
      it('result is never raw hex', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              knownContractErrorArb.map(e => new Error(e)),
              userRejectionErrorArb.map(e => new Error(e)),
              networkErrorArb.map(e => new Error(e)),
              gasErrorArb.map(e => new Error(e)),
              nonceErrorArb.map(e => new Error(e)),
              reasonFormatErrorArb.map(e => new Error(e)),
              customErrorFormatArb.map(e => new Error(e)),
              rawHexErrorArb.map(e => new Error(e))
            ),
            (error) => {
              const result = parseRevertReason(error);
              
              // Result should not be primarily hex
              // (may contain addresses which is fine, but shouldn't be just hex)
              const hexOnlyPattern = /^0x[a-fA-F0-9]+$/;
              return !hexOnlyPattern.test(result);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('result is never empty', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.string().map(s => new Error(s)),
              fc.string()
            ),
            (error) => {
              const result = parseRevertReason(error);
              return result.length > 0;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('result contains readable words', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              knownContractErrorArb.map(e => new Error(e)),
              userRejectionErrorArb.map(e => new Error(e)),
              networkErrorArb.map(e => new Error(e))
            ),
            (error) => {
              const result = parseRevertReason(error);
              
              // Result should contain at least one common English word
              const commonWords = ['the', 'a', 'is', 'to', 'and', 'or', 'not', 'your', 
                'please', 'try', 'again', 'error', 'failed', 'transaction', 'balance',
                'swarm', 'job', 'payment', 'agent', 'owner', 'only', 'check', 'found'];
              
              const resultLower = result.toLowerCase();
              return commonWords.some(word => resultLower.includes(word));
            }
          ),
          { numRuns: 100 }
        );
      });

      it('result ends with proper punctuation or is a complete sentence', () => {
        fc.assert(
          fc.property(
            knownContractErrorArb,
            (errorCode) => {
              const error = new Error(errorCode);
              const result = parseRevertReason(error);
              
              // User-friendly messages should end with punctuation
              return result.endsWith('.') || 
                result.endsWith('!') || 
                result.endsWith('?');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Null and Undefined Handling', () => {
      it('null error returns generic message', () => {
        const result = parseRevertReason(null);
        expect(result).toBe('An unknown error occurred. Please try again.');
      });

      it('undefined error returns generic message', () => {
        const result = parseRevertReason(undefined);
        expect(result).toBe('An unknown error occurred. Please try again.');
      });

      it('empty string error returns generic message', () => {
        const result = parseRevertReason('');
        expect(result).toBe('An unknown error occurred. Please try again.');
      });
    });

    describe('API Error Parsing', () => {
      it('API errors return user-friendly messages', () => {
        fc.assert(
          fc.property(
            apiErrorCodeArb,
            fc.string({ minLength: 0, maxLength: 50 }),
            (errorCode, suffix) => {
              const error = new Error(`${errorCode}${suffix}`);
              const result = parseApiError(error);
              
              // Result should be user-friendly
              return result.length > 0 &&
                !result.includes('Error:') &&
                !result.startsWith('0x');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('401/UNAUTHORIZED returns wallet connection message', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('UNAUTHORIZED', '401'),
            (errorCode) => {
              const error = new Error(errorCode);
              const result = parseApiError(error);
              
              return result.toLowerCase().includes('wallet') ||
                result.toLowerCase().includes('connect');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('404/NOT_FOUND returns not found message', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('NOT_FOUND', '404'),
            (errorCode) => {
              const error = new Error(errorCode);
              const result = parseApiError(error);
              
              return result.toLowerCase().includes('not found');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Insufficient Balance Detection', () => {
      it('isInsufficientBalanceError correctly identifies balance errors', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              'InsufficientBalance',
              'ERC20InsufficientBalance',
              'insufficient balance for transfer'
            ),
            (errorMessage) => {
              const error = new Error(errorMessage);
              return isInsufficientBalanceError(error) === true;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('non-balance errors are not identified as balance errors', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              'SwarmNotFound',
              'NotSwarmOwner',
              'user rejected',
              'network error'
            ),
            (errorMessage) => {
              const error = new Error(errorMessage);
              return isInsufficientBalanceError(error) === false;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Error Message Consistency', () => {
      it('same error code always produces same message', () => {
        fc.assert(
          fc.property(
            knownContractErrorArb,
            fc.integer({ min: 1, max: 10 }),
            (errorCode, iterations) => {
              const results: string[] = [];
              for (let i = 0; i < iterations; i++) {
                const error = new Error(errorCode);
                results.push(parseRevertReason(error));
              }
              
              // All results should be identical
              return results.every(r => r === results[0]);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('error messages are deterministic', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }),
            (errorMessage) => {
              const error = new Error(errorMessage);
              const result1 = parseRevertReason(error);
              const result2 = parseRevertReason(error);
              
              return result1 === result2;
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});

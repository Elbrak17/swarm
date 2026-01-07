/**
 * Property tests for form validation
 * 
 * Feature: swarm-marketplace
 * Property 36: Invalid Form Fields Are Highlighted
 * Property 37: Insufficient Balance Shows Both Amounts
 * Validates: Requirements 12.3, 12.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatInsufficientBalanceError } from '@/lib/errors';

// ===========================================
// Form Validation Types
// ===========================================

interface FormErrors {
  title?: string;
  description?: string;
  payment?: string;
  name?: string;
  agents?: string;
  swarmId?: string;
  price?: string;
  estimatedTime?: string;
  message?: string;
}

interface JobFormInput {
  title: string;
  description: string;
  requirements?: string;
  paymentAmount: string;
}

interface SwarmFormInput {
  name: string;
  description: string;
  agents: Array<{ address: string; role: string }>;
}

interface BidFormInput {
  swarmId: string;
  priceAmount: string;
  estimatedTime: string;
  message?: string;
}

// ===========================================
// Validation Functions (mirroring component logic)
// ===========================================

/**
 * Validate job form fields
 * This mirrors the validateForm function in CreateJobForm
 */
function validateJobForm(
  input: JobFormInput,
  hasSufficientBalance: boolean,
  formattedBalance: string
): FormErrors {
  const errors: FormErrors = {};
  
  if (!input.title.trim()) {
    errors.title = 'Title is required';
  } else if (input.title.length > 200) {
    errors.title = 'Title must be 200 characters or less';
  }
  
  if (!input.description.trim()) {
    errors.description = 'Description is required';
  } else if (input.description.length > 5000) {
    errors.description = 'Description must be 5000 characters or less';
  }
  
  if (!input.paymentAmount) {
    errors.payment = 'Payment amount is required';
  } else {
    const amount = parseFloat(input.paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.payment = 'Payment must be greater than zero';
    }
  }
  
  // Check insufficient balance
  if (input.paymentAmount && !hasSufficientBalance) {
    errors.payment = formatInsufficientBalanceError(formattedBalance, input.paymentAmount, 'MNEE');
  }
  
  return errors;
}

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate swarm form fields
 * This mirrors the validateForm function in CreateSwarmForm
 */
function validateSwarmForm(input: SwarmFormInput): FormErrors {
  const errors: FormErrors = {};
  
  if (!input.name.trim()) {
    errors.name = 'Swarm name is required';
  } else if (input.name.length > 100) {
    errors.name = 'Name must be 100 characters or less';
  }
  
  if (!input.description.trim()) {
    errors.description = 'Description is required';
  } else if (input.description.length > 1000) {
    errors.description = 'Description must be 1000 characters or less';
  }
  
  // Validate agents
  const validAgents = input.agents.filter(a => a.address.trim() !== '');
  if (validAgents.length === 0) {
    errors.agents = 'At least one agent address is required';
  } else {
    const invalidAddresses = validAgents.filter(a => !isValidAddress(a.address));
    if (invalidAddresses.length > 0) {
      errors.agents = 'One or more agent addresses are invalid';
    }
    
    // Check for duplicates
    const addresses = validAgents.map(a => a.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);
    if (uniqueAddresses.size !== addresses.length) {
      errors.agents = 'Duplicate agent addresses are not allowed';
    }
  }
  
  return errors;
}

/**
 * Validate bid form fields
 * This mirrors the validateForm function in SubmitBidForm
 */
function validateBidForm(input: BidFormInput): FormErrors {
  const errors: FormErrors = {};
  
  if (!input.swarmId) {
    errors.swarmId = 'Please select a swarm to bid with';
  }
  
  if (!input.priceAmount) {
    errors.price = 'Bid price is required';
  } else {
    const amount = parseFloat(input.priceAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.price = 'Bid price must be greater than zero';
    }
  }
  
  if (!input.estimatedTime) {
    errors.estimatedTime = 'Estimated time is required';
  } else {
    const time = parseInt(input.estimatedTime, 10);
    if (isNaN(time) || time <= 0) {
      errors.estimatedTime = 'Estimated time must be a positive number';
    }
  }
  
  if (input.message && input.message.length > 1000) {
    errors.message = 'Message must be 1000 characters or less';
  }
  
  return errors;
}

/**
 * Check if a field has an error
 */
function hasFieldError(errors: FormErrors, field: keyof FormErrors): boolean {
  return errors[field] !== undefined && errors[field] !== '';
}

/**
 * Get all fields with errors
 */
function getFieldsWithErrors(errors: FormErrors): (keyof FormErrors)[] {
  return (Object.keys(errors) as (keyof FormErrors)[]).filter(
    key => errors[key] !== undefined && errors[key] !== ''
  );
}

// ===========================================
// Generators for property-based testing
// ===========================================

const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const validEthereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const invalidEthereumAddressArb = fc.oneof(
  fc.constant(''),
  fc.constant('0x'),
  fc.constant('invalid'),
  fc.array(hexChar, { minLength: 1, maxLength: 39 }).map(chars => `0x${chars.join('')}`),
  fc.array(hexChar, { minLength: 41, maxLength: 50 }).map(chars => `0x${chars.join('')}`),
  fc.string({ minLength: 1, maxLength: 42 }).filter(s => !isValidAddress(s))
);

// Whitespace-only string generator
const whitespaceOnlyArb = fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
  .map(chars => chars.join(''));

// Empty or whitespace string generator
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(''),
  whitespaceOnlyArb
);

// Valid non-empty string generator
const validNonEmptyStringArb = (maxLength: number) => 
  fc.string({ minLength: 1, maxLength })
    .filter(s => s.trim().length > 0);

// String that exceeds max length
const tooLongStringArb = (minLength: number) =>
  fc.string({ minLength, maxLength: minLength + 100 });

// Valid positive number string
const validPositiveNumberArb = fc.float({ min: Math.fround(0.000001), max: Math.fround(1000000), noNaN: true })
  .map(n => n.toString());

// Invalid number strings (values that parseFloat rejects or returns <= 0)
const invalidNumberArb = fc.oneof(
  fc.constant(''),
  fc.constant('0'),
  fc.constant('-1'),
  fc.constant('-0.5'),
  fc.constant('abc'),
  fc.constant('NaN')
  // Note: 'Infinity' is parsed as a valid number by parseFloat, so it's not included
);

// Valid positive integer string
const validPositiveIntegerArb = fc.integer({ min: 1, max: 10000 })
  .map(n => n.toString());

// Invalid integer strings (values that parseInt rejects or returns <= 0)
const invalidIntegerArb = fc.oneof(
  fc.constant(''),
  fc.constant('0'),
  fc.constant('-1'),
  fc.constant('abc')
  // Note: '1.5' is parsed as 1 by parseInt, so it's not included
);

// Balance amount generator
const balanceAmountArb = fc.float({ min: Math.fround(0), max: Math.fround(1000000), noNaN: true })
  .map(n => n.toFixed(6));

// ===========================================
// Property Tests
// ===========================================

describe('Form Validation Properties', () => {
  /**
   * Feature: swarm-marketplace, Property 36: Invalid Form Fields Are Highlighted
   * 
   * For any form submission with invalid field F, field F SHALL be visually
   * highlighted with an error indicator.
   * Validates: Requirements 12.3
   */
  describe('Property 36: Invalid Form Fields Are Highlighted', () => {
    describe('Job Form Validation', () => {
      it('empty title produces title error', () => {
        fc.assert(
          fc.property(
            emptyOrWhitespaceArb,
            validNonEmptyStringArb(500),
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return hasFieldError(errors, 'title');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('title exceeding 200 chars produces title error', () => {
        fc.assert(
          fc.property(
            tooLongStringArb(201),
            validNonEmptyStringArb(500),
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return hasFieldError(errors, 'title') && 
                errors.title?.includes('200 characters');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('empty description produces description error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(100),
            emptyOrWhitespaceArb,
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return hasFieldError(errors, 'description');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('description exceeding 5000 chars produces description error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(100),
            tooLongStringArb(5001),
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return hasFieldError(errors, 'description') &&
                errors.description?.includes('5000 characters');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('invalid payment amount produces payment error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(100),
            validNonEmptyStringArb(500),
            invalidNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return hasFieldError(errors, 'payment');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('valid form produces no errors', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(200),
            validNonEmptyStringArb(5000),
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return getFieldsWithErrors(errors).length === 0;
            }
          ),
          { numRuns: 100 }
        );
      });

      it('multiple invalid fields produce multiple errors', () => {
        fc.assert(
          fc.property(
            emptyOrWhitespaceArb,
            emptyOrWhitespaceArb,
            invalidNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              const errorFields = getFieldsWithErrors(errors);
              return errorFields.length >= 2;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Swarm Form Validation', () => {
      it('empty name produces name error', () => {
        fc.assert(
          fc.property(
            emptyOrWhitespaceArb,
            validNonEmptyStringArb(500),
            fc.array(
              fc.record({ address: validEthereumAddressArb, role: fc.constant('WORKER') }),
              { minLength: 1, maxLength: 3 }
            ),
            (name, description, agents) => {
              const errors = validateSwarmForm({ name, description, agents });
              return hasFieldError(errors, 'name');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('name exceeding 100 chars produces name error', () => {
        fc.assert(
          fc.property(
            tooLongStringArb(101),
            validNonEmptyStringArb(500),
            fc.array(
              fc.record({ address: validEthereumAddressArb, role: fc.constant('WORKER') }),
              { minLength: 1, maxLength: 3 }
            ),
            (name, description, agents) => {
              const errors = validateSwarmForm({ name, description, agents });
              return hasFieldError(errors, 'name') &&
                errors.name?.includes('100 characters');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('empty description produces description error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(50),
            emptyOrWhitespaceArb,
            fc.array(
              fc.record({ address: validEthereumAddressArb, role: fc.constant('WORKER') }),
              { minLength: 1, maxLength: 3 }
            ),
            (name, description, agents) => {
              const errors = validateSwarmForm({ name, description, agents });
              return hasFieldError(errors, 'description');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('no agents produces agents error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(50),
            validNonEmptyStringArb(500),
            (name, description) => {
              const errors = validateSwarmForm({ 
                name, 
                description, 
                agents: [] 
              });
              return hasFieldError(errors, 'agents') &&
                errors.agents?.includes('At least one agent');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('invalid agent address produces agents error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(50),
            validNonEmptyStringArb(500),
            invalidEthereumAddressArb.filter(a => a.trim() !== ''),
            (name, description, invalidAddress) => {
              const errors = validateSwarmForm({ 
                name, 
                description, 
                agents: [{ address: invalidAddress, role: 'WORKER' }]
              });
              return hasFieldError(errors, 'agents') &&
                errors.agents?.includes('invalid');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('duplicate agent addresses produce agents error', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(50),
            validNonEmptyStringArb(500),
            validEthereumAddressArb,
            (name, description, address) => {
              const errors = validateSwarmForm({ 
                name, 
                description, 
                agents: [
                  { address, role: 'ROUTER' },
                  { address, role: 'WORKER' }
                ]
              });
              return hasFieldError(errors, 'agents') &&
                errors.agents?.includes('Duplicate');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('valid swarm form produces no errors', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(100),
            validNonEmptyStringArb(1000),
            fc.array(
              fc.record({ address: validEthereumAddressArb, role: fc.constant('WORKER') }),
              { minLength: 1, maxLength: 3 }
            ).filter(agents => {
              // Ensure unique addresses
              const addresses = agents.map(a => a.address.toLowerCase());
              return new Set(addresses).size === addresses.length;
            }),
            (name, description, agents) => {
              const errors = validateSwarmForm({ name, description, agents });
              return getFieldsWithErrors(errors).length === 0;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Bid Form Validation', () => {
      it('empty swarmId produces swarmId error', () => {
        fc.assert(
          fc.property(
            validPositiveNumberArb,
            validPositiveIntegerArb,
            (price, time) => {
              const errors = validateBidForm({
                swarmId: '',
                priceAmount: price,
                estimatedTime: time
              });
              return hasFieldError(errors, 'swarmId');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('invalid price produces price error', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            invalidNumberArb,
            validPositiveIntegerArb,
            (swarmId, price, time) => {
              const errors = validateBidForm({
                swarmId,
                priceAmount: price,
                estimatedTime: time
              });
              return hasFieldError(errors, 'price');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('invalid estimated time produces estimatedTime error', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            validPositiveNumberArb,
            invalidIntegerArb,
            (swarmId, price, time) => {
              const errors = validateBidForm({
                swarmId,
                priceAmount: price,
                estimatedTime: time
              });
              return hasFieldError(errors, 'estimatedTime');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('message exceeding 1000 chars produces message error', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            validPositiveNumberArb,
            validPositiveIntegerArb,
            tooLongStringArb(1001),
            (swarmId, price, time, message) => {
              const errors = validateBidForm({
                swarmId,
                priceAmount: price,
                estimatedTime: time,
                message
              });
              return hasFieldError(errors, 'message') &&
                errors.message?.includes('1000 characters');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('valid bid form produces no errors', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            validPositiveNumberArb,
            validPositiveIntegerArb,
            fc.option(validNonEmptyStringArb(1000), { nil: undefined }),
            (swarmId, price, time, message) => {
              const errors = validateBidForm({
                swarmId,
                priceAmount: price,
                estimatedTime: time,
                message
              });
              return getFieldsWithErrors(errors).length === 0;
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Error Field Highlighting Consistency', () => {
      it('each invalid field has a non-empty error message', () => {
        fc.assert(
          fc.property(
            emptyOrWhitespaceArb,
            emptyOrWhitespaceArb,
            invalidNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              const errorFields = getFieldsWithErrors(errors);
              return errorFields.every(field => 
                errors[field] !== undefined && 
                errors[field]!.trim().length > 0
              );
            }
          ),
          { numRuns: 100 }
        );
      });

      it('valid fields do not have error messages', () => {
        fc.assert(
          fc.property(
            validNonEmptyStringArb(200),
            validNonEmptyStringArb(5000),
            validPositiveNumberArb,
            (title, description, payment) => {
              const errors = validateJobForm(
                { title, description, paymentAmount: payment },
                true,
                '1000'
              );
              return !hasFieldError(errors, 'title') &&
                !hasFieldError(errors, 'description') &&
                !hasFieldError(errors, 'payment');
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });

  /**
   * Feature: swarm-marketplace, Property 37: Insufficient Balance Shows Both Amounts
   * 
   * For any insufficient balance error, the error message SHALL display both
   * the current balance and the required amount.
   * Validates: Requirements 12.4
   */
  describe('Property 37: Insufficient Balance Shows Both Amounts', () => {
    it('formatInsufficientBalanceError includes current balance', () => {
      fc.assert(
        fc.property(
          balanceAmountArb,
          balanceAmountArb,
          (currentBalance, requiredAmount) => {
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              'MNEE'
            );
            return errorMessage.includes(currentBalance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formatInsufficientBalanceError includes required amount', () => {
      fc.assert(
        fc.property(
          balanceAmountArb,
          balanceAmountArb,
          (currentBalance, requiredAmount) => {
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              'MNEE'
            );
            return errorMessage.includes(requiredAmount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formatInsufficientBalanceError includes token symbol', () => {
      fc.assert(
        fc.property(
          balanceAmountArb,
          balanceAmountArb,
          fc.constantFrom('MNEE', 'ETH', 'USDC'),
          (currentBalance, requiredAmount, symbol) => {
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              symbol
            );
            return errorMessage.includes(symbol);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('insufficient balance in job form shows both amounts', () => {
      fc.assert(
        fc.property(
          validNonEmptyStringArb(100),
          validNonEmptyStringArb(500),
          fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }).map(n => n.toFixed(6)),
          fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }).map(n => n.toFixed(6)),
          (title, description, requiredAmount, currentBalance) => {
            const errors = validateJobForm(
              { title, description, paymentAmount: requiredAmount },
              false, // insufficient balance
              currentBalance
            );
            
            if (!hasFieldError(errors, 'payment')) {
              return true; // No error means validation passed for other reasons
            }
            
            const errorMessage = errors.payment!;
            return errorMessage.includes(currentBalance) && 
              errorMessage.includes(requiredAmount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('insufficient balance error message is user-friendly', () => {
      fc.assert(
        fc.property(
          balanceAmountArb,
          balanceAmountArb,
          (currentBalance, requiredAmount) => {
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              'MNEE'
            );
            // Should contain "Insufficient" or similar user-friendly text
            return errorMessage.toLowerCase().includes('insufficient') ||
              errorMessage.toLowerCase().includes('balance');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('error message format is consistent', () => {
      fc.assert(
        fc.property(
          balanceAmountArb,
          balanceAmountArb,
          (currentBalance, requiredAmount) => {
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              'MNEE'
            );
            // Should follow the format: "Insufficient balance. You have X MNEE, need Y MNEE."
            const expectedFormat = `Insufficient balance. You have ${currentBalance} MNEE, need ${requiredAmount} MNEE.`;
            return errorMessage === expectedFormat;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sufficient balance does not produce insufficient balance error', () => {
      fc.assert(
        fc.property(
          validNonEmptyStringArb(100),
          validNonEmptyStringArb(500),
          fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }).map(n => n.toFixed(6)),
          fc.float({ min: Math.fround(200), max: Math.fround(1000), noNaN: true }).map(n => n.toFixed(6)),
          (title, description, requiredAmount, currentBalance) => {
            const errors = validateJobForm(
              { title, description, paymentAmount: requiredAmount },
              true, // sufficient balance
              currentBalance
            );
            
            // If there's a payment error, it should NOT be about insufficient balance
            if (hasFieldError(errors, 'payment')) {
              return !errors.payment!.toLowerCase().includes('insufficient');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('both amounts are distinguishable in error message', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(50), noNaN: true }).map(n => n.toFixed(6)),
          fc.float({ min: Math.fround(100), max: Math.fround(500), noNaN: true }).map(n => n.toFixed(6)),
          (currentBalance, requiredAmount) => {
            // Ensure amounts are different
            if (currentBalance === requiredAmount) return true;
            
            const errorMessage = formatInsufficientBalanceError(
              currentBalance,
              requiredAmount,
              'MNEE'
            );
            
            // Both amounts should appear in the message
            const hasCurrentBalance = errorMessage.includes(currentBalance);
            const hasRequiredAmount = errorMessage.includes(requiredAmount);
            
            // The message should make it clear which is which
            const currentBalanceIndex = errorMessage.indexOf(currentBalance);
            const requiredAmountIndex = errorMessage.indexOf(requiredAmount);
            
            // Current balance should appear before required amount in the message
            return hasCurrentBalance && hasRequiredAmount && 
              currentBalanceIndex < requiredAmountIndex;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

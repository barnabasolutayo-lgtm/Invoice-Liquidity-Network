export class ILNError extends Error {
  public code: string;
  public remediation: string;

  constructor(message: string, code: string, remediation: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.code = code;
    this.remediation = remediation;
  }
}

export class InvalidDiscountRateError extends ILNError {
  constructor() { 
    super("Invalid discount rate provided.", "INVALID_DISCOUNT_RATE", "Ensure the discount rate is within the allowed bounds."); 
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TokenMismatchError extends ILNError {
  constructor() { 
    super("Token mismatch in transaction.", "TOKEN_MISMATCH", "Verify that the correct token addresses are being used."); 
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PayerReputationTooLowError extends ILNError {
  constructor() { 
    super("Payer reputation is too low.", "PAYER_REPUTATION_TOO_LOW", "The payer must improve their reputation score before proceeding."); 
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientBalanceError extends ILNError {
  constructor(message = "Insufficient balance to complete the transaction.", remediation = "Ensure the account has enough funds before retrying.") {
    super(message, "INSUFFICIENT_BALANCE", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends ILNError {
  constructor(message = "Network request failed.", remediation = "Check your internet connection or the RPC server status.") {
    super(message, "NETWORK_ERROR", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TransactionFailedError extends ILNError {
  constructor(message = "Transaction execution failed on-chain.", remediation = "Review transaction logs, fee configuration, or contract state.") {
    super(message, "TRANSACTION_FAILED", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ILNError {
  constructor(message = "Validation failed.", remediation = "Check input parameters.") {
    super(message, "VALIDATION_ERROR", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WalletNotConnectedError extends ILNError {
  constructor(message = "Wallet is not connected.", remediation = "Connect your wallet before calling state-changing operations.") {
    super(message, "WALLET_NOT_CONNECTED", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GenericContractError extends ILNError {
  constructor(rawError: string) { 
    super(`Contract error: ${rawError}`, "CONTRACT_ERROR", "Check contract logic or inputs."); 
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SimulationError extends ILNError {
  constructor(message = "Transaction simulation failed.", remediation = "Review transaction parameters and contract state.") {
    super(message, "SIMULATION_FAILED", remediation);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function parseContractError(xdrError: unknown): ILNError {
  const errorStr = typeof xdrError === 'string' ? xdrError : JSON.stringify(xdrError);
  if (errorStr.includes("InvalidDiscountRate")) return new InvalidDiscountRateError();
  if (errorStr.includes("TokenMismatch")) return new TokenMismatchError();
  if (errorStr.includes("PayerReputationTooLow")) return new PayerReputationTooLowError();
  return new GenericContractError(errorStr);
}

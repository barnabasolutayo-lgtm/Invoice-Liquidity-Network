export enum InvoiceStatus {
  Pending = "Pending",
  Funded = "Funded",
  Paid = "Paid",
  Defaulted = "Defaulted",
  Disputed = "Disputed",
}

export function isPending(status: string): boolean {
  return status === InvoiceStatus.Pending;
}

export function isFunded(status: string): boolean {
  return status === InvoiceStatus.Funded;
}

export function isPaid(status: string): boolean {
  return status === InvoiceStatus.Paid;
}

export function isDefaulted(status: string): boolean {
  return status === InvoiceStatus.Defaulted;
}

export function isDisputed(status: string): boolean {
  return status === InvoiceStatus.Disputed;
}

export function isTerminal(status: string): boolean {
  return isPaid(status) || isDefaulted(status) || isDisputed(status);
}

export const InvoiceStatusColor: Record<string, string> = {
  [InvoiceStatus.Pending]: "#F59E0B",
  [InvoiceStatus.Funded]: "#3B82F6",
  [InvoiceStatus.Paid]: "#10B981",
  [InvoiceStatus.Defaulted]: "#EF4444",
  [InvoiceStatus.Disputed]: "#8B5CF6",
};

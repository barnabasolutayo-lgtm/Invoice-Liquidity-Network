import { useCallback, useState } from 'react';
import { useILNClient } from '../context';
import { useQueryClient } from '@tanstack/react-query';

export interface SubmitInvoiceParams {
  issuer: string;
  payer: string;
  amount: number;
  discountRate: number;
  dueDate: number;
}

export interface UseSubmitInvoiceResult {
  submitInvoice: (params: SubmitInvoiceParams) => Promise<unknown>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Mutation hook for submitting a new invoice to the contract.
 *
 * Automatically invalidates invoice list queries on success.
 *
 * @returns {UseSubmitInvoiceResult} Submit function, pending state, and error
 *
 * @example
 * ```tsx
 * function SubmitInvoiceForm() {
 *   const { submitInvoice, isPending, error } = useSubmitInvoice();
 *
 *   const handleSubmit = async (data: FormData) => {
 *     const id = await submitInvoice({
 *       issuer: data.issuer,
 *       payer: data.payer,
 *       amount: data.amount,
 *       discountRate: 300,
 *       dueDate: Date.now() / 1000 + 30 * 86400,
 *     });
 *     console.log('Invoice submitted, id:', id);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <p className="error">{error.message}</p>}
 *       <button type="submit" disabled={isPending}>
 *         {isPending ? 'Submitting…' : 'Submit Invoice'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSubmitInvoice(): UseSubmitInvoiceResult {
  const client = useILNClient();
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitInvoice = useCallback(
    async (params: SubmitInvoiceParams): Promise<unknown> => {
      setIsPending(true);
      setError(null);

      try {
        const result = await (client as unknown as { submitInvoice(p: SubmitInvoiceParams): Promise<unknown> }).submitInvoice(params);
        await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to submit invoice');
        setError(e);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [client, queryClient],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { submitInvoice, isPending, error, reset };
}

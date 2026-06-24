import { useCallback, useState } from 'react';
import { useILNClient } from '../context';
import { useQueryClient } from '@tanstack/react-query';

export interface FundInvoiceParams {
  invoiceId: number;
  funder: string;
}

export interface UseFundInvoiceResult {
  fundInvoice: (params: FundInvoiceParams) => Promise<void>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Mutation hook for funding an existing invoice.
 *
 * Automatically invalidates invoice queries on success so UIs stay in sync.
 *
 * @returns {UseFundInvoiceResult} Fund function, pending state, and error
 *
 * @example
 * ```tsx
 * function FundButton({ invoiceId }: { invoiceId: number }) {
 *   const { fundInvoice, isPending, error } = useFundInvoice();
 *
 *   return (
 *     <>
 *       {error && <p className="error">{error.message}</p>}
 *       <button
 *         disabled={isPending}
 *         onClick={() => fundInvoice({ invoiceId, funder: myAddress })}
 *       >
 *         {isPending ? 'Funding…' : 'Fund Invoice'}
 *       </button>
 *     </>
 *   );
 * }
 * ```
 */
export function useFundInvoice(): UseFundInvoiceResult {
  const client = useILNClient();
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fundInvoice = useCallback(
    async (params: FundInvoiceParams): Promise<void> => {
      setIsPending(true);
      setError(null);

      try {
        await (client as unknown as { fundInvoice(p: FundInvoiceParams): Promise<void> }).fundInvoice(params);
        await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed to fund invoice');
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

  return { fundInvoice, isPending, error, reset };
}

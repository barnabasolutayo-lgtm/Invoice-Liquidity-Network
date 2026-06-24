import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFundInvoice } from './useFundInvoice';
import type { FundInvoiceParams } from './useFundInvoice';
import { createMockILNClient } from '../test/mocks';
import { TestWrapper } from '../test/wrapper';

const validParams: FundInvoiceParams = {
  invoiceId: 42,
  funder: 'GDRMKYQMTNZ3XPRF7K7L3PFBJQI2S2Y2E3KJQF3KHKY3XT3LZXG3G5X2',
};

describe('useFundInvoice', () => {
  it('returns idle state initially', () => {
    const mockClient = createMockILNClient();
    const { result } = renderHook(() => useFundInvoice(), {
      wrapper: ({ children }) => <TestWrapper client={mockClient}>{children}</TestWrapper>,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls client.fundInvoice with the provided params', async () => {
    const mockClient = createMockILNClient({
      fundInvoice: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useFundInvoice(), {
      wrapper: ({ children }) => <TestWrapper client={mockClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.fundInvoice(validParams);
    });

    expect(mockClient.fundInvoice).toHaveBeenCalledWith(validParams);
  });

  it('sets isPending to true while funding and false after', async () => {
    let resolve!: () => void;
    const fundPromise = new Promise<void>((res) => { resolve = res; });

    const mockClient = createMockILNClient({
      fundInvoice: vi.fn().mockReturnValue(fundPromise),
    });

    const { result } = renderHook(() => useFundInvoice(), {
      wrapper: ({ children }) => <TestWrapper client={mockClient}>{children}</TestWrapper>,
    });

    expect(result.current.isPending).toBe(false);

    act(() => { void result.current.fundInvoice(validParams); });
    expect(result.current.isPending).toBe(true);

    await act(async () => { resolve(); });
    expect(result.current.isPending).toBe(false);
  });

  it('sets error state on failure', async () => {
    const mockError = new Error('Not enough liquidity');
    const mockClient = createMockILNClient({
      fundInvoice: vi.fn().mockRejectedValue(mockError),
    });

    const { result } = renderHook(() => useFundInvoice(), {
      wrapper: ({ children }) => <TestWrapper client={mockClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.fundInvoice(validParams).catch(() => undefined);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('reset clears the error state', async () => {
    const mockClient = createMockILNClient({
      fundInvoice: vi.fn().mockRejectedValue(new Error('failed')),
    });

    const { result } = renderHook(() => useFundInvoice(), {
      wrapper: ({ children }) => <TestWrapper client={mockClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.fundInvoice(validParams).catch(() => undefined);
    });

    expect(result.current.error).not.toBeNull();

    act(() => { result.current.reset(); });

    expect(result.current.error).toBeNull();
  });
});

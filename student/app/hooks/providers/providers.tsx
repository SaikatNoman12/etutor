import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '../../redux/store/store';
import { ConfirmProvider } from '../../contexts/ConfirmProvider';
import { queryClient } from '../../lib/queryClient';

/**
 * Two stores, deliberately separate.
 *   QueryClient — everything that comes from the API.
 *   Redux       — auth/session and cross-screen UI state only.
 * Server data must never land in a Redux slice; that is what produced screens
 * disagreeing about the same record.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}><ConfirmProvider>{children}</ConfirmProvider></Provider>
    </QueryClientProvider>
  );
}

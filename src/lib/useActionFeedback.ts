import { useCallback, useEffect, useState } from 'react';

export function useActionFeedback() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);
  const run = useCallback(<T>(action: () => T, success: string): T | undefined => {
    try {
      const result = action();
      setError('');
      setMessage(success);
      return result;
    } catch (caught) {
      setMessage('');
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
      return undefined;
    }
  }, []);
  return { message, error, run, clearError: () => setError('') };
}

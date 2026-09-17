import { useState, useEffect } from 'react';

/**
 * Hook trì hoãn cập nhật giá trị (Debounce)
 * @param value Giá trị đầu vào (VD: text tìm kiếm)
 * @param delay Thời gian chờ (mili-giây, mặc định 250ms)
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

import { useContext } from 'react';
import { SettingsContext } from './SettingsContext';

// Hook này giúp các component khác lấy dữ liệu cài đặt dễ dàng
export const useSettings = () => {
  const context = useContext(SettingsContext);
  
  // Bắt lỗi nếu lỡ quên bọc Provider ở ngoài cùng
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
};
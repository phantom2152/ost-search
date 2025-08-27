import React, { useState, useEffect } from 'react';
import { LocalStorage } from '../utils/storage';
import type { QuotaInfo } from '../types/frontend';

const QuotaDisplay: React.FC = () => {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [displayQuota, setDisplayQuota] = useState<number | null>(null);

  useEffect(() => {
    const stored = LocalStorage.getQuotaInfo();
    setQuotaInfo(stored);

    if (stored) {
      const now = new Date();
      const rechargeDate = new Date(stored.recharge_date);
      
      if (now > rechargeDate) {
        // Quota has recharged, show full quota (assuming 200 is the daily limit)
        setDisplayQuota(100);
      } else {
        // Show stored quota
        setDisplayQuota(stored.remaining_downloads);
      }
    }
  }, []);

  if (!quotaInfo) {
    return (
      <div className="text-sm text-gray-600">
        💡 Download a subtitle to see your quota
      </div>
    );
  }

  const now = new Date();
  const rechargeDate = new Date(quotaInfo.recharge_date);
  const isRecharged = now > rechargeDate;

  // Format the recharge date in IST
  const formatRechargeTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="text-sm text-gray-600">
      <span className="font-medium">
        {displayQuota} downloads remaining
      </span>
      {isRecharged && (
        <span className="ml-2 text-green-600">✨ Refreshed!</span>
      )}
      {!isRecharged && (
        <div className="mt-1 text-xs text-gray-500">
          Resets: {formatRechargeTime(quotaInfo.recharge_date)} IST
        </div>
      )}
    </div>
  );
};

export default QuotaDisplay;
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
        setDisplayQuota(200);
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

  return (
    <div className="text-sm text-gray-600">
      <span className="font-medium">
        {displayQuota} downloads remaining
      </span>
      {isRecharged && (
        <span className="ml-2 text-green-600">✨ Refreshed!</span>
      )}
      {!isRecharged && (
        <span className="ml-2 text-gray-500">
          • Resets at midnight UTC
        </span>
      )}
    </div>
  );
};

export default QuotaDisplay;
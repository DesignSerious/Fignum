import React from 'react';
import { Clock, CreditCard, Zap } from 'lucide-react';
import { TrialInfo } from '../types/user';

interface TrialBannerProps {
  trialInfo: TrialInfo;
  onUpgrade: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ trialInfo, onUpgrade }) => {
  const { subscription_status, days_remaining, has_access } = trialInfo;

  // Don't show banner for active subscribers
  if (subscription_status === 'active') {
    return null;
  }

  // Trial expired
  if (!has_access || subscription_status === 'expired') {
    return (
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={20} />
            <div>
              <span className="font-semibold">Trial Expired</span>
              <span className="ml-2">Upgrade to continue using Fignum</span>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <CreditCard size={16} />
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  // Active trial
  if (subscription_status === 'trial') {
    const isLastDay = days_remaining <= 1;
    const isLastThreeDays = days_remaining <= 3;
    
    return (
      <div className={`px-4 py-3 ${isLastDay ? 'bg-red-600' : isLastThreeDays ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={20} />
            <div>
              <span className="font-semibold">
                {isLastDay 
                  ? 'Last Day of Trial!' 
                  : `${days_remaining} Day${days_remaining !== 1 ? 's' : ''} Left in Trial`
                }
              </span>
              <span className="ml-2">
                {isLastDay 
                  ? 'Upgrade today to keep your projects' 
                  : 'Upgrade anytime to continue after trial'
                }
              </span>
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <CreditCard size={16} />
            Upgrade - $19.99/month
          </button>
        </div>
      </div>
    );
  }

  return null;
};
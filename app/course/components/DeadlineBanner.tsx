"use client";

import {
  formatDualDate,
  isDeadlineDayPassed,
  getDeadlineDaysRemaining,
} from '@/lib/utils/date-utils';

interface DeadlineBannerProps {
  deadline: string; // ISO string
}

export default function DeadlineBanner({ deadline }: DeadlineBannerProps) {
  const isPassed = isDeadlineDayPassed(deadline);
  const daysRemaining = getDeadlineDaysRemaining(deadline);
  const { gregorian, hebrew } = formatDualDate(deadline);

  if (isPassed) {
    return (
      <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-5 py-4 shadow-sm" role="alert">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-red-800">
              תאריך ההגשה עבר — {hebrew} <span className="font-normal text-red-600 text-sm">({gregorian})</span>
            </p>
            <p className="mt-1 text-sm text-red-700">
              לא ניתן להגיש מטלות לאחר תאריך היעד.
              אם יש שאלות, יש לפנות למנהל.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active deadline
  const urgentThreshold = 7; // days
  const isUrgent = daysRemaining <= urgentThreshold;

  const colorClasses = isUrgent ? 'border-orange-300 bg-orange-50' : 'border-blue-200 bg-blue-50';
  const iconBg = isUrgent ? 'bg-orange-100' : 'bg-blue-100';
  const iconColor = isUrgent ? 'text-orange-600' : 'text-blue-600';
  const titleColor = isUrgent ? 'text-orange-800' : 'text-blue-800';
  const subColor = isUrgent ? 'text-orange-600' : 'text-blue-600';
  const textColor = isUrgent ? 'text-orange-700' : 'text-blue-700';
  const badgeBg = isUrgent
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';

  return (
    <div className={`mb-6 rounded-xl border ${colorClasses} px-5 py-4 shadow-sm`} role="note">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 ${iconBg} rounded-full flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
          <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-base font-semibold ${titleColor}`}>
              תאריך יעד לסיום הקורס: {hebrew} <span className={`font-normal text-sm ${subColor}`}>({gregorian})</span>
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeBg}`}>
              {daysRemaining === 0
                ? 'היום הוא יום ההגשה האחרון!'
                : daysRemaining === 1
                  ? 'נותר יום אחד!'
                  : `נותרו ${daysRemaining} ימים`}
            </span>
          </div>
          <p className={`mt-1 text-sm ${textColor}`}>
            {isUrgent
              ? 'יש לסיים את הגשת המטלות לפני תאריך זה. לאחריו לא ניתן יהיה להגיש.'
              : 'יש לסיים את הגשת כל המטלות לפני תאריך זה. לאחריו לא ניתן יהיה להגיש.'}
          </p>
        </div>
      </div>
    </div>
  );
}

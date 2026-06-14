"use client";

interface DeadlineBannerProps {
  deadline: string; // ISO string
}

function formatHebrewDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Returns true only if today is strictly after the deadline day.
 * The deadline day itself is included — submissions are allowed throughout it.
 */
function isDeadlineDayPassed(deadlineStr: string): boolean {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  // Compare calendar dates only (ignore time-of-day)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  return todayStart > deadlineStart;
}

/**
 * Days remaining until (and including) the deadline day.
 * Returns 0 on the deadline day itself, negative after.
 */
function getDaysRemaining(deadlineStr: string): number {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffMs = deadlineStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default function DeadlineBanner({ deadline }: DeadlineBannerProps) {
  const isPassed = isDeadlineDayPassed(deadline);
  const daysRemaining = getDaysRemaining(deadline);
  const formattedDate = formatHebrewDate(deadline);

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
              תאריך ההגשה עבר — {formattedDate}
            </p>
            <p className="mt-0.5 text-sm text-red-700">
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

  const colorClasses = isUrgent
    ? 'border-orange-300 bg-orange-50'
    : 'border-blue-200 bg-blue-50';
  const iconBg = isUrgent ? 'bg-orange-100' : 'bg-blue-100';
  const iconColor = isUrgent ? 'text-orange-600' : 'text-blue-600';
  const titleColor = isUrgent ? 'text-orange-800' : 'text-blue-800';
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
              תאריך יעד לסיום הקורס: {formattedDate}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeBg}`}>
              {daysRemaining === 0
                ? 'היום הוא יום ההגשה האחרון!'
                : daysRemaining === 1
                  ? 'נותר יום אחד!'
                  : `נותרו ${daysRemaining} ימים`}
            </span>
          </div>
          <p className={`mt-0.5 text-sm ${textColor}`}>
            {isUrgent
              ? 'מהרו! יש לסיים את הגשת המטלות לפני תאריך זה.'
              : 'יש לסיים את הגשת כל המטלות לפני תאריך זה.'}
          </p>
        </div>
      </div>
    </div>
  );
}

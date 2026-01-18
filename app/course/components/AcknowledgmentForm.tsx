"use client";

import { useState } from 'react';
import { AcknowledgmentFormProps, AcknowledgmentData } from '@/lib/database.types';

export default function AcknowledgmentForm({ onSubmit, isSubmitting }: AcknowledgmentFormProps) {
  const [formData, setFormData] = useState<AcknowledgmentData>({
    termsAgreed: false,
    messageRead: false,
  });

  const [errors, setErrors] = useState<{
    termsAgreed?: string;
    messageRead?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - both checkboxes must be checked (Requirements 1.3, 1.4)
    const newErrors: typeof errors = {};
    
    if (!formData.termsAgreed) {
      newErrors.termsAgreed = 'חובה לאשר את תנאי השימוש';
    }
    
    if (!formData.messageRead) {
      newErrors.messageRead = 'חובה לאשר שקראת את ההודעה';
    }

    setErrors(newErrors);

    // If no errors, submit the form
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    }
  };

  const handleCheckboxChange = (field: keyof AcknowledgmentData) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    
    // Clear error when user checks the box
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <fieldset className="space-y-1">
          <legend className="sr-only">טופס אישור תנאי השימוש</legend>
          
          {/* Terms Agreement Checkbox - Requirement 1.3 */}
          <div className="space-y-1">
            <label className="flex items-start gap-3 cursor-pointer group p-1 rounded hover:bg-white transition-colors">
              <input
                type="checkbox"
                checked={formData.termsAgreed}
                onChange={() => handleCheckboxChange('termsAgreed')}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 focus:ring-2 border-gray-300 rounded"
                disabled={isSubmitting}
                aria-describedby={errors.termsAgreed ? 'terms-error' : 'terms-description'}
                aria-invalid={errors.termsAgreed ? 'true' : 'false'}
                required
              />
              <span className="text-sm text-gray-900 leading-relaxed flex-1">
                <span id="terms-description" className="block">
                  אני מסכימ/ה ומתחייב/ת לתנאי השימוש
                </span>
              </span>
            </label>
            {errors.termsAgreed && (
              <div 
                id="terms-error" 
                className="text-red-600 text-sm mr-6 bg-red-50 border border-red-200 rounded p-2" 
                role="alert"
                aria-live="polite"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.termsAgreed}
                </span>
              </div>
            )}
          </div>

          {/* Message Read Checkbox - Requirement 1.4 */}
          <div className="space-y-1">
            <label className="flex items-start gap-3 cursor-pointer group p-1 rounded hover:bg-white transition-colors">
              <input
                type="checkbox"
                checked={formData.messageRead}
                onChange={() => handleCheckboxChange('messageRead')}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 focus:ring-2 border-gray-300 rounded"
                disabled={isSubmitting}
                aria-describedby={errors.messageRead ? 'read-error' : 'read-description'}
                aria-invalid={errors.messageRead ? 'true' : 'false'}
                required
              />
              <span className="text-sm text-gray-900 leading-relaxed flex-1">
                <span id="read-description" className="block">
                  הבנתי שעלי לקרוא את הנחיות הקורס
                </span>
              </span>
            </label>
            {errors.messageRead && (
              <div 
                id="read-error" 
                className="text-red-600 text-sm mr-6 bg-red-50 border border-red-200 rounded p-2" 
                role="alert"
                aria-live="polite"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.messageRead}
                </span>
              </div>
            )}
          </div>
        </fieldset>

        {/* Submit Button */}
        <div className="pt-3 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting || !formData.termsAgreed || !formData.messageRead}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
            aria-label="המשך לקורס - לחצו רק לאחר סימון שתי התיבות"
            aria-describedby="submit-help"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg 
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>שומר...</span>
              </span>
            ) : (
              'אפשר להמשיך לקורס'
            )}
          </button>
          <p id="submit-help" className="text-xs text-gray-500 text-center mt-2">
            יש לסמן את שתי התיבות כדי להמשיך
          </p>
        </div>
      </form>
    </div>
  );
}
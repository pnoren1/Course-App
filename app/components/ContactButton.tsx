"use client";

import { useState } from "react";

type Props = {
  variant?: "header" | "unit";
  className?: string;
};

export default function ContactButton({ variant = "header", className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleClose = () => {
    setIsOpen(false);
    setMessage("");
    setSubmitStatus("idle");
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const { authenticatedFetch } = await import("@/lib/utils/api-helpers");

      const response = await authenticatedFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setTimeout(() => {
          handleClose();
        }, 4000);
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting contact:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonStyles =
    variant === "header"
      ? "inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 hover:text-blue-900 rounded-xl font-medium text-sm transition-all duration-200"
      : "inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-700 hover:text-blue-900 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`${buttonStyles} ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span>יצירת קשר</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {submitStatus === "success" ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">הפנייה נשלחה!</h3>
                <p className="text-slate-600">נחזור אליך בהקדם 💙</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">יצירת קשר</h3>
                    <p className="text-sm text-slate-600">שאלה, בקשה או קושי? נשמח לעזור</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      במה נוכל לעזור?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="כתבי כאן את שאלתך, בקשתך או הקושי שנתקלת בו..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                      rows={5}
                      autoFocus
                    />
                  </div>

                  {submitStatus === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      אופס! משהו השתבש. נסי שוב בעוד רגע.
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>שולח...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>שליחה</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

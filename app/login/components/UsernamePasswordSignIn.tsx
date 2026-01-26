"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  onError?: (msg: string) => void;
};

export default function UsernamePasswordSignIn({ onError }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      onError?.("יש למלא את כל השדות");
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        console.error("Sign in error:", error);
        
        // Handle specific error cases
        if (error.message.includes("Invalid login credentials")) {
          onError?.("שם משתמש או סיסמה שגויים");
        } else if (error.message.includes("Email not confirmed")) {
          onError?.("יש לאמת את כתובת האימייל לפני ההתחברות");
        } else if (error.message.includes("Too many requests")) {
          onError?.("יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר");
        } else {
          onError?.(error.message || "שגיאה בהתחברות");
        }
        return;
      }

      if (data.user) {
        // בדיקה שהמשתמש קיים במסד הנתונים
        try {
          const { data: profile } = await supabase
            .from('user_profile')
            .select('user_id')
            .eq('user_id', data.user.id)
            .single();
          
          if (profile) {
            // המשתמש קיים במסד הנתונים, אפשר להפנות לקורס
            router.push('/course');
          } else {
            // המשתמש לא קיים במסד הנתונים
            console.log('User authenticated but not found in database');
            await supabase.auth.signOut();
            onError?.("החשבון שלך לא מורשה לגשת למערכת. יש לפנות למנהל המערכת");
          }
        } catch (profileError) {
          console.error('Error checking user profile:', profileError);
          await supabase.auth.signOut();
          onError?.("שגיאה בבדיקת הרשאות המשתמש");
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      onError?.("אירעה שגיאה לא צפויה. אנא נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
          שם משתמש
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 text-right"
          placeholder="הכנס שם משתמש"
          dir="ltr"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
          סיסמה
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 text-right"
          placeholder="הכנס סיסמה"
          dir="ltr"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className={`w-full inline-flex justify-center items-center gap-3 transition-all duration-200 ${
          loading || !email || !password
            ? "bg-slate-100 cursor-not-allowed border-slate-200 text-slate-400" 
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md"
        } border font-medium py-3.5 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            מתחבר...
          </span>
        ) : (
          "התחברות"
        )}
      </button>
    </form>
  );
}
"use client";

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import AdminToast from '@/app/components/AdminToast';
import { rlsSupabase } from '@/lib/supabase';
import { BaseUnit } from '@/app/course/types';
import { useToast } from '@/lib/hooks/useToast';

export default function UnitsManagementPage() {
  const [units, setUnits] = useState<BaseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BaseUnit | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_number: 1
  });
  const { toast, showSuccess, showError, hideToast } = useToast();

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const { data, error } = await rlsSupabase.raw
        .from('units')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('Error loading units:', error);
        return;
      }

      setUnits(data || []);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = () => {
    setEditingUnit(null);
    setFormData({
      title: '',
      description: '',
      order_number: units.length + 1
    });
    setShowForm(true);
  };

  const handleEditUnit = (unit: BaseUnit) => {
    setEditingUnit(unit);
    setFormData({
      title: unit.title,
      description: unit.description || '',
      order_number: unit.order || 1
    });
    setShowForm(true);
  };

  const handleDeleteUnit = async (unitId: number | string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את היחידה? זה ימחק גם את כל המטלות שלה.')) {
      return;
    }

    try {
      const { error } = await rlsSupabase.raw
        .from('units')
        .delete()
        .eq('id', Number(unitId));

      if (error) {
        console.error('Error deleting unit:', error);
        showError('שגיאה במחיקת היחידה');
        return;
      }

      showSuccess('היחידה נמחקה בהצלחה');
      loadUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      showError('שגיאה במחיקת היחידה');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showError('נא למלא את כותרת היחידה');
      return;
    }

    setSaving(true);
    try {
      if (editingUnit) {
        // Update existing unit
        const { error } = await rlsSupabase.raw
          .from('units')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            order: formData.order_number,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', Number(editingUnit.id));

        if (error) {
          console.error('Error updating unit:', error);
          showError('שגיאה בעדכון היחידה');
          return;
        }

        showSuccess('היחידה עודכנה בהצלחה');
      } else {
        // Create new unit
        const { error } = await rlsSupabase.raw
          .from('units')
          .insert([{
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            order: formData.order_number
          } as any]);

        if (error) {
          console.error('Error creating unit:', error);
          showError('שגיאה ביצירת היחידה');
          return;
        }

        showSuccess('היחידה נוצרה בהצלחה');
      }

      setShowForm(false);
      setEditingUnit(null);
      loadUnits();
    } catch (error) {
      console.error('Error saving unit:', error);
      showError('שגיאה בשמירת היחידה');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUnit(null);
  };

  if (loading) {
    return (
      <AdminLayout 
        title="ניהול יחידות" 
        description="ניהול יחידות הקורס והתוכן"
        icon={
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-600">
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">טוען יחידות...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ניהול יחידות" 
      description="ניהול יחידות הקורס והתוכן"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
    >
      <div className="space-y-6">
        {/* Create Unit Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            ניהול יחידות הקורס • {units.length} יחידות קיימות
          </p>
          <button
            onClick={handleCreateUnit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            יחידה חדשה
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-in slide-in-from-top-2 duration-300">
            <h4 className="font-medium text-slate-900 mb-4">
              {editingUnit ? 'עריכת יחידה' : 'יצירת יחידה חדשה'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                    כותרת היחידה *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="הזן כותרת ליחידה"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="order_number" className="block text-sm font-medium text-slate-700 mb-1">
                    מספר סדר
                  </label>
                  <input
                    type="number"
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_number: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                  תיאור היחידה
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="תאר את תוכן היחידה"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                >
                  {saving && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {saving ? 'שומר...' : (editingUnit ? 'עדכן יחידה' : 'צור יחידה')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Units List */}
        <div className="space-y-3">
          {units.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p>אין יחידות במערכת</p>
              <p className="text-sm mt-1">לחץ על "יחידה חדשה" כדי ליצור את היחידה הראשונה</p>
            </div>
          ) : (
            units
              .sort((a, b) => {
                const orderA = a.order || a.order_number || a.id;
                const orderB = b.order || b.order_number || b.id;
                return Number(orderA) - Number(orderB);
              })
              .map((unit) => (
              <div key={unit.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                    <span className="text-sm font-medium text-blue-600">{unit.order || 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{unit.title}</h4>
                    {unit.description && (
                      <p className="text-sm text-slate-600 whitespace-pre-line">{unit.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditUnit(unit)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    עריכה
                  </button>
                  
                  <button
                    onClick={() => handleDeleteUnit(unit.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    מחיקה
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AdminToast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}
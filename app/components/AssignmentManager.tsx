"use client";

import { useState, useEffect } from 'react';
import { Assignment } from '@/lib/types/assignment';
import { Unit } from '@/app/course/types';
import { rlsSupabase } from '@/lib/supabase';
import AssignmentForm from './AssignmentForm';
import AssignmentList from './AssignmentList';
import UnitManager from './UnitManager';

export default function AssignmentManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    console.log('🚀 AssignmentManager mounted');
    loadData();
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        handleFormCancel();
      }
    };

    if (showForm) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug: Check units table status
      try {
        const debugResponse = await fetch('/api/admin/debug-units');
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('🐛 Units debug info:', debugData);
        }
      } catch (debugError) {
        console.log('⚠️ Could not fetch debug info:', debugError);
      }
      
      await Promise.all([
        loadAssignments(),
        loadUnits()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      console.log('🔄 Loading assignments...');
      
      // Work directly with Supabase like UserRoleManager does
      const { data: assignments, error } = await rlsSupabase.raw
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📋 Assignments result:', { assignments: assignments?.length || 0, error });
      
      if (error) {
        console.error('❌ Failed to load assignments:', error);
        return;
      }

      console.log('✅ Assignments loaded successfully:', assignments?.length || 0);
      setAssignments(assignments || []);
    } catch (error) {
      console.error('💥 Error loading assignments:', error);
    }
  };

  const loadUnits = async () => {
    try {
      console.log('🔄 Loading units from database...');
      
      // Try to load units from database first - try 'order' column first
      let { data: units, error } = await rlsSupabase.raw
        .from('units')
        .select('*')
        .order('order', { ascending: true });

      console.log('📚 Units result:', { units: units?.length || 0, error });
      
      if (error) {
        console.log('⚠️ Database units failed with order column, trying order_number...');
        
        // Try with order_number column name
        const { data: unitsAlt, error: errorAlt } = await rlsSupabase.raw
          .from('units')
          .select('*')
          .order('order_number', { ascending: true });
          
        if (errorAlt) {
          console.log('⚠️ Alternative query also failed, trying without order...');
          
          // Try without any order
          const { data: unitsNoOrder, error: errorNoOrder } = await rlsSupabase.raw
            .from('units')
            .select('*');
            
          if (errorNoOrder) {
            console.log('⚠️ All database queries failed, falling back to JSON file...');
            
            // Fallback to JSON file if database fails
            try {
              const response = await fetch('/course/lessons.json');
              if (response.ok) {
                const data = await response.json();
                console.log('✅ Units loaded from JSON:', data.units?.length || 0);
                setUnits(data.units || []);
                return;
              }
            } catch (jsonError) {
              console.error('❌ JSON fallback also failed:', jsonError);
            }
            
            console.error('❌ Failed to load units from all sources');
            return;
          }
          
          units = unitsNoOrder;
        } else {
          units = unitsAlt;
        }
      }

      console.log('✅ Units loaded from database:', units?.length || 0);
      
      // Convert database units to match the expected format
      const formattedUnits = units?.map(unit => {
        // Handle both database format and JSON format with type assertion
        const unitWithDbFields = unit as Unit & { 
          order?: number;
          order_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        
        // Use 'order' field first (your DB schema), then fallback to order_number, then id
        const orderValue = unitWithDbFields.order ?? unitWithDbFields.order_number ?? Number(unit.id);
        
        return {
          id: unit.id,
          title: unit.title,
          description: unit.description,
          order: orderValue,
          order_number: orderValue,
          lessons: [], // Will be populated separately if needed
          created_at: unitWithDbFields.created_at || new Date().toISOString(),
          updated_at: unitWithDbFields.updated_at || new Date().toISOString()
        };
      }) || [];
      
      // Sort units by order field
      formattedUnits.sort((a, b) => {
        const orderA = a.order || a.id;
        const orderB = b.order || b.id;
        return Number(orderA) - Number(orderB);
      });
      
      setUnits(formattedUnits);
    } catch (error) {
      console.error('💥 Error loading units:', error);
      
      // Final fallback to JSON
      try {
        const response = await fetch('/course/lessons.json');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Units loaded from JSON (final fallback):', data.units?.length || 0);
          setUnits(data.units || []);
        }
      } catch (fallbackError) {
        console.error('💥 All fallbacks failed:', fallbackError);
      }
    }
  };

  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setShowForm(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המטלה?')) {
      return;
    }

    try {
      // Check if assignment has submissions first
      const { data: submissions, error: submissionsError } = await rlsSupabase.raw
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .limit(1);

      if (submissionsError) {
        console.error('Error checking submissions:', submissionsError);
        alert('שגיאה בבדיקת הגשות קיימות');
        return;
      }

      if (submissions && submissions.length > 0) {
        alert('לא ניתן למחוק מטלה עם הגשות קיימות');
        return;
      }

      // Delete the assignment
      const { error } = await rlsSupabase.raw
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error deleting assignment:', error);
        alert('שגיאה במחיקת המטלה');
        return;
      }

      await loadAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('שגיאה במחיקת המטלה');
    }
  };

  const handleFormSubmit = async (assignmentData: Partial<Assignment>) => {
    try {
      console.log('💾 Saving assignment:', assignmentData);
      
      if (editingAssignment) {
        // Update existing assignment
        const updateData = {
          ...assignmentData,
          updated_at: new Date().toISOString()
        };

        console.log('🔄 Updating assignment:', editingAssignment.id, updateData);
        
        const { error } = await rlsSupabase.raw
          .from('assignments')
          .update(updateData)
          .eq('id', editingAssignment.id);

        if (error) {
          console.error('❌ Error updating assignment:', error);
          alert(`שגיאה בעדכון המטלה: ${error.message || 'שגיאה לא ידועה'}`);
          return;
        }
        
        console.log('✅ Assignment updated successfully');
      } else {
        // Create new assignment
        console.log('➕ Creating new assignment:', assignmentData);
        console.log('🔍 Unit ID type and value:', typeof assignmentData.unit_id, assignmentData.unit_id);
        
        // Validate required fields
        if (!assignmentData.unit_id || !assignmentData.title) {
          console.error('❌ Missing required fields:', { unit_id: assignmentData.unit_id, title: assignmentData.title });
          alert('שגיאה: חסרים שדות נדרשים (יחידה וכותרת)');
          return;
        }
        
        // Handle both UUID and integer unit_id formats
        let processedData = { ...assignmentData };
        
        // If unit_id looks like a number but we need UUID, try to find the actual UUID
        if (assignmentData.unit_id && !isNaN(Number(assignmentData.unit_id))) {
          const selectedUnit = units.find(u => u.id.toString() === assignmentData.unit_id!.toString());
          if (selectedUnit) {
            processedData.unit_id = selectedUnit.id;
            console.log('🔄 Converted unit_id to:', selectedUnit.id);
          }
        }
        
        // Ensure required fields are present for database insert
        const insertData = {
          ...processedData,
          unit_id: processedData.unit_id!,
          title: processedData.title!
        };
        
        const { error } = await rlsSupabase.raw
          .from('assignments')
          .insert([insertData]);

        if (error) {
          console.error('❌ Error creating assignment:', error);
          alert(`שגיאה ביצירת המטלה: ${error.message || 'שגיאה לא ידועה'}`);
          return;
        }
        
        console.log('✅ Assignment created successfully');
      }

      setShowForm(false);
      setEditingAssignment(null);
      await loadAssignments();
    } catch (error) {
      console.error('💥 Error saving assignment:', error);
      alert(`שגיאה בשמירת המטלה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAssignment(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">טוען נתונים...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">ניהול מטלות</h2>
              <p className="text-sm text-slate-600">
                יצירה ועריכה של מטלות עבור יחידות הקורס • {assignments.length} מטלות קיימות • {units.length} יחידות
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUnitManager(!showUnitManager)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              ניהול יחידות
            </button>
            
            <button
              onClick={handleCreateAssignment}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              מטלה חדשה
            </button>
          </div>
        </div>
      </div>

      {/* Unit Management Section */}
      {showUnitManager && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">ניהול יחידות</h3>
          </div>
          
          <UnitManager
            units={units}
            onUnitsChange={loadUnits}
          />
        </div>
      )}

      {/* Form Section - Modal */}
      {showForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              handleFormCancel();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingAssignment ? 'עריכת מטלה' : 'יצירת מטלה חדשה'}
                  </h3>
                </div>
                <button
                  onClick={handleFormCancel}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="סגור"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <AssignmentForm
                assignment={editingAssignment}
                units={units}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </div>
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">מטלות קיימות</h3>
          </div>
        </div>
        
        <AssignmentList
          assignments={assignments}
          units={units}
          onEdit={handleEditAssignment}
          onDelete={handleDeleteAssignment}
        />
      </div>
    </div>
  );
}
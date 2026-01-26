"use client";

import { Assignment } from '@/lib/types/assignment';
import { Unit } from '@/app/course/types';

interface AssignmentListProps {
  assignments: Assignment[];
  units: Unit[];
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignmentId: number) => void;
}

export default function AssignmentList({ assignments, units, onEdit, onDelete }: AssignmentListProps) {
  const getUnitTitle = (unitId: number | string) => {
    const unit = units.find(u => u.id.toString() === unitId.toString());
    return unit?.title || `יחידה ${unitId}`;
  };

  const getUnitDescription = (unitId: number | string) => {
    const unit = units.find(u => u.id.toString() === unitId.toString());
    return unit?.description;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'לא הוגדר';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const formatFileTypes = (types: string[]) => {
    return types.join(', ').toUpperCase();
  };

  // Group assignments by unit
  const assignmentsByUnit = assignments.reduce((acc, assignment) => {
    const unitId = assignment.unit_id.toString();
    if (!acc[unitId]) {
      acc[unitId] = [];
    }
    acc[unitId].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  // Get all units that have assignments, plus units without assignments
  const unitsWithAssignments = units
    .sort((a, b) => {
      // Sort by order field (try different field names)
      const orderA = a.order || a.order_number || a.id;
      const orderB = b.order || b.order_number || b.id;
      return Number(orderA) - Number(orderB);
    })
    .map(unit => ({
      ...unit,
      assignments: (assignmentsByUnit[unit.id.toString()] || [])
        .sort((a, b) => {
          // Sort assignments by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
    }));

  if (assignments.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">אין מטלות</h3>
        <p className="text-slate-600 mb-4">עדיין לא נוצרו מטלות במערכת</p>
        <p className="text-sm text-slate-500">לחץ על "מטלה חדשה" כדי ליצור את המטלה הראשונה</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {unitsWithAssignments.map((unit) => (
        <div key={unit.id} className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Unit Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{unit.title}</h3>
                {unit.description && (
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{unit.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {unit.assignments.length} מטלות
                </span>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Assignments */}
          {unit.assignments.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">אין מטלות ביחידה זו</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {unit.assignments.map((assignment) => (
                <div key={assignment.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900">{assignment.title}</h4>
                      </div>
                      
                      {assignment.description && (
                        <div className="text-slate-600 mb-3 whitespace-pre-line">{assignment.description}</div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V8a1 1 0 00-1-1" />
                          </svg>
                          <span className="text-slate-600">תאריך יעד: {formatDate(assignment.due_date)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-slate-600">
                            {assignment.estimated_duration_minutes ? `${assignment.estimated_duration_minutes} דקות` : 'לא הוגדר'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-slate-600">עד {assignment.max_file_size_mb}MB</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-slate-600">{formatFileTypes(assignment.allowed_file_types)}</span>
                        </div>
                      </div>

                      {assignment.required_files && assignment.required_files.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">קבצים נדרשים:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {assignment.required_files.map((file) => (
                              <span
                                key={file.id}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800"
                                title={file.description}
                              >
                                {file.name}
                                {file.example && (
                                  <span className="mr-1 text-green-600">({file.example})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mr-4">
                      <button
                        onClick={() => onEdit(assignment)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        עריכה
                      </button>
                      
                      <button
                        onClick={() => onDelete(assignment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        מחיקה
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
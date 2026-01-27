"use client";

import { useState, useEffect } from 'react';
import { Assignment, RequiredFile } from '@/lib/types/assignment';
import { BaseUnit } from '@/app/course/types';

interface AssignmentFormProps {
  assignment?: Assignment | null;
  units: BaseUnit[];
  onSubmit: (data: Partial<Assignment>) => void;
  onCancel: () => void;
}

export default function AssignmentForm({ assignment, units, onSubmit, onCancel }: AssignmentFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    unit_id: '',
    due_date: '',
    max_file_size_mb: 10,
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt'],
    estimated_duration_minutes: 60,
    required_files: [] as RequiredFile[]
  });

  const [newRequiredFile, setNewRequiredFile] = useState({
    name: '',
    description: '',
    example: ''
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        unit_id: assignment.unit_id?.toString() || '',
        due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
        max_file_size_mb: assignment.max_file_size_mb || 10,
        allowed_file_types: assignment.allowed_file_types || ['pdf', 'doc', 'docx', 'txt'],
        estimated_duration_minutes: assignment.estimated_duration_minutes || 60,
        required_files: assignment.required_files || []
      });
    }
  }, [assignment]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_file_size_mb' || name === 'estimated_duration_minutes' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleFileTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      allowed_file_types: checked
        ? [...prev.allowed_file_types, value]
        : prev.allowed_file_types.filter(type => type !== value)
    }));
  };

  const addRequiredFile = () => {
    if (!newRequiredFile.name.trim()) return;

    const requiredFile: RequiredFile = {
      id: Date.now().toString(),
      name: newRequiredFile.name.trim(),
      description: newRequiredFile.description.trim(),
      example: newRequiredFile.example.trim(),
      order: formData.required_files.length + 1
    };

    setFormData(prev => ({
      ...prev,
      required_files: [...prev.required_files, requiredFile]
    }));

    setNewRequiredFile({ name: '', description: '', example: '' });
  };

  const removeRequiredFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      required_files: prev.required_files.filter(file => file.id !== fileId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.unit_id) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    // Clean up the data before submitting
    const cleanedData = {
      ...formData,
      unit_id: formData.unit_id, // Keep as string for now, don't convert to int
      due_date: formData.due_date.trim() || null, // Convert empty string to null
      description: formData.description.trim() || null, // Convert empty string to null
      estimated_duration_minutes: formData.estimated_duration_minutes || null
    };

    onSubmit(cleanedData);
  };

  const fileTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'Word (DOC)' },
    { value: 'docx', label: 'Word (DOCX)' },
    { value: 'txt', label: 'Text' },
    { value: 'jpg', label: 'JPG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'zip', label: 'ZIP' },
    { value: 'rar', label: 'RAR' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
            כותרת המטלה *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="הזן כותרת למטלה"
            required
          />
        </div>

        <div>
          <label htmlFor="unit_id" className="block text-sm font-medium text-slate-700 mb-2">
            יחידה *
          </label>
          <select
            id="unit_id"
            name="unit_id"
            value={formData.unit_id}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">בחר יחידה</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
          תיאור המטלה
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="תאר את המטלה ואת הדרישות"
        />
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-slate-700 mb-2">
            תאריך יעד
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="max_file_size_mb" className="block text-sm font-medium text-slate-700 mb-2">
            גודל קובץ מקסימלי (MB)
          </label>
          <input
            type="number"
            id="max_file_size_mb"
            name="max_file_size_mb"
            value={formData.max_file_size_mb}
            onChange={handleInputChange}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="estimated_duration_minutes" className="block text-sm font-medium text-slate-700 mb-2">
            זמן משוער (דקות)
          </label>
          <input
            type="number"
            id="estimated_duration_minutes"
            name="estimated_duration_minutes"
            value={formData.estimated_duration_minutes}
            onChange={handleInputChange}
            min="5"
            step="5"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* File Types */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          סוגי קבצים מותרים
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {fileTypeOptions.map(option => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={option.value}
                checked={formData.allowed_file_types.includes(option.value)}
                onChange={handleFileTypesChange}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Required Files */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-slate-700">
            קבצים נדרשים
          </label>
          <button
            type="button"
            onClick={addRequiredFile}
            disabled={!newRequiredFile.name.trim()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הוסף קובץ נדרש
          </button>
        </div>
        
        {/* Add New Required File Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">שם הקובץ *</label>
                <input
                  type="text"
                  placeholder="לדוגמה: דוח סיכום"
                  value={newRequiredFile.name}
                  onChange={(e) => setNewRequiredFile(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">דוגמה</label>
                <input
                  type="text"
                  placeholder="לדוגמה: report.pdf"
                  value={newRequiredFile.example}
                  onChange={(e) => setNewRequiredFile(prev => ({ ...prev, example: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">תיאור הקובץ</label>
              <textarea
                placeholder="תאר מה צריך להיות בקובץ זה..."
                value={newRequiredFile.description}
                onChange={(e) => setNewRequiredFile(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Required Files List */}
        {formData.required_files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 mb-2">קבצים נדרשים ({formData.required_files.length}):</h4>
            {formData.required_files.map((file, index) => (
              <div key={file.id} className="flex items-start justify-between bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm">{file.name}</div>
                    {file.description && (
                      <div className="text-sm text-slate-600 mt-1 whitespace-pre-line">{file.description}</div>
                    )}
                    {file.example && (
                      <div className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                        דוגמה: {file.example}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRequiredFile(file.id)}
                  className="flex-shrink-0 text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  title="הסר קובץ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {formData.required_files.length === 0 && (
          <div className="text-center py-6 text-slate-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">אין קבצים נדרשים</p>
            <p className="text-xs text-slate-400 mt-1">מלא את הפרטים למעלה ולחץ "הוסף קובץ נדרש"</p>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {assignment ? 'עדכן מטלה' : 'צור מטלה'}
        </button>
      </div>
    </form>
  );
}
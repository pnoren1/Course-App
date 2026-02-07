import { rlsSupabase } from '../supabase';
import { SubmissionFile } from '../types/assignment';

export class FileService {
  private fileCache = new Map<number, { files: SubmissionFile[], timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 דקות

  async uploadFiles(files: File[], submissionId: number, userId: string): Promise<SubmissionFile[]> {
    try {
      const uploadedFiles: SubmissionFile[] = [];

      for (const file of files) {
        // Upload file to Supabase Storage
        const cleanFileName = file.name
          .replace(/[\u0590-\u05FF]/g, '') // Remove Hebrew characters
          .replace(/[^\w\.-]/g, '_') // Replace non-alphanumeric chars (except dots and hyphens) with underscore
          .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
          .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
        const fileName = `aws-course/${submissionId}/${userId}/${Date.now()}_${cleanFileName}`;
        const { data: uploadData, error: uploadError } = await rlsSupabase.storage
          .from('assignment-submissions')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw uploadError;
        }

        // Save file metadata to database
        const fileData = {
          submission_id: submissionId,
          original_filename: file.name,
          stored_filename: fileName,
          storage_path: uploadData.path,
          file_size_bytes: file.size,
          file_type: file.type,
        };

        const { data: dbData, error: dbError } = await rlsSupabase
          .from('submission_files')
          .insert(fileData)
          .select()
          .single();

        if (dbError) {
          console.error('Error saving file metadata:', dbError);
          throw dbError;
        }

        uploadedFiles.push(dbData as SubmissionFile);
      }

      // נקה cache עבור submission זה כי נוספו קבצים חדשים
      this.clearSubmissionCache(submissionId);

      return uploadedFiles;
    } catch (error) {
      console.error('Error in uploadFiles:', error);
      throw error;
    }
  }

  async downloadFile(fileId: number): Promise<Blob> {
    try {
      // Get file metadata
      const { data: fileData, error: fileError } = await rlsSupabase
        .from('submission_files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (fileError) {
        console.error('Error fetching file metadata:', fileError);
        throw fileError;
      }

      // Download file from storage
      const { data: blob, error: downloadError } = await rlsSupabase.storage
        .from('assignment-submissions')
        .download((fileData as any).storage_path);

      if (downloadError) {
        console.error('Error downloading file:', downloadError);
        throw downloadError;
      }

      return blob;
    } catch (error) {
      console.error('Error in downloadFile:', error);
      throw error;
    }
  }

  async getFilesBySubmission(submissionId: number, forceRefresh = false): Promise<SubmissionFile[]> {
    try {
      // בדוק cache אם לא מבקשים refresh מאולץ
      if (!forceRefresh) {
        const cached = this.fileCache.get(submissionId);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
          return cached.files;
        }
      }

      const { data, error } = await rlsSupabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', submissionId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.error('Error fetching files:', error);
        throw error;
      }

      const files = (data || []) as SubmissionFile[];
      
      // שמור ב-cache
      this.fileCache.set(submissionId, {
        files,
        timestamp: Date.now()
      });

      return files;
    } catch (error) {
      console.error('Error in getFilesBySubmission:', error);
      throw error;
    }
  }

  // נקה cache עבור submission מסוים (לאחר העלאת קבצים חדשים)
  clearSubmissionCache(submissionId: number) {
    this.fileCache.delete(submissionId);
  }

  // נקה את כל ה-cache
  clearAllCache() {
    this.fileCache.clear();
  }
}

export const fileService = new FileService();
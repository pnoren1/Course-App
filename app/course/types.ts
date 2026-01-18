// export type Lesson = {
//   id: number;
//   title: string;
//   embedUrl: string;
//   duration?: string;
//   locked?: boolean;
//   order?: number;
//   [key: string]: any;
// };

//  type Unit = {
//   id: number;
//   title: string;
//   description?: string;
//   order?: number;
//   lessons: Lesson[];
//   [key: string]: any;
// };

export type Lesson = {
  id: number;
  title: string;
  order: number;
  duration?: string | null;
  locked?: boolean | null;
  embedUrl: string;
  notes?: string | null;
  description?: string | null;
  is_lab?: boolean | null;
};

export type LessonFile = {
  id: number;
  lesson_id: number;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export type Unit = {
  id: number;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
};
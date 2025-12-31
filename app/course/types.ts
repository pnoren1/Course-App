export type Lesson = {
  id: number;
  title: string;
  embedUrl: string;
  duration?: string;
  locked?: boolean;
  order?: number;
  [key: string]: any;
};

export type Unit = {
  id: number;
  title: string;
  description?: string;
  order?: number;
  lessons: Lesson[];
  [key: string]: any;
};
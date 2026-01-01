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
  duration?: string;
  locked?: boolean;
  embedUrl: string;
  notes?: string;
  description?: string;
  is_lab?: boolean;
};

export type Unit = {
  id: number;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];

};
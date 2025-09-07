export interface Topic {
  id: string;
  Category: string;
  Topic: string;
  Priority: 'High' | 'Medium' | 'Low';
  Notes: string;
  PracticeExercise: string;
  completed: boolean;
  KnowledgeCovered: string;
  status: 'To Do' | 'In Progress' | 'Done';
  link?: string;
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Topic {
  id: string;
  Category: string;
  Topic: string;
  Priority: 'High' | 'Medium' | 'Low';
  Notes: string;
  PracticeExercise: string;
  completed: boolean;
  KnowledgeCovered: string;
  status: 'To Do' | 'In Progress' | 'Done';
  link: string;
}

function convertToCSV(data: Topic[]): string {
  const header = 'id,Category,Topic,Priority,Notes,PracticeExercise,link,completed,KnowledgeCovered,status';
  const rows = data.map(topic => {
    return `${topic.id},"${topic.Category}","${topic.Topic}",${topic.Priority},"${topic.Notes}","${topic.PracticeExercise}",${topic.link},${topic.completed},"${topic.KnowledgeCovered}",${topic.status}`;
  });
  return [header, ...rows].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const topics: Topic[] = await req.json();
    const csvData = convertToCSV(topics);
    const filePath = path.join(process.cwd(), 'public', 'data.csv');
    fs.writeFileSync(filePath, csvData);
    return NextResponse.json({ message: 'CSV updated successfully' });
  } catch (error) {
    console.error('Error updating CSV:', error);
    return NextResponse.json({ message: 'Error updating CSV' }, { status: 500 });
  }
}


"use client";
import React, { useState } from 'react';

// --- TypeScript Interfaces ---
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
}

interface KanbanViewProps {
  topics: Topic[];
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
}

const KanbanColumn: React.FC<{
  title: 'To Do' | 'In Progress' | 'Done';
  topics: Topic[];
  onDrop: (topicId: string, status: 'To Do' | 'In Progress' | 'Done') => void;
  onDragStart: (e: React.DragEvent, topic: Topic) => void;
}> = ({ title, topics, onDrop, onDragStart }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const topicId = e.dataTransfer.getData('topicId');
    onDrop(topicId, title);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="bg-slate-800 rounded-lg p-4 flex-1"
    >
      <h3 className="text-xl font-bold text-slate-200 mb-4">{title}</h3>
      <div className="space-y-4">
        {topics.map(topic => (
          <div
            key={topic.id}
            draggable
            onDragStart={(e) => onDragStart(e, topic)}
            className="bg-slate-700 rounded-lg p-4 cursor-grab"
          >
            <h4 className="font-bold text-slate-100">{topic.Topic}</h4>
            <p className="text-sm text-slate-400">{topic.Category}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({ topics, setTopics }) => {
  const columns: ('To Do' | 'In Progress' | 'Done')[] = ['To Do', 'In Progress', 'Done'];

  const handleDragStart = (e: React.DragEvent, topic: Topic) => {
    e.dataTransfer.setData('topicId', topic.id);
  };

  const handleDrop = (topicId: string, status: 'To Do' | 'In Progress' | 'Done') => {
    setTopics(prevTopics =>
      prevTopics.map(topic =>
        topic.id === topicId ? { ...topic, status, completed: status === 'Done' } : topic
      )
    );
  };

  return (
    <div className="flex gap-6">
      {columns.map(status => (
        <KanbanColumn
          key={status}
          title={status}
          topics={topics.filter(topic => topic.status === status)}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
};

export default KanbanView;

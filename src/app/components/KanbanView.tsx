"use client";
import React, { useState } from 'react';
import { Topic } from '../types';

interface KanbanViewProps {
  topics: Topic[];
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
}

const KanbanColumn: React.FC<{
  title: 'To Do' | 'In Progress' | 'Done';
  topics: Topic[];
  onDrop: (topicId: string, status: 'To Do' | 'In Progress' | 'Done') => void;
  onDragStart: (e: React.DragEvent, topic: Topic) => void;
  isCompact: boolean;
  selectedTopics: string[];
  handleSelectTopic: (topicId: string) => void;
}> = ({ title, topics, onDrop, onDragStart, isCompact, selectedTopics, handleSelectTopic }) => {
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
            onClick={() => handleSelectTopic(topic.id)}
            className={`bg-slate-700 rounded-lg p-4 cursor-pointer ${selectedTopics.includes(topic.id) ? 'ring-2 ring-cyan-400' : ''} ${isCompact ? 'p-2' : 'p-4'}`}
          >
            <h4 className={`font-bold text-slate-100 ${isCompact ? 'text-sm' : ''}`}>{topic.Topic}</h4>
            {!isCompact && <p className="text-sm text-slate-400">{topic.Category}</p>}
            <div className="mt-2">
              <button onClick={(e) => { e.stopPropagation(); window.open(topic.link, '_blank'); }} className="text-cyan-400 hover:text-cyan-300 transition font-medium text-sm">Open Link</button>
              <button onClick={(e) => {e.stopPropagation(); navigator.clipboard.writeText(`Topic: ${topic.Topic}\n\nNotes: ${topic.Notes}\n\nPractice Exercise: ${topic.PracticeExercise}`); alert('Copied to clipboard!')}} className="text-cyan-400 hover:text-cyan-300 transition font-medium text-sm ml-2">Copy Info</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const KanbanView: React.FC<KanbanViewProps> = ({ topics, setTopics }) => {
  const [isCompact, setIsCompact] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
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

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopics(prevSelected =>
      prevSelected.includes(topicId)
        ? prevSelected.filter(id => id !== topicId)
        : [...prevSelected, topicId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTopics(topics.map(topic => topic.id));
  };

  const handleUnselectAll = () => {
    setSelectedTopics([]);
  };

  const handleUpdateStatus = (status: 'To Do' | 'In Progress' | 'Done') => {
    setTopics(prevTopics =>
      prevTopics.map(topic =>
        selectedTopics.includes(topic.id) ? { ...topic, status, completed: status === 'Done' } : topic
      )
    );
    setSelectedTopics([]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={handleSelectAll} className="bg-cyan-500 text-white px-4 py-2 rounded-lg">Select All</button>
          <button onClick={handleUnselectAll} className="bg-cyan-500 text-white px-4 py-2 rounded-lg">Unselect All</button>
          <button onClick={() => handleUpdateStatus('To Do')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">Mark as To Do</button>
          <button onClick={() => handleUpdateStatus('In Progress')} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Mark as In Progress</button>
          <button onClick={() => handleUpdateStatus('Done')} className="bg-green-500 text-white px-4 py-2 rounded-lg">Mark as Complete</button>
        </div>
        <div className="flex items-center">
          <input type="checkbox" id="compactView" checked={isCompact} onChange={() => setIsCompact(!isCompact)} className="mr-2" />
          <label htmlFor="compactView">Compact View</label>
        </div>
      </div>
      <div className="flex gap-6">
        {columns.map(status => (
          <KanbanColumn
            key={status}
            title={status}
            topics={topics.filter(topic => topic.status === status)}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            isCompact={isCompact}
            selectedTopics={selectedTopics}
            handleSelectTopic={handleSelectTopic}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanView;

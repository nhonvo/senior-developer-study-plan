"use client";
import React, { useState, useEffect } from 'react';
import ViewSwitcher from './components/ViewSwitcher';
import KanbanView from './components/KanbanView';

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

type Category = string;

// --- Helper function to parse CSV data ---
export const parseCSV = (csvString: string): Partial<Topic>[] => {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const records: Partial<Topic>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    if (values.length > 0) {
      const record: Partial<Topic> = {};
      headers.forEach((header, j) => {
        let value = values[j] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        (record as any)[header] = value;
      });
      records.push(record);
    }
  }
  return records;
};

// --- Main Application Component ---
export default function App() {
  // --- State Management ---
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [draggedItem, setDraggedItem] = useState<{ item: Topic | Category; type: 'TOPIC' | 'CATEGORY'; index: number } | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');

  // --- Data Loading and Structuring ---
  useEffect(() => {
    try {
      const storedTopics = localStorage.getItem('studyPlanTopics');
      const storedCategories = localStorage.getItem('studyPlanCategories');
      const storedCollapsed = localStorage.getItem('studyPlanCollapsed');

      if (storedTopics && storedCategories) {
        setTopics(JSON.parse(storedTopics));
        setCategories(JSON.parse(storedCategories));
        setCollapsedCategories(storedCollapsed ? JSON.parse(storedCollapsed) : []);
      } else {
        fetch('/data.csv')
          .then(response => response.text())
          .then(csvText => {
            const parsedData = parseCSV(csvText);
            const initialTopics: Topic[] = parsedData.map(topic => ({
              ...topic,
              id: topic.id || crypto.randomUUID(),
              completed: false,
              KnowledgeCovered: '',
              Category: topic.Category || 'Uncategorized',
              Topic: topic.Topic || 'Untitled',
              Priority: topic.Priority || 'Medium',
              Notes: topic.Notes || '',
              PracticeExercise: topic.PracticeExercise || '',
              status: 'To Do',
            }));
            setTopics(initialTopics);

            const initialCategories: Category[] = [...new Set(initialTopics.map(t => t.Category))];
            setCategories(initialCategories);
          })
          .catch(error => console.error("Error loading CSV data:", error));
      }
    } catch (error) {
      console.error("Failed to load or parse data:", error);
    }
  }, []);

  // --- Data Persistence ---
  useEffect(() => {
    try {
      if (topics.length > 0) {
        localStorage.setItem('studyPlanTopics', JSON.stringify(topics));
      }
      if (categories.length > 0) {
        localStorage.setItem('studyPlanCategories', JSON.stringify(categories));
      }
      if (collapsedCategories.length > 0) {
        localStorage.setItem('studyPlanCollapsed', JSON.stringify(collapsedCategories));
      }
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  }, [topics, categories, collapsedCategories]);

  // --- CRUD and Event Handlers ---
  const handleToggleComplete = (id: string) => {
    setTopics(topics.map(topic =>
      topic.id === id ? { ...topic, completed: !topic.completed, status: !topic.completed ? 'Done' : 'To Do' } : topic
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      const topicToDelete = topics.find(t => t.id === id);
      if (!topicToDelete) return;
      const remainingTopics = topics.filter(topic => topic.id !== id);
      setTopics(remainingTopics);

      const isCategoryEmpty = !remainingTopics.some(t => t.Category === topicToDelete.Category);
      if (isCategoryEmpty) {
        setCategories(categories.filter(c => c !== topicToDelete.Category));
      }
    }
  };

  const handleAddTopic = () => {
    setCurrentTopic({ id: '', Category: '', Topic: '', Priority: 'Medium', Notes: '', PracticeExercise: '', KnowledgeCovered: '', completed: false, status: 'To Do' });
    setIsModalOpen(true);
  };

  const handleEditTopic = (topic: Topic) => {
    setCurrentTopic(topic);
    setIsModalOpen(true);
  };

  const handleSaveTopic = () => {
    if (!currentTopic || !currentTopic.Topic || !currentTopic.Category) {
      alert('Please fill out at least the Category and Topic fields.');
      return;
    }

    if (currentTopic.id) { // Editing
      let oldCategory: Category | null = null;
      const updatedTopics = topics.map(t => {
        if (t.id === currentTopic.id) {
          oldCategory = t.Category;
          return currentTopic;
        }
        return t;
      });
      setTopics(updatedTopics);

      if (oldCategory && oldCategory !== currentTopic.Category) {
        if (!updatedTopics.some(t => t.Category === oldCategory)) {
          setCategories(categories.filter(c => c !== oldCategory));
        }
      }
      if (!categories.includes(currentTopic.Category)) {
        setCategories([...categories, currentTopic.Category]);
      }

    } else { // Adding
      const newTopic: Topic = { ...currentTopic, id: crypto.randomUUID() };
      setTopics([...topics, newTopic]);
      if (!categories.includes(newTopic.Category)) {
        setCategories([...categories, newTopic.Category]);
      }
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTopic(null);
  };

  const handleToggleCategoryCollapse = (categoryName: Category) => {
    setCollapsedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // --- Native Drag-and-Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, item: Topic | Category, type: 'TOPIC' | 'CATEGORY', index: number) => {
    setDraggedItem({ item, type, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetItem: Topic | Category, targetType: 'TOPIC' | 'CATEGORY', targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'CATEGORY' && targetType === 'CATEGORY') {
      const reorderedCategories = Array.from(categories);
      const [movedCategory] = reorderedCategories.splice(draggedItem.index, 1);
      reorderedCategories.splice(targetIndex, 0, movedCategory);
      setCategories(reorderedCategories);
    }

    if (draggedItem.type === 'TOPIC' && targetType === 'TOPIC' && typeof draggedItem.item === 'object' && 'id' in draggedItem.item && typeof targetItem === 'object' && 'id' in targetItem) {
      const draggedId = draggedItem.item.id;
      const targetId = targetItem.id;
      if (draggedId === targetId) return;

      const topicsCopy = [...topics];
      const draggedTopic = topics.find(t => t.id === draggedId);
      if (!draggedTopic) return;

      draggedTopic.Category = targetItem.Category;

      const itemsWithoutDragged = topicsCopy.filter(t => t.id !== draggedId);
      const targetIdx = itemsWithoutDragged.findIndex(t => t.id === targetId);

      itemsWithoutDragged.splice(targetIdx, 0, draggedTopic);
      setTopics(itemsWithoutDragged);
    }

    setDraggedItem(null);
  };

  // --- Filtering and Progress Calculation ---
  const filteredTopics = topics.filter(topic =>
    (topic.Topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (topic.Category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTopicsForCategory = (category: Category) => {
    return topics.filter(t => t.Category === category)
      .filter(t => !searchTerm || filteredTopics.some(ft => ft.id === t.id));
  }

  const completedCount = topics.filter(t => t.completed).length;
  const totalCount = topics.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // --- Render ---
  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400 mb-2">Senior Developer Study Plan</h1>
          <p className="text-lg text-slate-400">Drag & drop to organize your learning path.</p>
        </header>

        <div className="mb-6 p-4 bg-slate-800 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-1/2">
            <input type="text" placeholder="Search by topic or category..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button onClick={handleAddTopic} className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 font-bold py-2 px-6 rounded-md transition-transform transform hover:scale-105 shadow-md">
            Add New Topic
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-slate-300">Progress</span><span className="text-sm font-medium text-slate-300">{completedCount} of {totalCount} completed</span></div>
          <div className="w-full bg-slate-700 rounded-full h-2.5"><div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}% ` }}></div></div>
        </div>

        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />

        {currentView === 'list' ? (
          <div>
            {categories.map((category, index) => {
              const topicsForCategory = getTopicsForCategory(category);
              const isCollapsed = collapsedCategories.includes(category);
              if (searchTerm && topicsForCategory.length === 0) return null;

              return (
                <div key={category} className="mb-8"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category, 'CATEGORY', index)}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, category, 'CATEGORY', index)}
                    onClick={() => handleToggleCategoryCollapse(category)}
                    className={`flex items-center justify-between mb-4 p-2 rounded-md bg-slate-800 / 50 hover: bg-slate-700 / 50 cursor-pointer transition-opacity ${draggedItem && draggedItem.type === 'CATEGORY' && draggedItem.item === category ? 'opacity-50' : ''} `}>
                    <div className="flex items-center cursor-grab">
                      <svg className="w-5 h-5 text-slate-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      <h3 className="text-2xl font-bold text-slate-200">{category}</h3>
                    </div>
                    <svg className={`w-6 h-6 text-slate-400 transform transition-transform ${!isCollapsed ? 'rotate-180' : ''} `} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {topicsForCategory.map((topic, topicIndex) => (
                        <div
                          key={topic.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, topic, 'TOPIC', topicIndex); }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, topic, 'TOPIC', topicIndex); }}
                          className={`bg-slate-800 rounded-lg shadow-lg p-6 border-l-4 transition-all duration-300 cursor-grab${draggedItem && draggedItem.type === 'TOPIC' && 'id' in draggedItem.item && draggedItem.item.id === topic.id ? 'opacity-50' : ''} ${topic.completed ? 'border-green-500 opacity-60' : topic.Priority === 'High' ? 'border-red-500' : topic.Priority === 'Medium' ? 'border-yellow-500' : 'border-cyan-500'}`}
                        >
                          <header className="flex justify-between items-start mb-3">
                            <span className="text-sm font-semibold text-cyan-400">{topic.Category}</span>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${topic.Priority === 'High' ? 'bg-red-500/20 text-red-300' : topic.Priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'} `}>{topic.Priority}</span>
                          </header>
                          <h2 className={`text-xl font-bold text-slate-100 mb-4 ${topic.completed ? 'line-through' : ''} `}>{topic.Topic}</h2>
                          <div className="space-y-4 text-sm">
                            <div><h4 className="font-semibold text-slate-400 mb-1">Notes</h4><p className="text-slate-300 whitespace-pre-wrap">{topic.Notes || 'N/A'}</p></div>
                            <div><h4 className="font-semibold text-slate-400 mb-1">Practice Exercise</h4><p className="text-slate-300 whitespace-pre-wrap">{topic.PracticeExercise || 'N/A'}</p></div>
                            <div><h4 className="font-semibold text-slate-400 mb-1">Knowledge Covered</h4><p className="text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-3 rounded-md">{topic.KnowledgeCovered || 'No knowledge notes recorded yet.'}</p></div>
                          </div>
                          <footer className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                            <div className="flex items-center"><input type="checkbox" checked={topic.completed} onChange={() => handleToggleComplete(topic.id)} className="h-5 w-5 rounded bg-slate-600 border-slate-500 text-cyan-500 focus:ring-cyan-600 cursor-pointer" id={`complete-${topic.id}`} /><label htmlFor={`complete-${topic.id}`} className="ml-2 text-sm text-slate-400 cursor-pointer">Mark as Completed</label></div>
                            <div className="space-x-3"><button onClick={() => handleEditTopic(topic)} className="text-cyan-400 hover:text-cyan-300 transition font-medium">Edit</button><button onClick={() => handleDelete(topic.id)} className="text-red-500 hover:text-red-400 transition font-medium">Delete</button></div>
                          </footer>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <KanbanView topics={topics} setTopics={setTopics} />
        )}
      </div>

      {isModalOpen && currentTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" className="text-2xl font-bold mb-4 text-cyan-400">{currentTopic.id ? 'Edit Topic' : 'Add New Topic'}</h2>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Category</label><input type="text" placeholder="e.g., ASP.NET Core" value={currentTopic.Category} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTopic({ ...currentTopic, Category: e.target.value })} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Topic</label><input type="text" placeholder="e.g., Middleware Pipeline" value={currentTopic.Topic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTopic({ ...currentTopic, Topic: e.target.value })} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Priority</label><select title='High, Medium, Low' value={currentTopic.Priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentTopic({ ...currentTopic, Priority: e.target.value as 'High' | 'Medium' | 'Low' })} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" ><option>Low</option><option>Medium</option><option>High</option></select></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Status</label><select title='To Do, In Progress, Done' value={currentTopic.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentTopic({ ...currentTopic, status: e.target.value as 'To Do' | 'In Progress' | 'Done' })} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" ><option>To Do</option><option>In Progress</option><option>Done</option></select></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Notes</label><textarea placeholder="Key concepts, definitions, etc." value={currentTopic.Notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, Notes: e.target.value })} rows={4} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" ></textarea></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Practice Exercise</label><textarea placeholder="Coding challenge or task..." value={currentTopic.PracticeExercise} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, PracticeExercise: e.target.value })} rows={4} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea></div>
              <div><label className="text-sm font-medium text-slate-400 block mb-1">Knowledge Covered</label><textarea placeholder="What have you learned? Key takeaways..." value={currentTopic.KnowledgeCovered} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, KnowledgeCovered: e.target.value })} rows={5} className="w-full bg-slate-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" ></textarea></div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button onClick={closeModal} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md transition">Cancel</button>
              <button onClick={handleSaveTopic} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

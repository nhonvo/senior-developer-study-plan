"use client";
import React, { useState, useEffect } from 'react';
import ViewSwitcher from './components/ViewSwitcher';
import KanbanView from './components/KanbanView';
import { Topic } from './types';

type Category = string;

// --- Helper functions for data handling ---

// More robust CSV parser
export const parseCSV = (csvString: string): Record<string, string>[] => {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    // Handles quoted fields with commas
    const values = line.split(/,(?=(?:(?:[^""]*\"){2})*[^""]*$)/);

    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      const value = values[i] || '';
      // Remove quotes from quoted fields
      record[header] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
    });
    return record;
  }).filter(record => Object.values(record).some(value => value)); // Filter out empty rows
};

// Validator and default value setter for a Topic
export const validateTopic = (parsedRow: Record<string, string>): Topic => {
  const id = parsedRow.id || crypto.randomUUID();
  const category = parsedRow.Category || 'Uncategorized';
  const topic = parsedRow.Topic || 'Untitled Topic';

  let priority: 'High' | 'Medium' | 'Low' = 'Medium';
  if (['High', 'Medium', 'Low'].includes(parsedRow.Priority)) {
    priority = parsedRow.Priority as 'High' | 'Medium' | 'Low';
  }

  return {
    id,
    Category: category,
    Topic: topic,
    Priority: priority,
    Notes: parsedRow.Notes || '',
    PracticeExercise: parsedRow.PracticeExercise || '',
    completed: parsedRow.completed === 'true' || false,
    KnowledgeCovered: parsedRow.KnowledgeCovered || '',
    status: ['To Do', 'In Progress', 'Done'].includes(parsedRow.status)
      ? parsedRow.status as 'To Do' | 'In Progress' | 'Done'
      : 'To Do',
    link: parsedRow.link || ''
  };
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
  const [isCompact, setIsCompact] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

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
            const initialTopics: Topic[] = parsedData.map(validateTopic);
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
    setCurrentTopic({ id: '', Category: '', Topic: '', Priority: 'Medium', Notes: '', PracticeExercise: '', KnowledgeCovered: '', completed: false, status: 'To Do', link: '' });
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

  const handleUpdateStatusForSelected = (status: 'To Do' | 'In Progress' | 'Done') => {
    setTopics(prevTopics =>
      prevTopics.map(topic =>
        selectedTopics.includes(topic.id) ? { ...topic, status, completed: status === 'Done' } : topic
      )
    );
    setSelectedTopics([]);
  };

  // --- Filtering and Progress Calculation ---
  const filteredTopics = topics.filter(topic =>
    (topic.Topic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (topic.Category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTopicsForCategory = (category: Category) => {
    return topics.filter(t => t.Category === category)
      .filter(t => !searchTerm || filteredTopics.some(ft => ft.id === t.id))
  }

  const completedCount = topics.filter(t => t.completed).length;
  const totalCount = topics.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // --- Render ---
  return (
    <div className="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-50 min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12 pt-8">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-800 dark:text-gray-100 leading-tight mb-4">Senior Developer Study Plan</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Organize your learning path with a clean, intuitive interface.</p>
        </header>

        <div className="mb-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="relative w-full sm:w-1/2 max-w-md">
            <input type="text" placeholder="Search by topic or category..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors" />
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button onClick={handleAddTopic} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full transition-colors transform hover:scale-105 shadow-lg">
            Add New Topic
          </button>
        </div>

        <div className="mb-12 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Progress Overview</span>
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{completedCount} / {totalCount} Topics Completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />

        {currentView === 'list' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={handleSelectAll} className="bg-cyan-500 text-white px-4 py-2 rounded-lg">Select All</button>
                <button onClick={handleUnselectAll} className="bg-cyan-500 text-white px-4 py-2 rounded-lg">Unselect All</button>
                <button onClick={() => handleUpdateStatusForSelected('To Do')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">Mark as To Do</button>
                <button onClick={() => handleUpdateStatusForSelected('In Progress')} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Mark as In Progress</button>
                <button onClick={() => handleUpdateStatusForSelected('Done')} className="bg-green-500 text-white px-4 py-2 rounded-lg">Mark as Complete</button>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="compactView" checked={isCompact} onChange={() => setIsCompact(!isCompact)} className="mr-2" />
                <label htmlFor="compactView">Compact View</label>
              </div>
            </div>
            {categories.map((category, index) => {
              const topicsForCategory = getTopicsForCategory(category);
              const isCollapsed = collapsedCategories.includes(category);
              if (topicsForCategory.length === 0 && searchTerm) return null;

              return (
                <div key={category} className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-8">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, category, 'CATEGORY', index)}
                    onClick={() => handleToggleCategoryCollapse(category)}
                    className={`flex items-center justify-between mb-6 cursor-pointer group ${draggedItem && draggedItem.type === 'CATEGORY' && draggedItem.item === category ? 'opacity-50' : ''} `}>
                    <div className="flex items-center cursor-grab">
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{category}</h3>
                    </div>
                    <svg className={`w-7 h-7 text-gray-500 transform transition-transform ${!isCollapsed ? 'rotate-180' : ''} `} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                  {!isCollapsed && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:grid-cols-1 ${isCompact ? 'xl:grid-cols-4' : ''}`}>
                      {topicsForCategory.map((topic, topicIndex) => (
                        <div
                          key={topic.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, topic, 'TOPIC', topicIndex); }}
                          onDragOver={handleDragOver}
                          onClick={() => handleSelectTopic(topic.id)}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, topic, 'TOPIC', topicIndex); }}
                          className={`relative p-6 rounded-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 ${draggedItem
                            && draggedItem.type === 'TOPIC'
                            && typeof draggedItem.item !== 'string'
                            && draggedItem.item.id === topic.id ? 'opacity-50' : ''} ${selectedTopics.includes(topic.id) ? 'ring-2 ring-cyan-400' : ''} ${topic.completed ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700' : 'bg-white dark:bg-gray-800'} ${isCompact ? 'p-3' : 'p-6'}`}>
                          <header className="flex justify-between items-start mb-4">
                            <h2 className={`text-2xl font-bold text-gray-800 dark:text-gray-100 ${topic.completed ? 'line-through text-gray-500 dark:text-gray-400' : ''} ${isCompact ? 'text-lg' : 'text-2xl'}`}>{topic.Topic}</h2>
                            {!isCompact && <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${topic.Priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : topic.Priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'} `}>{topic.Priority}</span>}
                          </header>
                          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                            <div><h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-1">Notes</h4><p className="whitespace-pre-wrap">{topic.Notes || 'N/A'}</p></div>
                            {!isCompact && <>
                              <div className="mt-4">
                                <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Practice Exercise</h4>
                                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-md">
                                  <p className="whitespace-pre-wrap font-mono text-sm">{topic.PracticeExercise || 'No practice exercise available.'}</p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">Knowledge Covered</h4>
                                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                                  <p className="whitespace-pre-wrap text-sm">{topic.KnowledgeCovered || 'No knowledge notes recorded yet.'}</p>
                                </div>
                              </div>
                            </>}
                          </div>
                          <footer className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center">
                              <input type="checkbox" checked={selectedTopics.includes(topic.id)} onChange={() => handleSelectTopic(topic.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-blue-400 dark:focus:ring-blue-400 cursor-pointer" id={`select-${topic.id}`} />
                              <label htmlFor={`select-${topic.id}`} className="ml-2 text-base text-gray-700 dark:text-gray-300 cursor-pointer">Select</label>
                            </div>
                            {!isCompact &&
                              <div className="flex flex-wrap justify-center sm:justify-end gap-3">
                                {topic.link && (
                                  <a href={topic.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors">
                                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    Go to Link
                                  </a>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Topic: ${topic.Topic}\n\nNotes: ${topic.Notes}\n\nPractice Exercise: ${topic.PracticeExercise}\n\nKnowledge Covered: ${topic.KnowledgeCovered}`); }} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-900 transition-colors">
                                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                                  Copy Info
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleEditTopic(topic) }} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-900 transition-colors">
                                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-7.793 7.793A2 2 0 017.07 14.929L3.586 11.414A2 2 0 013.586 8.586l7.793-7.793zM15 6l2-2 1 1-2 2-1-1z" /></svg>
                                  Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(topic.id) }} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900 transition-colors">
                                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H5a1 1 0 000 2h1v8a2 2 0 002 2h4a2 2 0 002-2V6h1a1 1 0 100-2h-3V3a1 1 0 00-1-1H9zm1 2H9v1h2V4h-1zm-.5 3.5a.5.5 0 00-1 0v6a.5.5 0 001 0v-6zM11 7a.5.5 0 01.5.5v6a.5.5 0 01-1 0v-6a.5.5 0 01.5-.5z" clipRule="evenodd" /></svg>
                                  Delete
                                </button>
                              </div>
                            }
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl transform transition-all max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{currentTopic.id ? 'Edit Topic' : 'Add New Topic'}</h2>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label><input type="text" placeholder="e.g., ASP.NET Core" value={currentTopic.Category} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTopic({ ...currentTopic, Category: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" /></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Topic</label><input type="text" placeholder="e.g., Middleware Pipeline" value={currentTopic.Topic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTopic({ ...currentTopic, Topic: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" /></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Priority</label><select title='High, Medium, Low' value={currentTopic.Priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentTopic({ ...currentTopic, Priority: e.target.value as 'High' | 'Medium' | 'Low' })} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" ><option>Low</option><option>Medium</option><option>High</option></select></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Status</label><select title='To Do, In Progress, Done' value={currentTopic.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCurrentTopic({ ...currentTopic, status: e.target.value as 'To Do' | 'In Progress' | 'Done' })} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" ><option>To Do</option><option>In Progress</option><option>Done</option></select></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Notes</label><textarea placeholder="Key concepts, definitions, etc." value={currentTopic.Notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, Notes: e.target.value })} rows={4} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" ></textarea></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Practice Exercise</label><textarea placeholder="Coding challenge or task..." value={currentTopic.PracticeExercise} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, PracticeExercise: e.target.value })} rows={4} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"></textarea></div>
              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Knowledge Covered</label><textarea placeholder="What have you learned? Key takeaways..." value={currentTopic.KnowledgeCovered} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTopic({ ...currentTopic, KnowledgeCovered: e.target.value })} rows={5} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100" ></textarea></div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200">Cancel</button>
              <button onClick={handleSaveTopic} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
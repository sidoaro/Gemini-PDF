
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  FileDown, 
  Sparkles, 
  ChevronLeft, 
  Save, 
  Clock,
  Tag as TagIcon,
  BookOpen,
  Edit3
} from 'lucide-react';
import { Note, ViewMode } from './types';
import { enhanceNote } from './services/geminiService';
import { exportToPDF } from './services/pdfService';
import { format } from 'date-fns';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('gemini-scribe-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    localStorage.setItem('gemini-scribe-notes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId), 
  [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchTerm]);

  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsPreview(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const handleAiAction = async (action: 'summarize' | 'tag' | 'improve' | 'title') => {
    if (!activeNote || !activeNote.content) return;
    
    setIsAiLoading(true);
    try {
      const result = await enhanceNote(activeNote.content, action);
      if (action === 'title' && result.suggestedTitle) {
        updateNote(activeNote.id, { title: result.suggestedTitle });
      } else if (action === 'tag' && result.tags) {
        updateNote(activeNote.id, { tags: [...new Set([...activeNote.tags, ...result.tags])] });
      } else if (action === 'improve' && result.improvedContent) {
        updateNote(activeNote.id, { content: result.improvedContent });
      } else if (action === 'summarize' && result.summary) {
        const summaryText = `\n\n--- AI Summary ---\n${result.summary}`;
        updateNote(activeNote.id, { content: activeNote.content + summaryText });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!activeNote) return;
    await exportToPDF('note-content-area', activeNote.title || 'Note');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`w-80 border-r border-slate-200 bg-white flex flex-col ${activeNoteId ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Gemini Scribe
          </h1>
          <button 
            onClick={createNote}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all shadow-md active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="p-4 bg-white sticky top-[65px] z-10 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-10 opacity-50 flex flex-col items-center">
              <BookOpen size={48} className="mb-2 text-slate-300" />
              <p className="text-sm">No notes found</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`group p-4 rounded-xl cursor-pointer transition-all border ${
                  activeNoteId === note.id 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'hover:bg-slate-50 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-semibold truncate pr-2 ${activeNoteId === note.id ? 'text-blue-900' : 'text-slate-800'}`}>
                    {note.title || 'Untitled'}
                  </h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-md transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                  {note.content || 'No content yet...'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> {format(note.updatedAt, 'MMM d')}
                  </span>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 overflow-hidden">
                      {note.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-medium whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Editor/Main View */}
      <main className={`flex-1 flex flex-col bg-white ${!activeNoteId ? 'hidden md:flex' : 'flex'}`}>
        {activeNote ? (
          <>
            {/* Header / Actions */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between sticky top-0 z-20 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveNoteId(null)}
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <input 
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note Title"
                  className="text-lg font-bold outline-none bg-transparent placeholder:opacity-30 focus:border-b-2 focus:border-blue-500 pb-1"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setIsPreview(!isPreview)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isPreview ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isPreview ? <Edit3 size={16} /> : <BookOpen size={16} />}
                  <span className="hidden sm:inline">{isPreview ? 'Edit' : 'Read'}</span>
                </button>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                {/* AI Tools Dropdown (Simplified as separate buttons) */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleAiAction('title')}
                    disabled={isAiLoading}
                    title="Generate Title"
                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={18} />
                  </button>
                  <button 
                    onClick={() => handleAiAction('summarize')}
                    disabled={isAiLoading}
                    title="Summarize"
                    className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FileDown size={18} className="rotate-180" />
                  </button>
                </div>

                <button 
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all active:scale-95"
                >
                  <FileDown size={16} />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
              </div>
            </div>

            {/* Tag Management */}
            <div className="px-6 py-2 border-b border-slate-50 flex items-center gap-2 overflow-x-auto">
              <TagIcon size={14} className="text-slate-400 shrink-0" />
              <div className="flex gap-2 items-center">
                {activeNote.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                    {tag}
                    <button 
                      onClick={() => updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) })}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button 
                  onClick={() => handleAiAction('tag')}
                  disabled={isAiLoading}
                  className="text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {isAiLoading ? 'Analyzing...' : '+ AI Tags'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10" id="note-content-area">
              {isPreview ? (
                <div className="prose max-w-none break-words">
                  {activeNote.content ? (
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                      {activeNote.content}
                    </div>
                  ) : (
                    <p className="text-slate-300 italic">This note is empty.</p>
                  )}
                </div>
              ) : (
                <textarea 
                  className="w-full h-full resize-none outline-none text-slate-800 leading-relaxed text-lg prose-editor bg-transparent"
                  placeholder="Start writing something amazing..."
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  spellCheck={false}
                />
              )}
            </div>

            {/* Footer Status */}
            <div className="px-6 py-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <span>{activeNote.content.split(/\s+/).filter(Boolean).length} words</span>
                <span>{activeNote.content.length} characters</span>
              </div>
              <div>Last updated: {format(activeNote.updatedAt, 'MMM d, yyyy HH:mm')}</div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100 text-center max-w-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Edit3 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">Select a note to view</h2>
              <p className="text-sm text-slate-500 mb-6">Create a new note or choose one from the sidebar to start writing.</p>
              <button 
                onClick={createNote}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Create New Note
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Global AI Loading Overlay */}
      {isAiLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
          </div>
          <p className="mt-4 font-bold text-slate-700">Gemini is thinking...</p>
        </div>
      )}
    </div>
  );
};

export default App;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, StickyNote, Trash2, ExternalLink, User, Copy, ArrowUpAZ, ArrowDownAZ, Calendar, ArrowUp, ArrowDown, FilePlus, X, Check, Box, Activity, Zap, Pin } from 'lucide-react';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getNotes, deleteNote, saveNote } from '../services/offlineStorage';
import { searchItemByItin, searchConditionByCoin, searchPowerByPoin } from '../services/api';
import { Note } from '../types';

type FilterType = 'ALL' | 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER';
type SortField = 'DATE' | 'TITLE';
type SortDirection = 'ASC' | 'DESC';

const MyNotes: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusMessage, setStatusMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Single Delete State
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);

  // Navigation Guard
  const [openingLink, setOpeningLink] = useState<string | null>(null);

  // Filter & Sort State
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortField, setSortField] = useState<SortField>('DATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

  const isSelectionMode = selectedIds.size > 0;

  useEffect(() => {
    setNotes(getNotes());
  }, []);

  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];

    // 1. Filter
    if (filterType !== 'ALL') {
      result = result.filter(note => {
        if (!note.linkedIds || note.linkedIds.length === 0) return false;
        return note.linkedIds.some(link => link.startsWith(`${filterType}:`));
      });
    }

    // 2. Sort
    result.sort((a, b) => {
      // Priority 1: Pinned notes always at top
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // Pinned (1) comes before Unpinned (0)

      // Priority 2: Selected sort field
      let comparison = 0;
      if (sortField === 'DATE') {
        comparison = a.timestamp - b.timestamp;
      } else {
        const titleA = a.title?.toLowerCase() || '';
        const titleB = b.title?.toLowerCase() || '';
        comparison = titleA.localeCompare(titleB);
      }
      return sortDirection === 'ASC' ? comparison : -comparison;
    });

    return result;
  }, [notes, filterType, sortField, sortDirection]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
        setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
        setSortField(field);
        setSortDirection(field === 'DATE' ? 'DESC' : 'ASC');
    }
  };

  const initiateDelete = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const togglePin = (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      const updatedNote = { ...note, isPinned: !note.isPinned };
      saveNote(updatedNote);
      // Refresh list
      setNotes(getNotes());
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      deleteNote(noteToDelete.id);
      setNotes(getNotes());
      setNoteToDelete(null);
    }
  };

  const handleSelectionToggle = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const clearSelection = () => {
      setSelectedIds(new Set());
  };

  const confirmBulkDelete = () => {
      selectedIds.forEach(id => deleteNote(id));
      setNotes(getNotes());
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setStatusMessage({ type: 'success', text: 'Selected notes deleted.' });
      setTimeout(() => setStatusMessage(null), 2000);
  };

  const startPress = (id: string) => {
      isScrolling.current = false;
      longPressTimer.current = setTimeout(() => {
          if (!isScrolling.current) {
              const newSet = new Set(selectedIds);
              newSet.add(id);
              setSelectedIds(newSet);
              if (navigator.vibrate) navigator.vibrate(50);
          }
      }, 500); 
  };

  const cancelPress = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleMove = () => {
      isScrolling.current = true;
      cancelPress();
  };

  const handleCardClick = (e: React.MouseEvent, note: Note) => {
      if (isSelectionMode) {
          e.preventDefault();
          e.stopPropagation();
          handleSelectionToggle(note.id);
      } else {
          navigate('/create-note', { state: { note } });
      }
  };

  const parseLinkId = (linkStr: string): { type: 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER' | 'UNKNOWN', id: string } => {
     if (linkStr.includes(':')) {
         const parts = linkStr.split(':');
         const type = parts[0];
         const id = parts.slice(1).join(':');
         if (['ITIN', 'COIN', 'POIN', 'PLIN', 'OTHER'].includes(type)) {
             return { type: type as any, id };
         }
     }
     return { type: 'UNKNOWN', id: linkStr };
  };

  const handleLinkClick = async (e: React.MouseEvent, linkStr: string) => {
    if (isSelectionMode) return;

    e.stopPropagation();
    if (openingLink) return; 
    
    const { type, id } = parseLinkId(linkStr);

    if (type === 'OTHER') {
        // Copy to clipboard
        navigator.clipboard.writeText(id);
        setStatusMessage({ type: 'success', text: 'Copied to clipboard' });
        setTimeout(() => setStatusMessage(null), 1500);
        return;
    }
    
    if (type === 'PLIN') {
        navigate(`/?q=${id}&filter=owner`);
        return;
    }

    setOpeningLink(linkStr);
    
    const navState = {
        mode: 'view',
        returnTo: '/my-notes'
    };
    
    try {
        if (type === 'ITIN') {
             const res = await searchItemByItin(id);
             if (res.success && res.data) {
                 navigate('/create-item', { state: { item: res.data, ...navState } });
                 return;
             }
        } else if (type === 'COIN') {
             const res = await searchConditionByCoin(id);
             if (res.success && res.data) {
                 navigate('/create-condition', { state: { item: res.data, ...navState } });
                 return;
             }
        } else if (type === 'POIN') {
             const res = await searchPowerByPoin(id);
             if (res.success && res.data) {
                 navigate('/create-power', { state: { item: res.data, ...navState } });
                 return;
             }
        } else {
            const itemRes = await searchItemByItin(id);
            if (itemRes.success && itemRes.data) {
                navigate('/create-item', { state: { item: itemRes.data, ...navState } });
                return;
            }
            const condRes = await searchConditionByCoin(id);
            if (condRes.success && condRes.data) {
                navigate('/create-condition', { state: { item: condRes.data, ...navState } });
                return;
            }
            const powerRes = await searchPowerByPoin(id);
            if (powerRes.success && powerRes.data) {
                navigate('/create-power', { state: { item: powerRes.data, ...navState } });
                return;
            }
        }
        alert(`Object ${id} not found.`);
    } catch (err) {
        console.error("Navigation error", err);
    } finally {
        setOpeningLink(null);
    }
  };

  const renderLinkBadge = (linkStr: string) => {
    const { type, id } = parseLinkId(linkStr);
    // Use semantic colors for link badges too
    let styleClass = 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300';
    let Icon = ExternalLink;
    
    if (type === 'ITIN') {
        styleClass = 'bg-entity-item/10 border-entity-item/20 text-entity-item';
        Icon = Box;
    }
    else if (type === 'COIN') {
        styleClass = 'bg-entity-condition/10 border-entity-condition/20 text-entity-condition';
        Icon = Activity;
    }
    else if (type === 'POIN') {
        styleClass = 'bg-entity-power/10 border-entity-power/20 text-entity-power';
        Icon = Zap;
    }
    else if (type === 'PLIN') Icon = User;
    else if (type === 'OTHER') Icon = Copy;
    
    let displayLabel = type !== 'UNKNOWN' ? `${type} ${id}` : id;
    if (displayLabel.length > 15) {
        displayLabel = displayLabel.substring(0, 15) + '...';
    }

    return (
        <button
            key={linkStr}
            onClick={(e) => handleLinkClick(e, linkStr)}
            disabled={openingLink !== null}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                openingLink === linkStr 
                ? 'bg-entity-note/20 border-entity-note text-entity-note animate-pulse' 
                : `${styleClass} hover:brightness-95`
            }`}
        >
            <Icon size={8} />
            {displayLabel}
        </button>
    );
  };

  return (
    <div className="flex flex-col items-center mx-auto px-2 w-full max-w-lg">
      <ConfirmModal 
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Note?"
        message={`Are you sure you want to delete "${noteToDelete?.title}"?`}
        confirmLabel="Delete"
      />

      <ConfirmModal 
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected?"
        message={`Are you sure you want to delete ${selectedIds.size} selected note(s)? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Notes`}
      />

      <div className="w-full mb-3 flex items-center justify-between gap-2 h-[38px]">
         <div className="flex gap-2">
            {isSelectionMode ? (
                <Button variant="secondary" onClick={clearSelection} title="Cancel Selection">
                    <X size={16} />
                </Button>
            ) : (
                <Button variant="secondary" onClick={() => navigate('/')} title="Dashboard">
                    <Home size={16} />
                </Button>
            )}
         </div>
         
         <h2 className="font-display font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
           {isSelectionMode ? (
               <span>{selectedIds.size} Selected</span>
           ) : (
               <>
                <StickyNote size={20} className="text-entity-note" />
                My Notes
               </>
           )}
         </h2>

         <div className="flex gap-2">
            {isSelectionMode ? (
                <Button 
                    variant="primary" 
                    onClick={() => setShowBulkDeleteConfirm(true)} 
                    title="Delete Selected"
                >
                    <Trash2 size={16} />
                </Button>
            ) : (
                <Button variant="secondary" onClick={() => navigate('/create-note')} title="New Note">
                    <FilePlus size={16} />
                </Button>
            )}
         </div>
      </div>
      
      <div className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-panel p-2">
           {statusMessage && (
            <div className={`mb-2 p-2 rounded border text-sm font-serif ${
              statusMessage.type === 'success' 
                ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' 
                : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
            }`}>
              <p className="font-bold">{statusMessage.text}</p>
            </div>
           )}

           {/* Controls Bar - Uses entity-note color (Yellow) */}
           <div className="flex flex-col gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {(['ALL', 'ITIN', 'COIN', 'POIN', 'PLIN', 'OTHER'] as FilterType[]).map(ft => (
                        <button
                            key={ft}
                            onClick={() => setFilterType(ft)}
                            disabled={isSelectionMode}
                            className={`px-2 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap transition-colors ${
                                filterType === ft 
                                ? 'bg-entity-note text-white border-entity-note' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                            } ${isSelectionMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {ft === 'ALL' ? 'ALL' : ft}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <span className="font-display font-bold text-gray-700 dark:text-gray-300 text-xs px-2">
                        {filteredAndSortedNotes.length} Found
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleSortToggle('DATE')}
                            disabled={isSelectionMode}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                sortField === 'DATE'
                                ? 'bg-entity-note/10 text-entity-note border-entity-note/30'
                                : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                            } ${isSelectionMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Calendar size={12} />
                            Date
                            {sortField === 'DATE' && (sortDirection === 'ASC' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                        </button>
                        <button 
                            onClick={() => handleSortToggle('TITLE')}
                            disabled={isSelectionMode}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                sortField === 'TITLE'
                                ? 'bg-entity-note/10 text-entity-note border-entity-note/30'
                                : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                            } ${isSelectionMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {sortDirection === 'ASC' ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />}
                            Title
                            {sortField === 'TITLE' && (sortDirection === 'ASC' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                        </button>
                    </div>
                </div>
           </div>

           {notes.length === 0 ? (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm">You haven't created any notes yet.</div>
           ) : filteredAndSortedNotes.length === 0 ? (
             <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm">No notes match current filter.</div>
           ) : (
             <div className="space-y-2 max-h-[70vh] overflow-y-auto p-1">
                {filteredAndSortedNotes.map(note => {
                  const isSelected = selectedIds.has(note.id);
                  // Apply dynamic theme color to selection/border
                  const selectionClass = isSelected 
                    ? 'border-entity-note ring-1 ring-entity-note bg-entity-note/10' 
                    : `border-l-entity-note border-y border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${note.isPinned ? 'dark:bg-gray-700/30 bg-gray-50' : ''}`;

                  return (
                  <div key={note.id} className="flex w-full gap-2 relative">
                    <div 
                        onMouseDown={() => startPress(note.id)}
                        onMouseUp={cancelPress}
                        onMouseLeave={cancelPress}
                        onTouchStart={() => startPress(note.id)}
                        onTouchEnd={cancelPress}
                        onTouchMove={handleMove}
                        onClick={(e) => handleCardClick(e, note)}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`flex-1 flex flex-col gap-0.5 p-2 border-l-4 rounded cursor-pointer transition-all relative overflow-hidden select-none ${selectionClass}`}
                    >
                        {isSelected && (
                            <div className="absolute top-0 right-0 p-1 bg-entity-note text-white rounded-bl-md z-10 shadow-sm">
                                <Check size={12} />
                            </div>
                        )}

                        {!isSelectionMode && (
                            <div 
                                onClick={(e) => togglePin(e, note)}
                                className={`absolute top-0 right-0 p-1.5 z-10 transition-colors rounded-bl-md ${note.isPinned ? 'text-entity-note bg-entity-note/10' : 'text-gray-300 hover:text-entity-note dark:text-gray-600 dark:hover:text-entity-note'}`}
                                title={note.isPinned ? "Unpin" : "Pin"}
                            >
                                <Pin size={14} fill={note.isPinned ? "currentColor" : "none"} />
                            </div>
                        )}

                        {/* Top Row: Title (Left) + Date (Right) */}
                        <div className="flex justify-between items-center w-full pr-6">
                            <span className="font-serif font-bold text-gray-800 dark:text-gray-200 text-sm truncate pr-2">
                              {note.title || 'Untitled'}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                                {new Date(note.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        
                        {/* Bottom Row: Linked Objects */}
                        <div className={`flex items-center gap-1 h-5 ${isSelectionMode ? 'pointer-events-none opacity-60' : ''}`}>
                            {note.linkedIds && note.linkedIds.length > 0 ? (
                                <>
                                    {/* Show only the first linked object */}
                                    {renderLinkBadge(note.linkedIds[0])}
                                    
                                    {/* Compact Counter if more than 1 */}
                                    {note.linkedIds.length > 1 && (
                                        <span className="flex items-center justify-center px-1.5 h-full rounded text-[10px] font-mono font-bold bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                                        +{note.linkedIds.length - 1}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-[10px] text-gray-300 dark:text-gray-600 italic">No links</span>
                            )}
                        </div>
                    </div>

                    {!isSelectionMode && (
                        <div 
                            onClick={(e) => initiateDelete(e, note)}
                            className="w-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                            title="Delete Note"
                        >
                            <Trash2 size={18} />
                        </div>
                    )}
                  </div>
                );
                })}
             </div>
           )}
      </div>
    </div>
  );
};

export default MyNotes;
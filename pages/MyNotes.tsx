/**
 * MyNotes Component
 *
 * Displays a list of all saved notes, supporting filtering, sorting,
 * single-note actions (edit, delete, pin), and bulk deletion via multi-select.
 *
 * The layout is refactored to ensure the main notes list scrolls within the panel,
 * fixing overflow behavior to be consistent with other major components.
 */
import React, {useState, useEffect, useMemo, useRef} from 'react';
import {useNavigate} from 'react-router-dom';

// Layout Components
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';

// UI Components (Assumed Imports)
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import {getNotes, deleteNote, saveNote} from '../services/offlineStorage';
import {searchItemByItin, searchConditionByCoin, searchPowerByPoin} from '../services/api';

// Icons (Assumed Imports)
import {
  Home,
  StickyNote,
  Trash2,
  ExternalLink,
  User,
  Copy,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
  ArrowUp,
  ArrowDown,
  FilePlus,
  X,
  Check,
  Box,
  Activity,
  Zap,
  Pin
} from 'lucide-react';

// Types (Assumed Imports)
import {Note} from '../types';

type FilterType = 'ALL' | 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER';
type SortField = 'DATE' | 'TITLE';
type SortDirection = 'ASC' | 'DESC';

/**
 * @typedef {Object} MyNotes
 */
const MyNotes: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  /** @type {Note | null} Note state to confirm single deletion. */
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  /** @type {Set<string>} Set of selected note IDs for bulk actions. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);

  /** @type {React.MutableRefObject<boolean>} Flag to track if long-press SUCCESSFULLY initiated selection. */
  const selectionInitiatedRef = useRef(false);

  /** @type {string | null} Link being opened, prevents multiple rapid navigations. */
  const [openingLink, setOpeningLink] = useState<string | null>(null);

  /** @type {FilterType} State for filtering the notes list. */
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  /** @type {SortField} State for sorting the notes list. */
  const [sortField, setSortField] = useState<SortField>('DATE');

  /** @type {SortDirection} State for sorting direction. */
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

  const isSelectionMode = selectedIds.size > 0;

  useEffect(() => {
    setNotes(getNotes());
  }, []);

  /**
   * Filters and sorts the notes list based on current state.
   * @returns {Note[]} The filtered and sorted array of notes.
   */
  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];

    if (filterType !== 'ALL') {
      result = result.filter(note => {
        if (!note.linkedIds || note.linkedIds.length === 0) return false;
        return note.linkedIds.some(link => link.startsWith(`${filterType}:`));
      });
    }

    result.sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      let comparison;
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

  /**
   * Toggles the sort direction or switches the sort field.
   * @param {SortField} field The field to sort by.
   */
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection(field === 'DATE' ? 'DESC' : 'ASC');
    }
  };

  /**
   * Sets up the note to be deleted via the confirmation modal.
   * @param {React.MouseEvent} e Click event to stop propagation.
   * @param {Note} note The note object to delete.
   */
  const initiateDelete = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  /**
   * Toggles the pinned status of a note.
   * @param {React.MouseEvent} e Click event to stop propagation.
   * @param {Note} note The note object to pin/unpin.
   */
  const togglePin = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const updatedNote = {...note, isPinned: !note.isPinned};
    saveNote(updatedNote);
    setNotes(getNotes());
  };

  /**
   * Confirms and executes the single note deletion.
   */
  const confirmDelete = () => {
    if (noteToDelete) {
      deleteNote(noteToDelete.id);
      setNotes(getNotes());
      setNoteToDelete(null);
    }
  };

  /**
   * Toggles the selection state for a note ID.
   * @param {string} id The ID of the note.
   */
  const handleSelectionToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  /**
   * Clears all selected notes.
   */
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  /**
   * Confirms and executes bulk deletion of selected notes.
   */
  const confirmBulkDelete = () => {
    selectedIds.forEach(id => deleteNote(id));
    setNotes(getNotes());
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    setStatusMessage({type: 'success', text: 'Selected notes deleted.'});
    setTimeout(() => setStatusMessage(null), 2000);
  };

  /**
   * Clears any pending long press timer.
   */
  const cancelPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /**
   * Starts the long press timer to initiate selection mode.
   * @param {string} id The ID of the note being pressed.
   */
  const startPress = (id: string) => {
    cancelPress();
    isScrolling.current = false;
    selectionInitiatedRef.current = false;

    longPressTimer.current = setTimeout(() => {
      if (!isScrolling.current) {
        const newSet = new Set(selectedIds);
        newSet.add(id);
        setSelectedIds(newSet);
        if (navigator.vibrate) navigator.vibrate(50);

        selectionInitiatedRef.current = true;
        longPressTimer.current = null;
      }
    }, 500);
  };

  /**
   * Handles touch/mouse move to detect scrolling and cancel long press.
   */
  const handleMove = () => {
    isScrolling.current = true;
    cancelPress();
  };

  /**
   * Handles click events, prioritizing selection toggle over navigation if selection mode is active or just initiated.
   * @param {React.MouseEvent} e The click event.
   * @param {Note} note The note being clicked.
   */
  const handleCardClick = (e: React.MouseEvent, note: Note) => {
    cancelPress();

    const wasSelectionInitiated = selectionInitiatedRef.current;

    if (wasSelectionInitiated) {
      e.preventDefault();
      selectionInitiatedRef.current = false;
      return;
    }

    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      handleSelectionToggle(note.id);
    } else {
      navigate('/create-note', {state: {note}});
    }
  };

  /**
   * Parses a link string into its type and ID parts.
   * @param {string} linkStr The raw link string (e.g., 'ITIN:1234').
   * @returns {{type: 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER' | 'UNKNOWN', id: string}} The parsed link parts.
   */
  const parseLinkId = (linkStr: string): {
    type: 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER' | 'UNKNOWN',
    id: string
  } => {
    if (linkStr.includes(':')) {
      const parts = linkStr.split(':');
      const type = parts[0];
      const id = parts.slice(1).join(':');
      if (['ITIN', 'COIN', 'POIN', 'PLIN', 'OTHER'].includes(type)) {
        return {type: type as any, id};
      }
    }
    return {type: 'UNKNOWN', id: linkStr};
  };

  /**
   * Handles navigation or copy action when a linked entity badge is clicked.
   * @param {React.MouseEvent} e The click event.
   * @param {string} linkStr The linked entity string.
   */
  const handleLinkClick = async (e: React.MouseEvent, linkStr: string) => {
    if (isSelectionMode) return;

    e.stopPropagation();
    if (openingLink) return;

    const {type, id} = parseLinkId(linkStr);

    if (type === 'OTHER') {
      navigator.clipboard.writeText(id);
      setStatusMessage({type: 'success', text: 'Copied to clipboard'});
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
          navigate('/create-item', {state: {item: res.data, ...navState}});
          return;
        }
      } else if (type === 'COIN') {
        const res = await searchConditionByCoin(id);
        if (res.success && res.data) {
          navigate('/create-condition', {state: {item: res.data, ...navState}});
          return;
        }
      } else if (type === 'POIN') {
        const res = await searchPowerByPoin(id);
        if (res.success && res.data) {
          navigate('/create-power', {state: {item: res.data, ...navState}});
          return;
        }
      } else {
        const itemRes = await searchItemByItin(id);
        if (itemRes.success && itemRes.data) {
          navigate('/create-item', {state: {item: itemRes.data, ...navState}});
          return;
        }
        const condRes = await searchConditionByCoin(id);
        if (condRes.success && condRes.data) {
          navigate('/create-condition', {state: {item: condRes.data, ...navState}});
          return;
        }
        const powerRes = await searchPowerByPoin(id);
        if (powerRes.success && powerRes.data) {
          navigate('/create-power', {state: {item: powerRes.data, ...navState}});
          return;
        }
      }
      console.error(`Object ${id} not found.`);
    } catch (err) {
      console.error("Navigation error", err);
    } finally {
      setOpeningLink(null);
    }
  };

  /**
   * Renders a badge for a linked entity.
   * @param {string} linkStr The linked entity string.
   * @returns {JSX.Element} The link badge button.
   */
  const renderLinkBadge = (linkStr: string) => {
    const {type, id} = parseLinkId(linkStr);
    let styleClass = 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300';
    let Icon = ExternalLink;

    if (type === 'ITIN') {
      styleClass = 'bg-entity-item/10 border-entity-item/20 text-entity-item';
      Icon = Box;
    } else if (type === 'COIN') {
      styleClass = 'bg-entity-condition/10 border-entity-condition/20 text-entity-condition';
      Icon = Activity;
    } else if (type === 'POIN') {
      styleClass = 'bg-entity-power/10 border-entity-power/20 text-entity-power';
      Icon = Zap;
    } else if (type === 'PLIN') Icon = User;
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
        <Icon size={8}/>
        {displayLabel}
      </button>
    );
  };

  const headerLeftContent = (
    !isSelectionMode ? <StickyNote size={20} className="text-entity-note"/> : null
  );

  return (
    <Page maxWidth="lg" className="flex flex-col h-full">
      <ConfirmModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        title="Delete Note?"
        message={`Are you sure you want to delete "${noteToDelete?.title}"? This cannot be undone.`}
        primaryAction={{
          label: "Delete",
          handler: confirmDelete,
          variant: "danger"
        }}
        secondaryAction={{
          label: "Cancel",
          handler: () => setNoteToDelete(null),
        }}
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Delete Selected?"
        message={`Are you sure you want to delete ${selectedIds.size} selected note(s)? This cannot be undone.`}
        primaryAction={{
          label: `Delete ${selectedIds.size} Notes`,
          handler: confirmBulkDelete,
          variant: "danger"
        }}
        secondaryAction={{
          label: "Cancel",
          handler: () => setShowBulkDeleteConfirm(false),
        }}
      />

      {/* Button Bar (External) - Shrinks to fit content */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div className="flex gap-2">
          {isSelectionMode ? (
            <Button variant="secondary" onClick={clearSelection} title="Cancel Selection">
              <X size={16}/>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/')} title="Dashboard">
              <Home size={16}/>
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {isSelectionMode ? (
            <Button
              variant="primary"
              onClick={() => setShowBulkDeleteConfirm(true)}
              title="Delete Selected"
            >
              <Trash2 size={16}/>
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/create-note')} title="New Note">
              <FilePlus size={16}/>
            </Button>
          )}
        </div>
      </div>

      {/* Panel Wrapper - Takes up all remaining vertical space */}
      <div className="flex-1 min-h-0">
        <Panel
          title={isSelectionMode ? `${selectedIds.size} Selected` : 'My Notes'}
          headerLeftContent={headerLeftContent}
        >
          {/* Panel Body Content - Vertical flex container */}
          <div className="p-4 flex flex-col h-full">

            {/* Status Message - Shrinks to fit content */}
            {statusMessage && (
              <div className={`mb-2 p-2 rounded border text-sm font-serif flex-shrink-0 ${
                statusMessage.type === 'success'
                  ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                  : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
              }`}>
                <p className="font-bold">{statusMessage.text}</p>
              </div>
            )}

            {/* Controls Bar - Shrinks to fit content */}
            <div className="flex flex-col gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2 flex-shrink-0">
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
                    <Calendar size={12}/>
                    Date
                    {sortField === 'DATE' && (sortDirection === 'ASC' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
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
                    {sortDirection === 'ASC' ? <ArrowDownAZ size={12}/> : <ArrowUpAZ size={12}/>}
                    Title
                    {sortField === 'TITLE' && (sortDirection === 'ASC' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                  </button>
                </div>
              </div>
            </div>

            {/* Notes List Container - Takes remaining height and scrolls */}
            {notes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm flex-1">You
                haven't
                created any notes yet.</div>
            ) : filteredAndSortedNotes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm flex-1">No
                notes match
                current filter.</div>
            ) : (
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto p-1">
                {filteredAndSortedNotes.map(note => {
                  const isSelected = selectedIds.has(note.id);
                  const selectionClass = isSelected
                    ? 'border-entity-note ring-1 ring-entity-note bg-entity-note/10'
                    : `border-l-entity-note border-y border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${note.isPinned ? 'dark:bg-gray-700/30 bg-gray-50' : ''}`;

                  return (
                    <div key={note.id} className="flex w-full gap-2 relative">
                      <div
                        onMouseDown={() => startPress(note.id)}
                        onMouseUp={cancelPress}
                        onMouseLeave={handleMove}
                        onTouchStart={() => startPress(note.id)}
                        onTouchEnd={cancelPress}
                        onTouchMove={handleMove}
                        onClick={(e) => handleCardClick(e, note)}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`flex-1 flex flex-col gap-0.5 p-2 border-l-4 rounded cursor-pointer transition-all relative overflow-hidden select-none ${selectionClass}`}
                      >
                        {isSelected && (
                          <div
                            className="absolute top-0 right-0 p-1 bg-entity-note text-white rounded-bl-md z-10 shadow-sm">
                            <Check size={12}/>
                          </div>
                        )}

                        {!isSelectionMode && (
                          <div
                            onClick={(e) => togglePin(e, note)}
                            className={`absolute top-0 right-0 p-1.5 z-10 transition-colors rounded-bl-md ${note.isPinned ? 'text-entity-note bg-entity-note/10' : 'text-gray-300 hover:text-entity-note dark:text-gray-600 dark:hover:text-entity-note'}`}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin size={14} fill={note.isPinned ? "currentColor" : "none"}/>
                          </div>
                        )}

                        {/* Top Row: Title (Left) + Date (Right) */}
                        <div className="flex justify-between items-center w-full pr-6">
                                    <span
                                      className="font-serif font-bold text-gray-800 dark:text-gray-200 text-sm truncate pr-2">
                                    {note.title || 'Untitled'}
                                    </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                                        {new Date(note.timestamp).toLocaleDateString()}
                                    </span>
                        </div>

                        {/* Bottom Row: Linked Objects */}
                        <div
                          className={`flex items-center gap-1 h-5 ${isSelectionMode ? 'pointer-events-none opacity-60' : ''}`}>
                          {note.linkedIds && note.linkedIds.length > 0 ? (
                            <>
                              {/* Show only the first linked object */}
                              {renderLinkBadge(note.linkedIds[0])}

                              {/* Compact Counter if more than 1 */}
                              {note.linkedIds.length > 1 && (
                                <span
                                  className="flex items-center justify-center px-1.5 h-full rounded text-[10px] font-mono font-bold bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
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
                          <Trash2 size={18}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Page>
  );
};

export default MyNotes;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout Components
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';

import { Home, Trash2, ArrowUp, ArrowDown, ArrowUpAZ, ArrowDownAZ, Calendar, X, Check, RefreshCw, Pin, Box, Activity, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getStoredChanges, deleteStoredChange, saveStoredChange, StoredChange } from '../services/offlineStorage';

type FilterType = 'ALL' | 'ITEM' | 'CONDITION' | 'POWER';
type SortField = 'DATE' | 'TITLE';
type SortDirection = 'ASC' | 'DESC';

const StoredChanges: React.FC = () => {
  const navigate = useNavigate();
  const [changes, setChanges] = useState<StoredChange[]>([]);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Single Delete
  const [changeToDelete, setChangeToDelete] = useState<StoredChange | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);
  // REF: Tracks if the long press timer actually fired and initiated selection mode
  const selectionInitiatedRef = useRef(false);

  // Filter & Sort State
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortField, setSortField] = useState<SortField>('DATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC');

  const isSelectionMode = selectedIds.size > 0;

  const loadChanges = () => {
    const data = getStoredChanges();
    // Ensure valid data
    const validData = data.filter(d => d && d.id && d.data);
    setChanges(validData);
  };

  useEffect(() => {
    loadChanges();
  }, []);

  // --- Derived Data ---
  const filteredAndSortedChanges = useMemo(() => {
    let result = [...changes];

    // 1. Filter
    if (filterType !== 'ALL') {
      result = result.filter(c => c.type.toUpperCase() === filterType);
    }

    // 2. Sort
    result.sort((a, b) => {
      // Priority 1: Pinned drafts always at top
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      // Priority 2: Selected sort field
      let comparison;
      if (sortField === 'DATE') {
        comparison = a.timestamp - b.timestamp;
      } else {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
      return sortDirection === 'ASC' ? comparison : -comparison;
    });

    return result;
  }, [changes, filterType, sortField, sortDirection]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection(field === 'DATE' ? 'DESC' : 'ASC');
    }
  };

  const togglePin = (e: React.MouseEvent, change: StoredChange) => {
    e.stopPropagation();
    const updatedChange = { ...change, isPinned: !change.isPinned };
    saveStoredChange(updatedChange);
    loadChanges();
  };

  // --- Deletion Logic ---

  const initiateDelete = (e: React.MouseEvent, change: StoredChange) => {
    e.stopPropagation();
    setChangeToDelete(change);
  };

  const confirmDelete = () => {
    if (changeToDelete) {
      deleteStoredChange(changeToDelete.id);
      loadChanges();

      setStatusMessage({ type: 'success', text: `Draft "${changeToDelete.title}" removed.` });
      setTimeout(() => setStatusMessage(null), 3000);
      setChangeToDelete(null);
    }
  };

  const confirmBulkDelete = () => {
    selectedIds.forEach(id => deleteStoredChange(id));
    loadChanges();
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    setStatusMessage({ type: 'success', text: 'Selected drafts removed.' });
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // --- Selection Logic ---

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

  // Long Press Handlers
  const startPress = (id: string) => {
    cancelPress();
    isScrolling.current = false;
    selectionInitiatedRef.current = false; // Reset the flag

    longPressTimer.current = setTimeout(() => {
      if (!isScrolling.current) {
        const newSet = new Set(selectedIds);
        newSet.add(id);
        setSelectedIds(newSet);
        if (navigator.vibrate) navigator.vibrate(50);

        selectionInitiatedRef.current = true; // Flag that selection was initiated
        longPressTimer.current = null;
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

  const handleItemClick = (e: React.MouseEvent, change: StoredChange) => {
    cancelPress();

    const wasSelectionInitiated = selectionInitiatedRef.current;

    // 1. If the long press timer *just* fired, swallow this click event
    // to prevent immediate deselection/toggling. Reset the flag and exit.
    if (wasSelectionInitiated) {
      e.preventDefault();
      selectionInitiatedRef.current = false;
      return;
    }

    // 2. If we are already in selection mode (via a previous action), subsequent clicks toggle.
    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      handleSelectionToggle(change.id);
      return;
    }

    // 3. If not in selection mode, navigate (the original non-long-press click action).
    let path = '';
    const statePayload: any = {
      draftId: change.id,
      draftTimestamp: change.timestamp,
      returnTo: '/stored-changes',
      initialData: change.data
    };

    if (change.type === 'item') {
      if (change.action === 'create') path = '/create-item';
      else if (change.action === 'recharge') path = '/recharge-item';
      else if (change.action === 'assign') path = '/assign-item';
    } else if (change.type === 'condition') {
      if (change.action === 'create') path = '/create-condition';
      else if (change.action === 'assign') path = '/assign-condition';
      else if (change.action === 'extend') path = '/extend-condition';
    } else if (change.type === 'power') {
      if (change.action === 'create') path = '/create-power';
      else if (change.action === 'assign') path = '/assign-power';
      else if (change.action === 'extend') path = '/extend-power';
    }

    if (path) {
      navigate(path, { state: statePayload });
    } else {
      setStatusMessage({ type: 'error', text: 'Unknown draft type.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Helper to extract ID
  const getDraftId = (change: StoredChange): string | null => {
    if (change.type === 'item') {
      return change.data.item?.itin || change.data.itin || null;
    } else if (change.type === 'condition') {
      return change.data.condition?.coin || change.data.coin || null;
    } else if (change.type === 'power') {
      return change.data.power?.poin || change.data.poin || null;
    }
    return null;
  };

  // Panel Header Content
  const panelTitle = isSelectionMode ? `${selectedIds.size} Selected` : 'My Stored Changes';
  const headerLeftContent = isSelectionMode ? null : <RefreshCw size={20} className="text-entity-draft" />;


  return (
    <Page maxWidth="lg">
      <ConfirmModal
        isOpen={!!changeToDelete}
        onClose={() => setChangeToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove draft?"
        message={`Are you sure you want to remove the draft "${changeToDelete?.title}"?`}
        confirmLabel="Remove"
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Remove Selected?"
        message={`Are you sure you want to remove ${selectedIds.size} selected draft(s)?`}
        confirmLabel={`Remove ${selectedIds.size} Drafts`}
      />

      {/* Toolbar (External to Panel) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
            <Button variant="secondary" onClick={loadChanges} title="Refresh List">
              <RefreshCw size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content (Wrapped in Panel) */}
      <Panel
        title={panelTitle}
        headerLeftContent={headerLeftContent}
      >
        {statusMessage && (
          <div className={`mb-2 p-2 rounded border text-sm font-serif ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
          }`}>
            <p className="font-bold">{statusMessage.text}</p>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex flex-col gap-2 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {(['ALL', 'ITEM', 'CONDITION', 'POWER'] as FilterType[]).map(ft => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                disabled={isSelectionMode}
                className={`px-2 py-1 text-[10px] font-bold rounded-full border whitespace-nowrap transition-colors ${
                  filterType === ft
                    ? 'bg-entity-draft text-white border-entity-draft'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                } ${isSelectionMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {ft === 'ITEM' ? 'ITIN' : ft === 'CONDITION' ? 'COIN' : ft === 'POWER' ? 'POIN' : ft}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
                   <span className="font-display font-bold text-gray-700 dark:text-gray-300 text-xs px-2">
                       {filteredAndSortedChanges.length} Drafts
                   </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortToggle('DATE')}
                disabled={isSelectionMode}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                  sortField === 'DATE'
                    ? 'bg-entity-draft/10 text-entity-draft border-entity-draft/30'
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
                    ? 'bg-entity-draft/10 text-entity-draft border-entity-draft/30'
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

        <div className="space-y-2 max-h-[70vh] overflow-y-auto p-1">
          {changes.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm">No stored changes found.</div>
          ) : filteredAndSortedChanges.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm">No drafts match current filter.</div>
          ) : (
            filteredAndSortedChanges.map((change) => {
              const isSelected = selectedIds.has(change.id);
              const draftId = getDraftId(change);
              const typeAcronym = change.type === 'item' ? 'ITIN' : change.type === 'condition' ? 'COIN' : 'POIN';

              // Use entity-draft (blue) for selection state and default borders
              let borderClass = isSelected ? 'border-entity-draft ring-1 ring-entity-draft' : 'border-l-gray-400 border-y border-r border-gray-200 dark:border-gray-700';
              let bgClass = isSelected ? 'bg-entity-draft/10' : 'bg-white dark:bg-gray-800 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50';

              // Badge Styles
              let badgeStyle = '';
              let Icon = Box;

              if (change.type === 'item') {
                badgeStyle = 'bg-entity-item/10 text-entity-item border-entity-item/20';
                Icon = Box;
              }
              else if (change.type === 'condition') {
                badgeStyle = 'bg-entity-condition/10 text-entity-condition border-entity-condition/20';
                Icon = Activity;
              }
              else if (change.type === 'power') {
                badgeStyle = 'bg-entity-power/10 text-entity-power border-entity-power/20';
                Icon = Zap;
              }

              if (!isSelected) {
                borderClass = 'border-l-entity-draft border-y border-r border-gray-200 dark:border-gray-700';
                if (change.isPinned) {
                  bgClass += ' dark:bg-gray-700/30 bg-gray-50';
                }
              }

              return (
                <div key={change.id} className="flex w-full gap-2 relative">
                  <div
                    onMouseDown={() => startPress(change.id)}
                    onMouseUp={cancelPress}
                    onMouseLeave={cancelPress}
                    onTouchStart={() => startPress(change.id)}
                    onTouchEnd={cancelPress}
                    onTouchMove={handleMove}
                    onClick={(e) => handleItemClick(e, change)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex-1 flex flex-col gap-1 p-2 border-l-4 rounded cursor-pointer transition-all relative overflow-hidden select-none ${borderClass} ${bgClass}`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 p-1 bg-entity-draft text-white rounded-bl-md z-10 shadow-sm">
                        <Check size={12} />
                      </div>
                    )}

                    {!isSelectionMode && (
                      <div
                        onClick={(e) => togglePin(e, change)}
                        className={`absolute top-0 right-0 p-1.5 z-10 transition-colors rounded-bl-md ${change.isPinned ? 'text-entity-draft bg-entity-draft/10' : 'text-gray-300 hover:text-entity-draft dark:text-gray-600 dark:hover:text-entity-draft'}`}
                        title={change.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin size={14} fill={change.isPinned ? "currentColor" : "none"} />
                      </div>
                    )}

                    {/* Top Row: Title (Left) | Action (Right) */}
                    <div className="flex justify-between items-center pr-6 mb-1.5">
                      <h4 className="font-serif font-bold text-gray-800 dark:text-gray-100 text-sm truncate pr-2">
                        {change.title}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 shrink-0">
                                {change.action}
                            </span>
                    </div>

                    {/* Bottom Row: ID Badge (Left) | Date (Right) */}
                    <div className="flex justify-between items-end pr-6">
                      {draftId ? (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyle}`}>
                                    <Icon size={10} strokeWidth={2} />
                          {typeAcronym} {draftId}
                                </span>
                      ) : (
                        <span className="font-serif italic text-gray-400 dark:text-gray-500 font-normal text-xs pl-1">
                                    (New {typeAcronym})
                                </span>
                      )}

                      <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mb-0.5">
                                {new Date(change.timestamp).toLocaleDateString()}
                            </span>
                    </div>
                  </div>

                  {!isSelectionMode && (
                    <div
                      onClick={(e) => initiateDelete(e, change)}
                      className="w-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </div>
                  )}
                </div>
              );
            }))}
        </div>
      </Panel>
    </Page>
  );
};

export default StoredChanges;
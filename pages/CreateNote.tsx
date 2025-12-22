/**
 * CreateNote Component
 *
 * Allows users to create, edit, save, and delete notes.
 * Supports linking notes to various entities (ITIN, COIN, POIN, PLIN).
 * Implements dirty state check to prevent accidental loss of unsaved changes.
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  Home,
  ArrowLeft,
  Save,
  Trash2,
  Link as LinkIcon,
  Plus,
  X,
  Loader2,
  Copy,
  User,
  Zap,
  Activity,
  Box,
  Pin,
  StickyNote
} from 'lucide-react';
import {saveNote, deleteNote} from '../services/offlineStorage';
import {searchItemByItin, searchConditionByCoin, searchPowerByPoin} from '../services/api';
import {Note} from '../types';
import ScrollbarHideStyles from "../components/layout/ScrollbarHideStyles";

type LinkMode = 'AUTO' | 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER';

/**
 * Main component for creating and editing notes.
 * @returns {React.FC} The CreateNote component.
 */
const CreateNote: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [isPinned, setIsPinned] = useState(false);

  const [newLink, setNewLink] = useState('');
  const [linkType, setLinkType] = useState<LinkMode>('AUTO');
  const [isVerifying, setIsVerifying] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [initialState, setInitialState] = useState('');

  /**
   * Generates a string representation of the current note state for dirty checking.
   * @returns The JSON stringified state.
   */
  const getCurrentStateString = (): string => JSON.stringify({
    title,
    content,
    linkedIds: [...linkedIds].sort(),
    isPinned
  });

  const isEditing = !!noteId;
  const isDirty = getCurrentStateString() !== initialState && !statusMessage?.text.includes("Saved");

  const isDirtyRef = useRef(isDirty);

  /**
   * Updates the ref whenever the isDirty state changes to ensure the latest value is available in event handlers.
   */
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  /**
   * Handles the browser close/navigate away warning when changes are unsaved.
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  /**
   * Checks for unsaved changes before allowing navigation.
   * @param action - The navigation function to execute if changes are clean or confirmed.
   */
  const confirmNavigation = useCallback((action: () => void) => {
    if (isDirtyRef.current) {
      setPendingAction(() => action);
      setShowConfirm(true);
    } else {
      action();
    }
  }, [setPendingAction, setShowConfirm]);

  /**
   * Initializes component state from URL location state (for editing or returning).
   */
  useEffect(() => {
    const returnNote = location.state?.returnState?.note as Note | undefined;
    const initialNote = location.state?.note as Note | undefined;

    const n = returnNote || initialNote;

    if (n) {
      setNoteId(n.id);
      setTitle(n.title);
      setContent(n.content);
      setLinkedIds(n.linkedIds || []);
      setTimestamp(n.timestamp);
      setIsPinned(!!n.isPinned);
      setInitialState(JSON.stringify({
        title: n.title,
        content: n.content,
        linkedIds: (n.linkedIds || []).sort(),
        isPinned: !!n.isPinned
      }));
    } else {
      setInitialState(JSON.stringify({title: '', content: '', linkedIds: [], isPinned: false}));
    }
  }, [location.state]);

  /**
   * Saves the current note state to offline storage.
   */
  const handleSave = () => {
    if (!title.trim()) {
      setStatusMessage({type: 'error', text: 'Title is required.'});
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    const id = noteId || `note-${Date.now()}`;
    const noteToSave: Note = {
      id,
      title,
      content,
      linkedIds,
      timestamp: Date.now(),
      isPinned
    };

    saveNote(noteToSave);
    setNoteId(id);
    setTimestamp(noteToSave.timestamp);

    const savedState = JSON.stringify({
      title: noteToSave.title,
      content: noteToSave.content,
      linkedIds: noteToSave.linkedIds.sort(),
      isPinned: noteToSave.isPinned
    });

    setInitialState(savedState);

    setStatusMessage({type: 'success', text: 'Note Saved!'});
    setTimeout(() => setStatusMessage(null), 2000);
  };

  /**
   * Deletes the current note and navigates to the notes list.
   */
  const handleDelete = () => {
    if (noteId) {
      deleteNote(noteId);
      navigate('/my-notes');
    }
  };

  /**
   * Handles input for new link, including auto-formatting for PLIN and type detection.
   * @param e - The change event from the input.
   */
  const handleLinkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (/^\d{5}$/.test(val)) {
      val = `${val.slice(0, 4)}#${val.slice(4)}`;
    }

    setNewLink(val);

    if (!val) {
      setLinkType('AUTO');
      return;
    }

    const clean = val.replace(/\s/g, '').toUpperCase();
    const prefixes = ['ITIN', 'COIN', 'POIN', 'PLIN'];

    let detectedPrefix = null;
    for (const p of prefixes) {
      if (clean.startsWith(p)) {
        detectedPrefix = p;
        break;
      }
    }

    if (detectedPrefix) {
      const remainder = clean.slice(detectedPrefix.length);
      if (remainder.length > 0) {
        const firstChar = remainder[0];
        const isValidIdStart = /[\d#]/.test(firstChar);

        if (isValidIdStart) {
          setLinkType(detectedPrefix as any);
        } else {
          setLinkType('OTHER');
        }
      } else {
        setLinkType(detectedPrefix as any);
      }
    }
  };

  /**
   * Parses link input to determine the final type and ID.
   * @param input - The raw input string.
   * @param forcedType - The currently selected link mode.
   * @returns An object containing the detected type and ID.
   */
  const parseLinkInput = (input: string, forcedType: LinkMode): { type: LinkMode, id: string } => {
    let type: LinkMode = forcedType;

    let clean = input.replace(/\s/g, '').toUpperCase();

    if (type === 'OTHER') {
      return {type, id: input.trim()};
    }

    if (['ITIN', 'COIN', 'POIN', 'PLIN'].includes(type)) {
      if (clean.startsWith(type)) {
        clean = clean.slice(type.length);
      }
    }

    let id = clean;

    if (type === 'AUTO') {
      if (/^\d{4}#\d{1,2}$/.test(id)) type = 'PLIN';
      else if (/^(8\d{3})$/.test(id)) type = 'COIN';
      else if (/^(5\d{3}|6\d{3}|7\d{3})$/.test(id)) type = 'POIN';
      else if (/^(\d{4})$/.test(id)) type = 'ITIN';
      else {
        type = 'OTHER';
        id = input.trim();
      }
    }

    return {type, id};
  };

  /**
   * Adds a new linked ID after validation against API for known types.
   */
  const handleAddLink = async () => {
    if (!newLink.trim()) return;
    setStatusMessage(null);
    setIsVerifying(true);

    const {type, id} = parseLinkInput(newLink, linkType);

    const finalType = type;
    const finalId = id;

    const exists = linkedIds.some(l => l === `${finalType}:${finalId}`);
    if (exists) {
      setStatusMessage({type: 'error', text: 'Link already added.'});
      setIsVerifying(false);
      return;
    }

    let isValid = true;
    try {
      if (finalType === 'ITIN') {
        const res = await searchItemByItin(finalId);
        if (!res.success) isValid = false;
      } else if (finalType === 'COIN') {
        const res = await searchConditionByCoin(finalId);
        if (!res.success) isValid = false;
      } else if (finalType === 'POIN') {
        const res = await searchPowerByPoin(finalId);
        if (!res.success) isValid = false;
      }
    } catch (e) {
      isValid = false;
    }

    setIsVerifying(false);

    // Prevents linking unverified ITIN, COIN, POIN entities due to environment constraints.
    if (!isValid && (['ITIN', 'COIN', 'POIN'].includes(finalType))) {
      setStatusMessage({type: 'error', text: `${finalType} ${finalId} not found in database. Not linked.`});
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setLinkedIds([...linkedIds, `${finalType}:${finalId}`]);
    setNewLink('');
    setLinkType('AUTO');
  };

  /**
   * Removes a link from the linkedIds list.
   * @param linkStr - The link string (e.g., 'ITIN:1234') to remove.
   */
  const removeLink = (linkStr: string) => {
    setLinkedIds(linkedIds.filter(l => l !== linkStr));
  };

  /**
   * Handles navigation to a linked entity after confirming unsaved changes.
   * @param linkStr - The link string (e.g., 'ITIN:1234').
   */
  const handleLinkClick = (linkStr: string) => {
    const parts = linkStr.split(':');
    const type = parts[0];
    const id = parts.slice(1).join(':');

    const currentNoteState: Note = {
      id: noteId || '',
      title,
      content,
      linkedIds,
      timestamp,
      isPinned
    };

    const navOptions = {
      returnTo: '/create-note',
      returnState: {note: currentNoteState}
    };

    const navigateAction = async () => {
      try {
        if (type === 'ITIN') {
          const res = await searchItemByItin(id);
          if (res.success && res.data) navigate('/create-item', {state: {item: res.data, mode: 'view', ...navOptions}});
        } else if (type === 'COIN') {
          const res = await searchConditionByCoin(id);
          if (res.success && res.data) navigate('/create-condition', {
            state: {
              item: res.data,
              mode: 'view', ...navOptions
            }
          });
        } else if (type === 'POIN') {
          const res = await searchPowerByPoin(id);
          if (res.success && res.data) navigate('/create-power', {
            state: {
              item: res.data,
              mode: 'view', ...navOptions
            }
          });
        } else if (type === 'PLIN') {
          navigate(`/?q=${id}&filter=owner`);
        }
      } catch (e) {
        console.error("Navigation error", e);
      }
    };

    if (['ITIN', 'COIN', 'POIN', 'PLIN'].includes(type)) {
      confirmNavigation(navigateAction);
    }
  };

  /**
   * Renders a styled badge for a linked entity.
   * @param linkStr - The link string (e.g., 'ITIN:1234').
   * @returns A React element for the link badge.
   */
  const renderLinkBadge = (linkStr: string) => {
    const parts = linkStr.split(':');
    const type = parts[0];
    const id = parts.slice(1).join(':');

    let colorClass = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    let Icon = LinkIcon;
    const isClickable = ['ITIN', 'COIN', 'POIN', 'PLIN'].includes(type);

    if (type === 'ITIN') {
      colorClass = 'bg-entity-item/10 text-entity-item border-entity-item/20';
      Icon = Box;
    } else if (type === 'COIN') {
      colorClass = 'bg-entity-condition/10 text-entity-condition border-entity-condition/20';
      Icon = Activity;
    } else if (type === 'POIN') {
      colorClass = 'bg-entity-power/10 text-entity-power border-entity-power/20';
      Icon = Zap;
    } else if (type === 'PLIN') {
      colorClass = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      Icon = User;
    } else if (type === 'OTHER') {
      Icon = Copy;
    }

    return (
      <div key={linkStr}
           data-testid={`link-badge-${type}-${id}`}
           className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono font-bold transition-all ${colorClass}`}>
        <button
          type="button"
          onClick={() => isClickable && handleLinkClick(linkStr)}
          className={`flex items-center gap-1 ${isClickable ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
          data-testid={`link-navigate-btn-${type}-${id}`}
        >
          <Icon size={12}/>
          <span>{type !== 'OTHER' && type !== 'UNKNOWN' ? type : ''} {id}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeLink(linkStr);
          }}
          data-testid={`link-remove-btn-${type}-${id}`}
          className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X size={12}/>
        </button>
      </div>
    );
  };

  /**
   * Handles the primary action of the confirmation modal: discarding unsaved changes
   * and executing the pending navigation action.
   */
  const handleDiscardChanges = () => {
    if (pendingAction) pendingAction();
    setShowConfirm(false);
    setPendingAction(null);
  };

  const panelTitle = isEditing ? 'Edit Note' : 'New Note';
  const headerLeftContent = <StickyNote size={20} className="text-entity-note"/>;
  const headerRightContent = isEditing
    ? <span className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="last-edited-timestamp">Edited: {new Date(timestamp).toLocaleString()}</span>
    : null;

  return (
    // Reverted: Removed flex-col and h-full classes
    <Page maxWidth="lg" data-testid="create-note-page">
      <ScrollbarHideStyles/>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to navigate away and lose them?"
        primaryAction={{
          label: "Discard",
          handler: handleDiscardChanges,
          variant: "danger"
        }}
        secondaryAction={{
          label: "Cancel",
          handler: () => setShowConfirm(false),
        }}
        data-testid="confirm-navigation-modal"
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowConfirm(false)}
        title="Delete Note?"
        message="This cannot be undone."
        primaryAction={{
          label: "Delete",
          handler: handleDelete,
          variant: "danger",
        }}
        secondaryAction={{
          label: "Cancel",
          handler: () => setShowDeleteConfirm(false),
        }}
        data-testid="confirm-delete-modal"
      />

      {/* Top button bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => confirmNavigation(() => navigate('/my-notes'))}
            title="Back to Notes"
            data-testid="back-to-notes-btn"
          >
            <ArrowLeft size={16}/>
          </Button>
          <Button
            variant="secondary"
            onClick={() => confirmNavigation(() => navigate('/'))}
            title="Dashboard"
            data-testid="go-to-dashboard-btn"
          >
            <Home size={16}/>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Unpin Note" : "Pin Note"}
            className={isPinned ? "bg-entity-note/10 text-entity-note border-entity-note/30" : ""}
            data-testid="pin-note-btn"
          >
            <Pin size={16} fill={isPinned ? "currentColor" : "none"}/>
            {/* Added data-testid to check pinned state display */}
            <span data-testid="is-pinned-status" className="sr-only">{isPinned ? "Pinned" : "Unpinned"}</span>
          </Button>
          {isEditing && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Note"
              data-testid="delete-note-btn"
            >
              <Trash2 size={16}/>
            </Button>
          )}
        </div>
      </div>

      {/* Panel Wrapper - Reverted: Removed flex-1 min-h-0 */}
      <div>
        <Panel
          title={panelTitle}
          headerLeftContent={headerLeftContent}
          headerRightContent={headerRightContent}
          data-testid="note-editor-panel"
        >
          {/* Main content wrapper inside Panel: Reverted: Removed flex-col and h-full */}
          <div className="p-4">
            {statusMessage && (
              <div
                className={`mb-4 p-2 rounded border text-sm font-serif ${
                  statusMessage.type === 'success'
                    ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                    : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                }`}
                data-testid={`status-message-${statusMessage.type}`}
              >
                <p className="font-bold">{statusMessage.text}</p>
              </div>
            )}

            {/* Scrollable Content Area: Reverted: Removed flex-1 min-h-0 overflow-y-auto */}
            <div className="space-y-4" data-testid="scrollable-content">
              <Input
                id="note-title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title"
                data-testid="note-title-input"
              />

              <Input
                id="note-content"
                label="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                multiline
                rows={4}
                expandable={true}
                data-testid="note-content-input"
              />

              <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-700">
                <label htmlFor="new-link-input"
                       className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-2">Linked
                  Objects</label>

                {linkedIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3" data-testid="linked-objects-list">
                    {linkedIds.map(renderLinkBadge)}
                  </div>
                )}

                <div className="flex flex-col gap-2">

                  {/* Ensures horizontal scrollbar hiding. */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hidden" data-testid="link-type-selectors">
                    {(['AUTO', 'ITIN', 'COIN', 'POIN', 'PLIN', 'OTHER'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLinkType(t)}
                        data-testid={`link-type-selector-${t.toLowerCase()}`}
                        className={`px-2 py-1 rounded-full text-xs font-serif font-bold transition-all uppercase whitespace-nowrap border ${
                          linkType === t
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        id="new-link-input"
                        type="text"
                        value={newLink}
                        onChange={handleLinkInputChange}
                        placeholder={`Enter ${linkType === 'AUTO' ? 'ID, PLIN, or Text' : linkType}...`}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:border-brand-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                        data-testid="add-link-input"
                      />
                      {/* Added data-testid to check the current link type used for validation/parsing */}
                      <span data-testid="current-link-type-display" className="sr-only">{linkType}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLink}
                      disabled={!newLink || isVerifying}
                      className="p-1.5 bg-brand-primary text-white rounded hover:brightness-110 disabled:opacity-50"
                      title="Add Link"
                      data-testid="add-link-btn"
                    >
                      {isVerifying ?
                        <Loader2 size={20} className="animate-spin" data-testid="link-verification-spinner"/> :
                        <Plus size={20}/>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer: Save button area */}
            <div className="pt-2 flex justify-end items-center border-t border-gray-200 dark:border-gray-700 mt-4">
              <Button onClick={handleSave} disabled={!isDirty && isEditing} data-testid="save-note-btn">
                <Save size={16} className="mr-2"/> Save Note
              </Button>
              {/* Added data-testid to check the isDirty state when not saved */}
              <span data-testid="is-dirty-status" className="sr-only">{isDirty ? "Dirty" : "Clean"}</span>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
};

export default CreateNote;
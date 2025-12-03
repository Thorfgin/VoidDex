import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Save, Trash2, Link as LinkIcon, Plus, X, Loader2, Copy, User, Zap, Activity, Box, Pin } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { saveNote, deleteNote } from '../services/offlineStorage';
import { searchItemByItin, searchConditionByCoin, searchPowerByPoin } from '../services/api';
import { Note } from '../types';

const CreateNote: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Note State
  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [isPinned, setIsPinned] = useState(false);
  
  // Link Input State
  const [newLink, setNewLink] = useState('');
  const [linkType, setLinkType] = useState<'AUTO' | 'ITIN' | 'COIN' | 'POIN' | 'PLIN' | 'OTHER'>('AUTO');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // UI State
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Dirty State Logic
  const [initialState, setInitialState] = useState('');
  
  const getCurrentStateString = () => JSON.stringify({ title, content, linkedIds: [...linkedIds].sort(), isPinned });
  
  const isEditing = !!noteId;
  const isDirty = getCurrentStateString() !== initialState && !statusMessage?.text.includes("Saved");

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowConfirm(true);
    } else {
      action();
    }
  };

  // Initialization
  useEffect(() => {
    if (location.state && location.state.note) {
        const n = location.state.note as Note;
        setNoteId(n.id);
        setTitle(n.title);
        setContent(n.content);
        setLinkedIds(n.linkedIds || []);
        setTimestamp(n.timestamp);
        setIsPinned(!!n.isPinned);
        setInitialState(JSON.stringify({ title: n.title, content: n.content, linkedIds: (n.linkedIds || []).sort(), isPinned: !!n.isPinned }));
    } else {
        setInitialState(JSON.stringify({ title: '', content: '', linkedIds: [], isPinned: false }));
    }
  }, [location.state]);

  const handleSave = () => {
      if (!title.trim()) {
          setStatusMessage({ type: 'error', text: 'Title is required.' });
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
      setInitialState(getCurrentStateString());
      
      setStatusMessage({ type: 'success', text: 'Note Saved!' });
      setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleDelete = () => {
      if (noteId) {
          deleteNote(noteId);
          navigate('/my-notes');
      }
  };

  // --- LINK LOGIC ---

  const handleLinkInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // 1. PLIN Auto-format: 5 digits -> 4 digits + # + 1 digit
      // Automatically inserts hash if user types 5 consecutive digits
      if (/^\d{5}$/.test(val)) {
          val = `${val.slice(0, 4)}#${val.slice(4)}`;
      }

      setNewLink(val);

      // 2. Type Detection
      if (!val) {
          setLinkType('AUTO');
          return;
      }

      // Ignore spaces for type detection rule
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
          // Check what comes immediately after the prefix in the cleaned string
          const remainder = clean.slice(detectedPrefix.length);
          
          if (remainder.length > 0) {
              const firstChar = remainder[0];
              // Rule: "if there is any character in between the type and digits, consider it a string and select Other"
              // Since we stripped spaces, if the user typed `ITIN:1234`, `firstChar` is `:`.
              // If user typed `ITIN 1234`, `clean` is `ITIN1234`, `firstChar` is `1`.
              // Valid starts for ID are Digits or # (for PLINs entered incompletely like PLIN#...)
              const isValidIdStart = /[\d#]/.test(firstChar);
              
              if (isValidIdStart) {
                  setLinkType(detectedPrefix as any);
              } else {
                  setLinkType('OTHER');
              }
          } else {
              // Just the prefix detected so far
              setLinkType(detectedPrefix as any);
          }
      } 
      // If no prefix matches, we leave the type as is (usually AUTO or whatever user selected)
  };

  const parseLinkInput = (input: string, forcedType: string) => {
      let type = forcedType;
      
      // "Any spaces should be ignored" -> Clean input for processing
      let clean = input.replace(/\s/g, '').toUpperCase();
      
      if (type === 'OTHER') {
          // OTHER types preserve the raw input (spaces and all)
          return { type, id: input.trim() }; 
      }

      // If a specific type is selected/forced, strip that prefix from the clean string if present
      if (['ITIN', 'COIN', 'POIN', 'PLIN'].includes(type)) {
          if (clean.startsWith(type)) {
              clean = clean.slice(type.length);
          }
      }

      let id = clean;

      // If AUTO, deduce type from the cleaned ID pattern
      if (type === 'AUTO') {
          if (/^\d{4}#\d{1,2}$/.test(id)) type = 'PLIN';
          else if (/^(8\d{3})$/.test(id)) type = 'COIN';
          else if (/^(5\d{3}|6\d{3}|7\d{3})$/.test(id)) type = 'POIN';
          else if (/^(\d{4})$/.test(id)) type = 'ITIN';
          else {
              type = 'OTHER';
              // If it fell back to OTHER, use original input to preserve spaces/format
              id = input.trim(); 
          }
      }
      
      return { type, id };
  };

  const handleAddLink = async () => {
      if (!newLink.trim()) return;
      setStatusMessage(null);
      setIsVerifying(true);

      const { type, id } = parseLinkInput(newLink, linkType);
      
      let finalType = type;
      let finalId = id;
      
      const exists = linkedIds.some(l => l === `${finalType}:${finalId}`);
      if (exists) {
          setStatusMessage({ type: 'error', text: 'Link already added.' });
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

      if (!isValid && (['ITIN', 'COIN', 'POIN'].includes(finalType))) {
          if (!window.confirm(`${finalType} ${finalId} not found in database. Add anyway?`)) {
              return;
          }
      }

      setLinkedIds([...linkedIds, `${finalType}:${finalId}`]);
      setNewLink('');
      setLinkType('AUTO');
  };

  const removeLink = (linkStr: string) => {
      setLinkedIds(linkedIds.filter(l => l !== linkStr));
  };

  const handleLinkClick = (linkStr: string) => {
      const parts = linkStr.split(':');
      const type = parts[0];
      const id = parts.slice(1).join(':');

      // Construct current state to pass back to ensure edits are preserved when returning
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
          returnState: { note: currentNoteState }
      };

      const navigateAction = async () => {
          try {
              if (type === 'ITIN') {
                  const res = await searchItemByItin(id);
                  if (res.success && res.data) navigate('/create-item', { state: { item: res.data, mode: 'view', ...navOptions } });
              } else if (type === 'COIN') {
                  const res = await searchConditionByCoin(id);
                  if (res.success && res.data) navigate('/create-condition', { state: { item: res.data, mode: 'view', ...navOptions } });
              } else if (type === 'POIN') {
                  const res = await searchPowerByPoin(id);
                  if (res.success && res.data) navigate('/create-power', { state: { item: res.data, mode: 'view', ...navOptions } });
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
          <div key={linkStr} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono font-bold transition-all ${colorClass}`}>
              <button
                type="button"
                onClick={() => isClickable && handleLinkClick(linkStr)}
                className={`flex items-center gap-1 ${isClickable ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
              >
                <Icon size={12} />
                <span>{type !== 'OTHER' && type !== 'UNKNOWN' ? type : ''} {id}</span>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    removeLink(linkStr);
                }}
                className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
              >
                  <X size={12} />
              </button>
          </div>
      );
  };

  return (
    <div className="mx-auto mt-2 px-2 w-full landscape:w-9/12">
       <ConfirmModal 
         isOpen={showConfirm}
         onClose={() => setShowConfirm(false)}
         onConfirm={() => {
           if (pendingAction) pendingAction();
           setShowConfirm(false);
           setPendingAction(null);
         }}
       />

       <ConfirmModal 
         isOpen={showDeleteConfirm}
         onClose={() => setShowDeleteConfirm(false)}
         onConfirm={handleDelete}
         title="Delete Note?"
         message="This cannot be undone."
         confirmLabel="Delete"
       />

       {/* Toolbar */}
       <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
         <div className="flex gap-2">
            <Button variant="secondary" onClick={() => confirmNavigation(() => navigate('/my-notes'))} title="Back">
                <ArrowLeft size={16} />
            </Button>
            <Button variant="secondary" onClick={() => confirmNavigation(() => navigate('/'))} title="Dashboard">
              <Home size={16} />
            </Button>
         </div>
         <div className="flex gap-2">
            <Button 
                variant="secondary" 
                onClick={() => setIsPinned(!isPinned)} 
                title={isPinned ? "Unpin Note" : "Pin Note"}
                className={isPinned ? "bg-entity-note/10 text-entity-note border-entity-note/30" : ""}
            >
                <Pin size={16} fill={isPinned ? "currentColor" : "none"} />
            </Button>
            {isEditing && (
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} title="Delete Note">
                    <Trash2 size={16} />
                </Button>
            )}
         </div>
       </div>

       {/* Main Editor Card */}
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow-panel border border-gray-300 dark:border-gray-600 overflow-hidden">
           
           <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
               <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
                   {isEditing ? 'Edit Note' : 'New Note'}
               </h2>
               <div className="text-xs text-gray-500 dark:text-gray-400">
                   {isEditing ? `Edited: ${new Date(timestamp).toLocaleString()}` : ''}
               </div>
           </div>

           <div className="p-4">
               {statusMessage && (
                <div className={`mb-4 p-2 rounded border text-sm font-serif ${
                    statusMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                    <p className="font-bold">{statusMessage.text}</p>
                </div>
               )}

               <div className="space-y-4">
                   <Input 
                        label="Title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="Note Title"
                   />
                   
                   <Input 
                        label="Content" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        placeholder="Write your note here..."
                        multiline 
                        rows={10}
                        expandable={false}
                   />

                   {/* Links Section */}
                   <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-700">
                       <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-2">Linked Objects</label>
                       
                       {/* Existing Links */}
                       {linkedIds.length > 0 && (
                           <div className="flex flex-wrap gap-2 mb-3">
                               {linkedIds.map(renderLinkBadge)}
                           </div>
                       )}

                       {/* Add Link Control */}
                       <div className="flex flex-col gap-2">
                           
                           {/* Type Selection Badges (Replacing Select Box) */}
                           <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                               {(['AUTO', 'ITIN', 'COIN', 'POIN', 'PLIN', 'OTHER'] as const).map((t) => (
                                   <button
                                       key={t}
                                       type="button"
                                       onClick={() => setLinkType(t)}
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
                                        type="text"
                                        value={newLink} 
                                        onChange={handleLinkInputChange} 
                                        placeholder={`Enter ${linkType === 'AUTO' ? 'ID, PLIN, or Text' : linkType}...`} 
                                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:border-brand-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                                    />
                               </div>
                               <button 
                                    type="button"
                                    onClick={handleAddLink} 
                                    disabled={!newLink || isVerifying} 
                                    className="p-1.5 bg-brand-primary text-white rounded hover:brightness-110 disabled:opacity-50"
                                    title="Add Link"
                               >
                                   {isVerifying ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                               </button>
                           </div>
                       </div>
                   </div>

                   {/* Footer Actions */}
                   <div className="pt-2 flex justify-end items-center border-t border-gray-200 dark:border-gray-700">
                       <Button onClick={handleSave} disabled={!isDirty && isEditing}>
                           <Save size={16} className="mr-2" /> Save Note
                       </Button>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};

export default CreateNote;
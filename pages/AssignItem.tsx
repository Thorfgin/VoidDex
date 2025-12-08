import React, {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import UserPlusMinus from '../components/icons/UserPlusMinus';
import {searchItemByItin, updateItem, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
import {Item} from '../types';
import {
  Search,
  Home,
  AlertTriangle,
  ArrowLeft,
  Save,
  FileText
} from 'lucide-react';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';

const AssignItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [itinSearch, setItinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  // Data state
  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Logic to handle safe unassignment (requires 2 clicks)
  const [confirmUnassign, setConfirmUnassign] = useState(false);

  // Modal control
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Discard Changes?");
  const [confirmMessage, setConfirmMessage] = useState("You have unsaved changes. Are you sure you want to discard them?");
  const [confirmLabel, setConfirmLabel] = useState("Discard");
  const [confirmVariant, setConfirmVariant] = useState<'primary' | 'danger'>("danger");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  // Baseline for navigation warning (matches last saved or loaded state)
  const [baselineOwner, setBaselineOwner] = useState('');

  const isSuccess = statusMessage?.type === 'success';
  const isDirtyDB = item !== null && item.owner !== owner && !isSuccess;
  const isUnsaved = item !== null && owner !== baselineOwner && !isSuccess;

  // Resolved name for the input display
  const characterName = getCharacterName(owner);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUnsaved]);

  const confirmAction = (action: () => void) => {
    if (isUnsaved) {
      setConfirmTitle("Discard Changes?");
      setConfirmMessage("You have unsaved changes. Are you sure you want to discard them?");
      setConfirmLabel("Discard");
      setConfirmVariant("danger");
      setPendingAction(() => action);
      setShowConfirm(true);
    } else {
      action();
    }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (location.state) {
      if (location.state.initialData) {
        const {item: savedItem, owner: savedOwner} = location.state.initialData;
        setItem(savedItem);
        setItinSearch(savedItem.itin);
        setOwner(savedOwner);
        setBaselineOwner(savedOwner);
        if (location.state.draftId) setDraftId(location.state.draftId);
        if (location.state.draftTimestamp) setDraftTimestamp(location.state.draftTimestamp);
      } else if (location.state.item) {
        const passedItem = location.state.item as Item;
        setItem(passedItem);
        setItinSearch(passedItem.itin);
        setOwner(passedItem.owner);
        setBaselineOwner(passedItem.owner);
      }
    }
  }, [location.state]);

  const handleResetSearch = () => {
    setItem(null);
    setItinSearch('');
    setOwner('');
    setBaselineOwner('');
    setSearchError('');
    setStatusMessage(null);
    setConfirmUnassign(false);
    setDraftId(null);
    setDraftTimestamp(null);
    navigate(location.pathname, {replace: true, state: {}});
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setStatusMessage(null);
    setItem(null);
    setDraftId(null);
    setDraftTimestamp(null);

    setIsSearching(true);
    try {
      const result = await searchItemByItin(itinSearch);
      if (result.success && result.data) {
        setItem(result.data);
        setOwner(result.data.owner);
        setBaselineOwner(result.data.owner);
      } else {
        setSearchError('Not found');
      }
    } catch (err) {
      setSearchError('Error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveDraft = () => {
    if (!item) return;
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'item',
      action: 'assign',
      data: {item, owner},
      timestamp: now,
      title: item.name || 'Unknown Item',
      subtitle: `Assign ITIN: ${item.itin}`
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setBaselineOwner(owner);
    setStatusMessage({type: 'success', text: 'Draft saved successfully.'});
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  const formatPLIN = (val: string) => {
    const clean = val.replace(/[^0-9#]/g, '');
    if (clean.includes('#')) {
      const parts = clean.split('#');
      return `${parts[0].slice(0, 4)}#${parts.slice(1).join('').slice(0, 2)}`;
    }
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}#${clean.slice(4, 6)}`;
    }
    return clean;
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmUnassign(false);
    setOwner(formatPLIN(e.target.value));
  };

  const executeUpdate = async () => {
    if (!item) return;

    if (owner.trim().length > 0 && !/^\d{1,4}#\d{1,2}$/.test(owner)) {
      setStatusMessage({type: 'error', text: 'Player PLIN must be format 1234#12 or 12#1'});
      return;
    }

    setIsUpdating(true);
    setConfirmUnassign(false);
    try {
      const oldOwner = item.owner;
      const result = await updateItem(item.itin, {owner});
      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        let msg;
        if (oldOwner && !owner) {
          msg = `Unassigned ${oldOwner}`;
        } else if (!oldOwner && owner) {
          msg = `Assigned ${owner}`;
        } else if (oldOwner && owner && oldOwner !== owner) {
          msg = `Unassigned ${oldOwner}, Assigned ${owner}`;
        } else {
          msg = `Assignment updated to ${owner}`;
        }

        setStatusMessage({type: 'success', text: msg});
        setItem({...item, owner});
        setBaselineOwner(owner);
      } else {
        setStatusMessage({type: 'error', text: 'Failed.'});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'Error'});
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = () => {
    if (!item) return;

    if (owner.trim().length === 0 && !confirmUnassign) {
      setConfirmUnassign(true);
      return;
    }

    if (draftId) {
      setConfirmTitle("Process Draft?");
      setConfirmMessage("The object may have been changed since this draft was stored. Proceed?");
      setConfirmLabel("Process");
      setConfirmVariant("primary");
      setPendingAction(() => executeUpdate);
      setShowConfirm(true);
      return;
    }

    executeUpdate().then();
  };

  const getDisplayValue = () => {
    if (isSuccess && characterName) {
      return `${owner} ${characterName}`;
    }
    return owner;
  }

  // --- Header/Panel Content Definitions ---

  const headerLeftContent = (<UserPlusMinus size={20} className="text-entity-item"/>);

  const headerRightContent = (
    draftId && draftTimestamp ? (
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
             <span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleDateString()}
          </span>
    ) : null
  );

  const title = 'Assign Item'; // Changed to camelCase

  // --- Render (Wrapped in Page and Panel) ---
  return (
    <Page maxWidth="lg">

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmVariant={confirmVariant}
        onConfirm={() => {
          if (pendingAction) pendingAction();
          setShowConfirm(false);
          setPendingAction(null);
        }}
      />

      {/* External Button Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <div className="flex gap-2">
          {/* Back Button */}
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button"
                    onClick={() => confirmAction(() => navigate(returnTo || `/?${returnQuery}`))} title="Back">
              <ArrowLeft size={16} className="mr-2"/> Back
            </Button>
          )}
          {/* Home Button */}
          <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))}
                  title="Dashboard">
            <Home size={16}/>
          </Button>
          {/* New Search Button */}
          <Button variant="secondary" type="button" onClick={() => confirmAction(handleResetSearch)} title="New Search">
            <Search size={16}/>
          </Button>
        </div>
      </div>
      {/* End External Button Bar */}

      {/* Panel Wrapper */}
      <Panel
        title={title}
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
      >
        <div className="p-4">
          {!item && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2 max-w-sm mx-auto">
              <Input
                label="Enter ITIN"
                value={itinSearch}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setItinSearch(val);
                }}
                placeholder="4-digit ID"
                error={searchError}
                className="mb-0"
                inputMode="numeric"
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSearching} disabled={!itinSearch}>
                  <Search size={16} className="mr-2"/> Find
                </Button>
              </div>
            </form>
          )}

          {item && (
            <div className="space-y-2 animation-fade-in">
              {confirmUnassign && (
                <div
                  className="p-2 bg-yellow-50 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 rounded flex items-center gap-2 text-sm">
                  <AlertTriangle size={16}/>
                  <span>Are you sure you want to remove the player? Please confirm.</span>
                </div>
              )}
              {statusMessage && (
                <div className={`p-2 rounded border text-sm font-serif ${
                  statusMessage.type === 'success'
                    ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                    : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                }`}>
                  {statusMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <Input label="ITIN" value={item.itin} readOnly className="font-mono bg-gray-50"/>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    label="Player (PLIN)"
                    value={getDisplayValue()}
                    onChange={handleOwnerChange}
                    readOnly={isSuccess}
                    placeholder="1234#12"
                    multiline={isSuccess}
                  />
                  {!isSuccess && characterName && (
                    <div className="-mt-3 mb-3 ml-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                      {characterName}
                    </div>
                  )}
                </div>
              </div>

              <Input label="Name" value={item.name} readOnly/>
              <Input label="Description" value={item.description} readOnly multiline rows={3}/>
              <Input label="Remarks" value={item.remarks || ''} readOnly multiline rows={3}/>
              <Input label="CS Remarks" value={item.csRemarks || ''} readOnly multiline rows={3}/>

              {!isSuccess && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={handleSaveDraft}>
                    <FileText size={16} className="mr-2"/> Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    isLoading={isUpdating}
                    variant={confirmUnassign ? 'danger' : 'primary'}
                    disabled={!isDirtyDB && !confirmUnassign}
                  >
                    <Save size={16} className="mr-2"/>
                    {confirmUnassign ? 'Confirm Unassign' : (owner ? 'Assign' : 'Unassign')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>
    </Page>
  );
};

export default AssignItem;
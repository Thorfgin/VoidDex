import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { createCondition, getCharacterName } from '../services/api';
import { saveStoredChange, deleteStoredChange } from '../services/offlineStorage';
import {
  Home,
  FilePlus,
  ArrowLeft,
  Save,
  CalendarClock,
  FileText,
  ChevronDown,
  X,
  Check,
  Activity
} from 'lucide-react';
import { Condition, Assignment } from '../types';

// Custom Icon definition (Kept for completeness)
const UserPlusMinus = ({ size = 24, className = "" }: { size?: number | string, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M13 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4H5a4 4 0 0 0-4 4v2" />
    <circle cx="7" cy="7" r="4" />
    <path d="M19 3v6" />
    <path d="M16 6h6" />
    <path d="M16 16h6" />
  </svg>
);

const CreateCondition: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isViewMode, setIsViewMode] = useState(false);
  const [viewCoin, setViewCoin] = useState('');

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  // Dropdown Logic for View Mode
  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  const getDefaultExpiry = () => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    date.setFullYear(date.getFullYear() + 1);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    owner: '',
    expiryDate: getDefaultExpiry(),
    remarks: '',
    csRemarks: ''
  });

  const [initialState, setInitialState] = useState(formData);
  const characterName = getCharacterName(formData.owner);
  const isDirty = !isReadOnly && !isViewMode && JSON.stringify(formData) !== JSON.stringify(initialState);

  // --- Effects and Handlers (Unchanged Logic) ---

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setShowOwnerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const confirmAction = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowConfirm(true);
    } else {
      action();
    }
  };

  const handleBack = () => {
    const target = returnTo || (returnQuery ? `/?${returnQuery}` : '/');
    const stateToPass = location.state?.returnState || {};
    confirmAction(() => navigate(target, { state: stateToPass }));
  };

  useEffect(() => {
    if (location.state) {
      if (location.state.mode === 'view' && location.state.item) {
        const item = location.state.item as Condition;
        const assignments = item.assignments || [];
        setOriginalAssignments(assignments);

        // Logic for Expiry Display
        let expDisplay = '';
        let ownerDisplay = '';

        if (assignments.length > 1) {
          expDisplay = 'Multiple';
          ownerDisplay = ''; // Empty to show placeholder "Select player..."
        } else if (assignments.length === 1) {
          expDisplay = assignments[0].expiryDate;
          const name = getCharacterName(assignments[0].plin);
          ownerDisplay = name ? `${assignments[0].plin} ${name}` : assignments[0].plin;
        }

        const data = {
          name: item.name,
          description: item.description,
          owner: ownerDisplay,
          expiryDate: expDisplay,
          remarks: item.remarks || '',
          csRemarks: item.csRemarks || ''
        };

        setFormData(data);
        setInitialState(data);
        setOwnerSearch(ownerDisplay);
        setViewCoin(item.coin);
        setIsReadOnly(true);
        setIsViewMode(true);
        setStatusMessage(null);
      } else if (location.state.initialData) {
        const data = {
          ...formData,
          ...location.state.initialData
        };
        setFormData(data);
        setInitialState(data);
        if (location.state.draftId) {
          setDraftId(location.state.draftId);
        }
        if (location.state.draftTimestamp) {
          setDraftTimestamp(location.state.draftTimestamp);
        }
      }
    }
  }, [location.state]);

  const handleReset = () => {
    const defaultData = {
      name: '',
      description: '',
      owner: '',
      expiryDate: getDefaultExpiry(),
      remarks: '',
      csRemarks: ''
    };
    setFormData(defaultData);
    setInitialState(defaultData);
    setIsReadOnly(false);
    setIsViewMode(false);
    setViewCoin('');
    setOriginalAssignments([]);
    setOwnerSearch('');
    setStatusMessage(null);
    setIsLoading(false);
    setDraftId(null);
    setDraftTimestamp(null);
    navigate('/create-condition', { replace: true, state: {} });
  };

  const handleNavigateWithState = (path: string) => {
    const assignments = formData.owner.split(',').filter(s=>s.trim()).map(s => ({
      plin: s.trim(),
      expiryDate: formData.expiryDate
    }));

    // If we are in view mode with multiple, preserve the original structure
    // unless explicit edits were made (which aren't allowed in view mode)
    const currentAssignments = isViewMode ? originalAssignments : assignments;

    const currentItem: Condition = {
      coin: viewCoin,
      name: formData.name,
      description: formData.description,
      assignments: currentAssignments,
      remarks: formData.remarks,
      csRemarks: formData.csRemarks
    };
    navigate(path, {
      state: {
        item: currentItem,
        returnQuery: returnQuery
      }
    });
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

  const formatDate = (val: string) => {
    let clean = val.replace(/\D/g, '');
    let day = clean.slice(0, 2);
    let month = clean.slice(2, 4);
    let year = clean.slice(4, 8);
    if (day.length === 2) day = day.toString().padStart(2, '0');
    if (month.length === 2) month = month.toString().padStart(2, '0');
    let res = day;
    if (clean.length >= 3) res += `/${month}`;
    if (clean.length >= 5) res += `/${year}`;
    return res;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'owner') {
      newValue = formatPLIN(value);
    } else if (name === 'expiryDate') {
      if ((formData.expiryDate && value.length < formData.expiryDate.length)) newValue = value;
      else newValue = formatDate(value);
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSaveDraft = () => {
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'condition',
      action: 'create',
      data: formData,
      timestamp: now,
      title: formData.name || 'Untitled Condition',
      subtitle: 'Draft Condition'
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setInitialState(formData);
    setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  const validateForm = () => {
    const { name, description, owner, expiryDate } = formData;
    if (!name.trim()) return "Name is required.";
    if (!description.trim()) return "Description is required.";
    if (!/^\d{1,4}#\d{1,2}$/.test(owner) && owner !== 'SYSTEM' && owner !== '') return "Player must be format 1234#12";
    if (expiryDate.trim() !== '' && expiryDate !== 'until death') {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) return "Expiry Date must be DD/MM/YYYY or Empty";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    setStatusMessage(null);
    const error = validateForm();
    if (error) {
      setStatusMessage({ type: 'error', text: error });
      return;
    }
    setIsLoading(true);
    try {
      const expiryToSave = formData.expiryDate.trim() === '' ? 'until death' : formData.expiryDate;
      const assignments = formData.owner.trim() ? [{ plin: formData.owner, expiryDate: expiryToSave }] : [];

      const result = await createCondition({
        name: formData.name,
        description: formData.description,
        assignments: assignments,
        remarks: formData.remarks,
        csRemarks: formData.csRemarks
      });

      if (result.success && result.data) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        setStatusMessage({ type: 'success', text: `Condition Created! COIN: ${result.data.coin}` });
        setIsReadOnly(true);
        setInitialState(formData);
        setViewCoin(result.data.coin);
        setIsViewMode(true);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed: ' + result.error });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- DROPDOWN LOGIC ---
  const handleOwnerSelect = (assign: Assignment) => {
    const name = getCharacterName(assign.plin);
    const displayName = name ? `${assign.plin} ${name}` : assign.plin;
    setOwnerSearch(displayName);
    setFormData(prev => ({ ...prev, expiryDate: assign.expiryDate }));
    setShowOwnerDropdown(false);
  };

  const handleOwnerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOwnerSearch(e.target.value);
    if (!showOwnerDropdown) setShowOwnerDropdown(true);
    // Reset expiry to "Multiple" if clearing search or changing it manually in view mode
    if (originalAssignments.length > 1) {
      setFormData(prev => ({ ...prev, expiryDate: 'Multiple' }));
    }
  };

  const filteredAssignments = originalAssignments.filter(a => {
    const search = ownerSearch.toLowerCase();
    const name = getCharacterName(a.plin) || '';
    const fullName = `${a.plin} ${name}`.toLowerCase();
    return a.plin.toLowerCase().includes(search) ||
      name.toLowerCase().includes(search) ||
      fullName.includes(search);
  });

  const inputClasses = "w-full px-3 py-2 border rounded-md shadow-inner font-serif text-sm transition-all duration-200 border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600";

  // --- Render Props ---

  const ownerInput = (
    <div className="mb-4 w-full">
      <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-1.5 text-left">
        {isViewMode ? "Assigned Players" : "Player (PLIN)"}:
      </label>

      {isViewMode ? (
        <div className="relative" ref={ownerDropdownRef}>
          <div className="relative">
            <input
              ref={ownerInputRef}
              type="text"
              className={`${inputClasses} pr-8`}
              placeholder={originalAssignments.length > 1 ? "Select player to view..." : "None"}
              value={ownerSearch}
              onChange={handleOwnerSearchChange}
              onFocus={() => {
                if (originalAssignments.length > 0) setShowOwnerDropdown(true);
              }}
            />
            <div
              className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (ownerSearch) {
                  // Smart Clear: Clear text, open dropdown, focus input
                  setOwnerSearch('');
                  setShowOwnerDropdown(true);
                  ownerInputRef.current?.focus();
                  if (originalAssignments.length > 1) {
                    setFormData(prev => ({ ...prev, expiryDate: 'Multiple' }));
                  }
                } else {
                  // Toggle if empty
                  setShowOwnerDropdown(!showOwnerDropdown);
                }
              }}
            >
              {ownerSearch ? <X size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showOwnerDropdown && originalAssignments.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-20 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((a, idx) => (
                  <div
                    key={`${a.plin}-${idx}`}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-2 group"
                    onClick={() => handleOwnerSelect(a)}
                  >
                    <div className="flex-1">
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{a.plin}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Exp: {a.expiryDate}</span>
                      {getCharacterName(a.plin) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{getCharacterName(a.plin)}</div>
                      )}
                    </div>
                    {/* The checkmark logic below is maintained from the original pattern */}
                    {formData.expiryDate === a.expiryDate && ownerSearch.includes(a.plin) && (
                      <Check size={14} className="text-green-600 dark:text-green-400" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 italic text-center">No matches found</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <Input
            label=""
            name="owner"
            value={formData.owner}
            onChange={handleChange}
            readOnly={isReadOnly}
            required={false}
            placeholder="1234#12"
            className="mb-0"
          />
          {characterName && (
            <div className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">{characterName}</div>
          )}
        </>
      )}
    </div>
  );

  const expiryInput = (
    <Input
      label="Expiry Date"
      name="expiryDate"
      value={formData.expiryDate}
      onChange={handleChange}
      readOnly={isReadOnly}
      required={false}
      placeholder="dd/mm/yyyy (Empty = 'until death')"
      className={formData.expiryDate === 'Multiple' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}
    />
  );

  // Preparing Panel content
  const headerLeftContent = (<Activity size={20} className="text-entity-item" />);
  const headerRightContent=(draftId && draftTimestamp ? (
    <span>
        <span className="font-bold">(Draft)</span>
      {new Date(draftTimestamp).toLocaleString()}
      </span>) : null)

  // --- Main Render Block ---

  return (
    // 1. Use the new Page component
    <Page maxWidth="xl" className="landscape:w-9/12 relative">
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          if (pendingAction) pendingAction();
          setShowConfirm(false);
          setPendingAction(null);
        }}
      />

      {/* Top Button Bar - remains outside the Panel */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button" onClick={handleBack} title="Back">
              <ArrowLeft size={16} />
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))} title="Dashboard">
            <Home size={16} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => confirmAction(handleReset)} title="Create New">
            <FilePlus size={16} />
          </Button>
          {isViewMode && (
            <>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/extend-condition')} title="Extend Condition">
                <CalendarClock size={16} />
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/assign-condition')} title="Assign Condition">
                <UserPlusMinus size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Use the new Panel component */}
      <Panel
        title={isViewMode ? 'Condition Properties' : 'Create Condition'}
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
      >
        {statusMessage && (
          <div className={`mb-4 p-2 rounded border text-sm font-serif ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
          }`}>
            <p className="font-bold">{statusMessage.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1">
          {isViewMode ? (
            <div className="flex gap-2">
              <div className="w-20 shrink-0">
                {/* Note: Added dark mode classes for COIN display based on the pattern used for ITIN and POIN */}
                <Input label="COIN" value={viewCoin} readOnly className="font-mono bg-entity-condition/10 text-entity-condition dark:bg-yellow-900/30 dark:text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                {ownerInput}
              </div>
            </div>
          ) : null}

          <Input label="Name" name="name" value={formData.name} onChange={handleChange} readOnly={isReadOnly} required={!isViewMode} placeholder="Condition Name" />
          <Input label="Description" name="description" value={formData.description} onChange={handleChange} readOnly={isReadOnly} required={!isViewMode} placeholder="Description" multiline rows={4} expandable={false} />

          {!isViewMode ? (
            <div className="flex gap-2">
              <div className="flex-1">{ownerInput}</div>
              <div className="flex-1">{expiryInput}</div>
            </div>
          ) : expiryInput}

          <Input label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} readOnly={isReadOnly} placeholder="Remarks" multiline rows={4} />
          <Input label="CS Remarks" name="csRemarks" value={formData.csRemarks} onChange={handleChange} readOnly={isReadOnly} placeholder="CS Remarks" multiline rows={4} />

          {!isReadOnly && !isViewMode && (
            <div className="pt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                <FileText size={16} className="mr-2" />
                Save Draft
              </Button>
              <Button type="submit" isLoading={isLoading}>
                <Save size={16} className="mr-2" /> Create Condition
              </Button>
            </div>
          )}
        </form>
      </Panel>
    </Page>
  );
};

export default CreateCondition;
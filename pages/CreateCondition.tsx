import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import {createCondition, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
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
  Activity,
  AlertTriangle,
  LucideIcon
} from 'lucide-react';
import {Condition, Assignment} from '../types';
import UserPlusMinus from "../components/icons/UserPlusMinus";
import {formatDate, getDefaultExpiry} from "../utils/dateUtils";

/**
 * Configuration type for the confirmation modal.
 */
type ModalConfig = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  primaryAction: React.ComponentProps<typeof ConfirmModal>['primaryAction'];
  secondaryAction?: React.ComponentProps<typeof ConfirmModal>['secondaryAction'];
  icon?: LucideIcon;
  iconColorClass?: string;
}

/**
 * Component for creating new Conditions or viewing existing ones.
 * @returns The CreateCondition component.
 */
const CreateCondition: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isViewMode, setIsViewMode] = useState(false);
  const [viewCoin, setViewCoin] = useState('');

  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  const [originalAssignments, setOriginalAssignments] = useState<Assignment[]>([]);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const ownerDropdownRef = useRef<HTMLDivElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

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

  const closeModal = () => setModalConfig(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ownerDropdownRef.current && !ownerDropdownRef.current.contains(event.target as Node)) {
        setShowOwnerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Confirms action if there are unsaved changes, otherwise executes directly.
   * @param action The function to execute if changes are discarded or no changes exist.
   */
  const confirmAction = (action: () => void) => {
    if (isDirty) {
      setModalConfig({
        isOpen: true,
        title: "Discard Changes?",
        message: "You have unsaved changes. Are you sure you want to discard them?",
        primaryAction: {
          label: "Discard",
          handler: () => {
            action();
            closeModal();
          },
          variant: "danger",
        },
        icon: AlertTriangle,
        iconColorClass: "text-amber-600 dark:text-amber-500",
      });
    } else {
      action();
    }
  };

  const handleBack = () => {
    const target = returnTo || (returnQuery ? `/?${returnQuery}` : '/');
    const stateToPass = location.state?.returnState || {};
    confirmAction(() => navigate(target, {state: stateToPass}));
  };

  useEffect(() => {
    if (location.state) {
      if (location.state.mode === 'view' && location.state.item) {
        const item = location.state.item as Condition;
        const assignments = item.assignments || [];
        setOriginalAssignments(assignments);

        let expDisplay = '';
        let ownerDisplay = '';
        let ownerPlin = '';

        if (assignments.length > 1) {
          expDisplay = 'Multiple';
          ownerDisplay = '';
        } else if (assignments.length === 1) {
          expDisplay = assignments[0].expiryDate;
          const plin = assignments[0].plin;
          const name = getCharacterName(plin);

          ownerPlin = plin;
          ownerDisplay = name ? `${plin} ${name}` : plin;

        }

        const data = {
          name: item.name,
          description: item.description,
          owner: ownerPlin,
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
    navigate('/create-condition', {replace: true, state: {}});
  };

  const handleNavigateWithState = (path: string) => {
    const assignments = formData.owner.split(',').filter(s => s.trim()).map(s => ({
      plin: s.trim(),
      expiryDate: formData.expiryDate
    }));

    const currentAssignments = isViewMode ? originalAssignments : assignments;

    const currentItem: Condition = {
      coin: viewCoin,
      name: formData.name,
      description: formData.description,
      assignments: currentAssignments,
      remarks: formData.remarks,
      csRemarks: formData.csRemarks
    };
    confirmAction(() => {
      navigate(path, {
        state: {
          item: currentItem,
          returnQuery: returnQuery
        }
      });
    });
  };

  /**
   * Formats a string to match the PLIN pattern (XXXX#YY).
   * @param val The input string.
   * @returns The formatted PLIN string.
   */
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const {name, value} = e.target;
    let newValue = value;
    if (name === 'owner') {
      newValue = formatPLIN(value);
    } else if (name === 'expiryDate') {
      if ((formData.expiryDate && value.length < formData.expiryDate.length)) newValue = value;
      else newValue = formatDate(value);
    }
    setFormData(prev => ({...prev, [name]: newValue}));
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
    setStatusMessage({type: 'success', text: 'Draft saved successfully.'});
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  const validateForm = () => {
    const {name, description, owner, expiryDate} = formData;
    if (!name.trim()) return "Name is required.";
    if (!description.trim()) return "Description is required.";
    if (!/^\d{1,4}#\d{1,2}$/.test(owner) && owner !== '') return "Player must be format 1234#12";
    if (expiryDate.trim() !== '' && expiryDate.toLowerCase() !== 'until death') {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) return "Expiry Date must be DD/MM/YYYY or 'until death'";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    setStatusMessage(null);
    const error = validateForm();
    if (error) {
      setStatusMessage({type: 'error', text: error});
      return;
    }
    setIsLoading(true);
    try {
      const expiryToSave = formData.expiryDate.trim() === '' ? 'until death' : formData.expiryDate;
      const assignments = formData.owner.trim() ? [{plin: formData.owner, expiryDate: expiryToSave}] : [];

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

        setOriginalAssignments(assignments);

        setStatusMessage({type: 'success', text: `Condition Created! COIN: ${result.data.coin}`});
        setIsReadOnly(true);
        setInitialState(formData);
        setViewCoin(result.data.coin);
        setIsViewMode(true);
      } else {
        setStatusMessage({type: 'error', text: 'Failed: ' + result.error});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'An unexpected error occurred.'});
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles selection of an owner from the view mode dropdown.
   * @param assign The selected assignment object.
   */
  const handleOwnerSelect = (assign: Assignment) => {
    const name = getCharacterName(assign.plin);
    const displayName = name ? `${assign.plin} ${name}` : assign.plin;

    setOwnerSearch(displayName);
    setFormData(prev => ({...prev, owner: assign.plin, expiryDate: assign.expiryDate}));
    setShowOwnerDropdown(false);
  };

  const handleOwnerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOwnerSearch(e.target.value);
    if (!showOwnerDropdown) setShowOwnerDropdown(true);
    if (originalAssignments.length > 1) {
      setFormData(prev => ({...prev, expiryDate: 'Multiple', owner: ''}));
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
              id="viewOwner"
              className={`${inputClasses} pr-8`}
              placeholder={originalAssignments.length > 1 ? "Select player to view..." : (originalAssignments.length === 0 ? "None" : originalAssignments[0].plin)}
              value={ownerSearch}
              onChange={handleOwnerSearchChange}
              readOnly={isReadOnly}
              onFocus={() => {
                if (originalAssignments.length > 0) setShowOwnerDropdown(true);
              }}
              data-testid="view-owner-input"
            />
            <div
              className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (ownerSearch) {
                  setOwnerSearch('');
                  setFormData(prev => ({
                    ...prev,
                    owner: '',
                    expiryDate: originalAssignments.length > 1 ? 'Multiple' : ''
                  }));
                  setShowOwnerDropdown(true);
                  ownerInputRef.current?.focus();
                } else {
                  setShowOwnerDropdown(!showOwnerDropdown);
                }
              }}
              data-testid="view-owner-dropdown-toggle"
            >
              {ownerSearch ? <X size={16}/> : <ChevronDown size={16}/>}
            </div>
          </div>

          {showOwnerDropdown && originalAssignments.length > 0 && (
            <div
              className="absolute top-full left-0 mt-1 z-20 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto"
              data-testid="owner-dropdown-menu">
              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((a, idx) => (
                  <div
                    key={`${a.plin}-${idx}`}
                    className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-2 group"
                    onClick={() => handleOwnerSelect(a)}
                    data-testid={`owner-select-item-${a.plin}`}
                  >
                    <div className="flex-1">
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{a.plin}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Exp: {a.expiryDate}</span>
                      {getCharacterName(a.plin) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate"
                             data-testid={`owner-name-item-${a.plin}`}>{getCharacterName(a.plin)}</div>
                      )}
                    </div>
                    {formData.owner === a.plin && (
                      <Check size={14} className="text-green-600 dark:text-green-400"/>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 italic text-center" data-testid="no-matches-found">No
                  matches found</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <Input
            label=""
            name="owner"
            id="owner"
            value={formData.owner}
            onChange={handleChange}
            readOnly={isReadOnly}
            required={false}
            placeholder="1234#12"
            className="mb-0"
            data-testid="owner-plin-input"
          />
          {characterName && (
            <div className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400"
                 data-testid="owner-name-display">{characterName}</div>
          )}
        </>
      )}
    </div>
  );

  const expiryInput = (
    <Input
      label="Expiry Date"
      name="expiryDate"
      id="expiryDate"
      value={formData.expiryDate}
      onChange={handleChange}
      readOnly={isReadOnly}
      required={false}
      placeholder="dd/mm/yyyy (Empty = 'until death')"
      className={formData.expiryDate === 'Multiple' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}
      data-testid="expiry-date-input"
    />
  );

  const headerLeftContent = (<Activity size={20} className="text-entity-item"/>);
  const headerRightContent = (draftId && draftTimestamp ? (
    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0" data-testid="draft-timestamp-display">
        <span className="font-bold">(Draft)</span>
      {new Date(draftTimestamp).toLocaleDateString()}
      </span>
  ) : null)

  return (
    <Page maxWidth="xl" className="landscape:w-9/12 relative" data-testid="create-condition-page">
      {modalConfig && (
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
          message={modalConfig.message}
          primaryAction={modalConfig.primaryAction}
          secondaryAction={modalConfig.secondaryAction}
          icon={modalConfig.icon}
          iconColorClass={modalConfig.iconColorClass}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button" onClick={handleBack} title="Back" data-testid="back-button">
              <ArrowLeft size={16}/>
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))} title="Dashboard"
                  data-testid="home-button">
            <Home size={16}/>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => confirmAction(handleReset)} title="Create New"
                  data-testid="new-create-button">
            <FilePlus size={16}/>
          </Button>
          {isViewMode && (
            <>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/extend-condition')}
                      title="Extend Condition" data-testid="extend-condition-button">
                <CalendarClock size={16}/>
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/assign-condition')}
                      title="Assign Condition" data-testid="assign-condition-button">
                <UserPlusMinus size={16}/>
              </Button>
            </>
          )}
        </div>
      </div>

      <Panel
        title={isViewMode ? 'Condition Properties' : 'Create Condition'}
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
        data-testid="create-condition-panel"
      >
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

          <form onSubmit={handleSubmit} className="space-y-1" data-testid="create-condition-form">
            {isViewMode ? (
              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <Input label="COIN" id="viewCoin" value={viewCoin} readOnly
                         className="font-mono bg-entity-condition/10 text-entity-condition dark:bg-yellow-900/30 dark:text-yellow-400 h-[38px]"
                         data-testid="view-coin-display"/>
                </div>
                <div className="flex-1 min-w-0">
                  {ownerInput}
                </div>
              </div>
            ) : null}

            <Input label="Name" name="name" id="name" value={formData.name} onChange={handleChange}
                   readOnly={isReadOnly} required={!isViewMode} placeholder="Condition Name" data-testid="name-input"/>
            <Input label="Description" name="description" id="description" value={formData.description}
                   onChange={handleChange} readOnly={isReadOnly} required={!isViewMode} placeholder="Description"
                   multiline rows={4} expandable={false} data-testid="description-input"/>

            {!isViewMode ? (
              <div className="flex gap-2">
                <div className="flex-1">{ownerInput}</div>
                <div className="flex-1">{expiryInput}</div>
              </div>
            ) : expiryInput}

            <Input label="Remarks" name="remarks" id="remarks" value={formData.remarks} onChange={handleChange}
                   readOnly={isReadOnly} placeholder="Remarks" multiline rows={4} data-testid="remarks-input"/>
            <Input label="CS Remarks" name="csRemarks" id="csRemarks" value={formData.csRemarks} onChange={handleChange}
                   readOnly={isReadOnly} placeholder="CS Remarks" multiline rows={4} data-testid="cs-remarks-input"/>

            {!isReadOnly && !isViewMode && (
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={!isDirty}
                        data-testid="save-draft-button">
                  <FileText size={16} className="mr-2"/>
                  Save Draft
                </Button>
                <Button type="submit" isLoading={isLoading} data-testid="create-condition-submit">
                  <Save size={16} className="mr-2"/> Create Condition
                </Button>
              </div>
            )}
            <span data-testid="is-dirty-status" className="sr-only">{isDirty ? "Dirty" : "Clean"}</span>
          </form>
        </div>
      </Panel>
    </Page>
  );
};

export default CreateCondition;
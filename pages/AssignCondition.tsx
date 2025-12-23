import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {searchConditionByCoin, updateCondition, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
import {Condition, Assignment} from '../types';

// IMPORT COMPONENTS
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  Search,
  Home,
  ArrowLeft,
  UserMinus,
  UserPlus,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import UserPlusMinus from '../components/icons/UserPlusMinus';

// IMPORT UTILS
import {getDefaultExpiry, formatDate} from '../utils/dateUtils';
import {formatPLIN} from '../utils/playerUtils';

/** Configuration type for the confirmation modal. */
type ModalConfig = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  primaryAction: React.ComponentProps<typeof ConfirmModal>['primaryAction'];
  secondaryAction?: React.ComponentProps<typeof ConfirmModal>['secondaryAction'];
  icon?: React.ComponentProps<typeof ConfirmModal>['icon'];
  iconColorClass?: string;
}

/**
 * Component for searching, viewing, and assigning/unassigning players to a Condition (COIN).
 * @returns The AssignCondition component.
 */
const AssignCondition: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [coinSearch, setCoinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  const [condition, setCondition] = useState<Condition | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);

  const [newOwner, setNewOwner] = useState('');
  const [newExpiry, setNewExpiry] = useState(getDefaultExpiry());

  const [selectedRemovePlins, setSelectedRemovePlins] = useState<Set<string>>(new Set());
  const [showRemoveDropdown, setShowRemoveDropdown] = useState(false);
  const [removeFilter, setRemoveFilter] = useState('');
  const removeDropdownRef = useRef<HTMLDivElement>(null);
  const removeInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const newOwnerName = getCharacterName(newOwner);
  const [baselineJson, setBaselineJson] = useState('');

  const closeModal = () => setModalConfig(null);

  /**
   * Generates a JSON string representing the current state of the assignment form
   * (new owner, expiry, and removals) for comparison against the baseline.
   */
  const getCurrentStateString = () => JSON.stringify({
    newOwner,
    newExpiry,
    selectedRemovePlins: Array.from(selectedRemovePlins).sort()
  });

  const isUnsaved = condition !== null && getCurrentStateString() !== baselineJson;

  const inputClasses = "w-full px-3 py-2 border rounded shadow-inner font-serif text-sm transition-all duration-200 border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600";

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsaved) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUnsaved]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (removeDropdownRef.current && !removeDropdownRef.current.contains(event.target as Node)) {
        setShowRemoveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Configures and shows the confirmation modal if unsaved changes exist,
   * otherwise executes the action directly.
   * @param action The function to execute if changes are discarded or no changes exist.
   */
  const confirmAction = (action: () => void) => {
    if (isUnsaved) {
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

  useEffect(() => {
    if (location.state) {
      if (location.state.initialData) {
        const {
          condition: savedCondition,
          newOwner: savedNewOwner,
          newExpiry: savedNewExpiry,
          selectedRemovePlins: savedRemovePlins
        } = location.state.initialData;
        setCondition(savedCondition);
        setCoinSearch(savedCondition.coin);
        setCurrentAssignments(savedCondition.assignments || []);
        setNewOwner(savedNewOwner);
        setNewExpiry(savedNewExpiry);

        const safeRemovePlins = savedRemovePlins || [];
        setSelectedRemovePlins(new Set(safeRemovePlins));

        setBaselineJson(JSON.stringify({
          newOwner: savedNewOwner,
          newExpiry: savedNewExpiry,
          selectedRemovePlins: safeRemovePlins.sort()
        }));
        if (location.state.draftId) setDraftId(location.state.draftId);
        if (location.state.draftTimestamp) setDraftTimestamp(location.state.draftTimestamp);
      } else if (location.state.item) {
        const passedItem = location.state.item as Condition;
        if (passedItem && passedItem.coin) {
          setCondition(passedItem);
          setCoinSearch(passedItem.coin);
          setCurrentAssignments(passedItem.assignments || []);
          const defExp = getDefaultExpiry();
          setNewExpiry(defExp);
          setBaselineJson(JSON.stringify({
            newOwner: '',
            newExpiry: defExp,
            selectedRemovePlins: []
          }));
        }
      } else {
        setNewExpiry(getDefaultExpiry());
      }
    } else {
      setNewExpiry(getDefaultExpiry());
    }
  }, [location.state]);

  const handleResetSearch = () => {
    setCondition(null);
    setCoinSearch('');
    setNewOwner('');
    setNewExpiry(getDefaultExpiry());
    setSelectedRemovePlins(new Set());
    setRemoveFilter('');
    setCurrentAssignments([]);
    setBaselineJson('');
    setSearchError('');
    setStatusMessage(null);
    setDraftId(null);
    setDraftTimestamp(null);
    navigate(location.pathname, {replace: true, state: {}});
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setStatusMessage(null);
    setCondition(null);
    setNewOwner('');
    setNewExpiry(getDefaultExpiry());
    setSelectedRemovePlins(new Set());
    setRemoveFilter('');
    setBaselineJson('');
    setDraftId(null);
    setDraftTimestamp(null);

    setIsSearching(true);
    try {
      const result = await searchConditionByCoin(coinSearch);
      if (result.success && result.data) {
        const cond = result.data;
        setCondition(cond);
        setCurrentAssignments(cond.assignments || []);
        setBaselineJson(JSON.stringify({
          newOwner: '',
          newExpiry: getDefaultExpiry(),
          selectedRemovePlins: []
        }));
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
    if (!condition) return;
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'condition',
      action: 'assign',
      data: {condition, newOwner, newExpiry, selectedRemovePlins: Array.from(selectedRemovePlins)},
      timestamp: now,
      title: condition.name || 'Unknown Condition',
      subtitle: `Assign COIN: ${condition.coin}`
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setBaselineJson(getCurrentStateString());
    setStatusMessage({type: 'success', text: 'Draft saved successfully.'});
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  const handleNewOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewOwner(formatPLIN(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (newExpiry && val.length < newExpiry.length) {
      setNewExpiry(val);
    } else {
      setNewExpiry(formatDate(val));
    }
  };

  const toggleRemovePlinSelect = (plin: string) => {
    const newSet = new Set(selectedRemovePlins);
    if (newSet.has(plin)) {
      newSet.delete(plin);
    } else {
      newSet.add(plin);
    }
    setSelectedRemovePlins(newSet);
    setStatusMessage(null);
  };

  const filteredRemoveAssignments = currentAssignments.filter(a => {
    const search = removeFilter.toLowerCase();
    const name = getCharacterName(a.plin) || '';
    return a.plin.toLowerCase().includes(search) || name.toLowerCase().includes(search);
  });

  const toggleSelectFilteredRemove = () => {
    const newSet = new Set(selectedRemovePlins);
    const allFilteredSelected = filteredRemoveAssignments.length > 0 && filteredRemoveAssignments.every(a => newSet.has(a.plin));

    if (allFilteredSelected) {
      filteredRemoveAssignments.forEach(a => newSet.delete(a.plin));
    } else {
      filteredRemoveAssignments.forEach(a => newSet.add(a.plin));
    }
    setSelectedRemovePlins(newSet);
  };

  const isAllFilteredRemoveSelected = filteredRemoveAssignments.length > 0 && filteredRemoveAssignments.every(a => selectedRemovePlins.has(a.plin));

  /** Executes the API call to add a player and resets the form state on success. */
  const executeAddPlayer = async () => {
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const updatedAssignments = [...currentAssignments, {plin: newOwner, expiryDate: newExpiry}];
      const result = await updateCondition(condition!.coin, {assignments: updatedAssignments});

      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        setStatusMessage({type: 'success', text: `Assigned ${newOwner}`});
        setCondition({...condition!, assignments: updatedAssignments});
        setCurrentAssignments(updatedAssignments);

        // Reset all pending changes and set new baseline
        setNewOwner('');
        setNewExpiry(getDefaultExpiry());
        setSelectedRemovePlins(new Set()); // FIX: Must clear pending removals too
        setRemoveFilter('');
        setBaselineJson(JSON.stringify({
          newOwner: '',
          newExpiry: getDefaultExpiry(),
          selectedRemovePlins: []
        }));
      } else {
        setStatusMessage({type: 'error', text: 'Failed to assign.'});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'Error'});
    } finally {
      setIsUpdating(false);
    }
  };

  /** Handles validation and submission for adding a player. */
  const handleAddPlayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!condition) return;

    if (newOwner.trim().length === 0) {
      setStatusMessage({type: 'error', text: 'Please enter a Player PLIN.'});
      return;
    }

    if (!/^\d{1,4}#\d{1,2}$/.test(newOwner)) {
      setStatusMessage({type: 'error', text: 'PLIN format: 1234#12'});
      return;
    }

    if (currentAssignments.some(a => a.plin === newOwner)) {
      setStatusMessage({type: 'error', text: 'Player is already assigned.'});
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newExpiry) && newExpiry.toLowerCase() !== 'until death') {
      setStatusMessage({type: 'error', text: 'Invalid Expiry Date format.'});
      return;
    }

    if (draftId) {
      setModalConfig({
        isOpen: true,
        title: "Process Draft?",
        message: "The object may have been changed since this draft was stored. Proceed?",
        primaryAction: {
          label: "Process",
          handler: () => {
            executeAddPlayer();
            closeModal();
          },
          variant: "primary",
        },
        icon: FileText,
        iconColorClass: "text-blue-600 dark:text-blue-400",
      });
      return;
    }

    await executeAddPlayer();
  };

  /** Executes the API call to remove selected players and resets the form state on success. */
  const executeRemovePlayers = async () => {
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const updatedAssignments = currentAssignments.filter(a => !selectedRemovePlins.has(a.plin));
      const result = await updateCondition(condition!.coin, {assignments: updatedAssignments});

      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        const removedPlinsStr = Array.from(selectedRemovePlins).join(', ');
        setStatusMessage({type: 'success', text: `Unassigned: ${removedPlinsStr}`});
        setCondition({...condition!, assignments: updatedAssignments});
        setCurrentAssignments(updatedAssignments);

        // Reset all pending changes and set new baseline
        setNewOwner(''); // FIX: Must clear pending addition too
        setNewExpiry(getDefaultExpiry()); // FIX: Must clear pending expiry too
        setSelectedRemovePlins(new Set());
        setRemoveFilter('');
        setBaselineJson(getCurrentStateString());
      } else {
        setStatusMessage({type: 'error', text: 'Failed to unassign.'});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'Error'});
    } finally {
      setIsUpdating(false);
    }
  };

  /** Handles submission for removing players. */
  const handleRemovePlayers = async () => {
    if (!condition) return;

    if (selectedRemovePlins.size === 0) {
      setStatusMessage({type: 'error', text: 'Select players to remove.'});
      return;
    }

    if (draftId) {
      setModalConfig({
        isOpen: true,
        title: "Process Draft?",
        message: "The object may have been changed since this draft was stored. Proceed?",
        primaryAction: {
          label: "Process",
          handler: () => {
            executeRemovePlayers();
            closeModal();
          },
          variant: "primary",
        },
        icon: FileText,
        iconColorClass: "text-blue-600 dark:text-blue-400",
      });
      return;
    }

    await executeRemovePlayers();
  };

  /** Gets a newline-separated string of current assignments for display. */
  const getAssignedPlayersDisplay = () => {
    if (currentAssignments.length === 0) return 'None';
    return currentAssignments.map(a => {
      const n = getCharacterName(a.plin);
      return n ? `${a.plin} (${n})` : a.plin;
    }).join('\n');
  }

  const headerLeftContent = (<UserPlusMinus size={20} className="text-entity-condition"/>);
  const headerRightContent = (
    draftId && draftTimestamp ? (
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0" data-testid="draft-timestamp-display">
             <span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleDateString()}
          </span>
    ) : null
  );

  return (
    <Page maxWidth="lg" data-testid="assign-condition-page">

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
          data-testid="generic-confirm-modal"
        />
      )}

      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <div className="flex gap-2">
          {(returnQuery || returnTo) && (
            <Button
              variant="secondary"
              type="button"
              onClick={() => confirmAction(() => navigate(returnTo || `/?${returnQuery}`))}
              title="Back"
              data-testid="back-button"
            >
              <ArrowLeft size={16}/>
            </Button>
          )}
          <Button
            variant="secondary"
            type="button"
            onClick={() => confirmAction(() => navigate('/'))}
            title="Dashboard"
            data-testid="home-button"
          >
            <Home size={16}/>
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => confirmAction(handleResetSearch)}
            title="New Search"
            data-testid="new-search-button"
          >
            <Search size={16}/>
          </Button>
        </div>
      </div>

      <Panel
        title='Assign Condition'
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
        data-testid="assignment-panel"
      >
        <div className="p-4">
          {!condition && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2 max-w-sm mx-auto"
                  data-testid="coin-search-form">
              <Input
                label="Enter COIN"
                id="coinSearchInput"
                value={coinSearch}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCoinSearch(val);
                }}
                placeholder="4-digit ID"
                error={searchError}
                className="mb-0"
                inputMode="numeric"
                data-testid="coin-search-input"
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSearching} disabled={!coinSearch} data-testid="find-coin-button">
                  <Search size={16} className="mr-2"/> Find
                </Button>
              </div>
              {searchError &&
                <span data-testid="search-error-message" className="text-red-500 text-sm">{searchError}</span>}
            </form>
          )}
          {condition && (
            <div className="space-y-2 animation-fade-in" data-testid="condition-details-view">
              {statusMessage && (
                <div
                  className={`p-2 rounded border text-sm font-serif ${
                    statusMessage.type === 'success'
                      ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                      : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                  }`}
                  data-testid={`status-message-${statusMessage.type}`}
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <Input label="COIN" id="conditionCoin" value={condition.coin} readOnly
                         className="font-mono bg-entity-condition/10 text-entity-condition h-[38px]"
                         data-testid="condition-coin-display"/>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    label="Assigned Players"
                    id="assignedPlayersList"
                    value={getAssignedPlayersDisplay()}
                    readOnly
                    placeholder="None"
                    multiline={true}
                    data-testid="current-assignments-display"
                  />
                </div>
              </div>

              <Input label="Name" id="conditionName" value={condition.name} readOnly
                     data-testid="condition-name-display"/>
              <Input label="Description" id="conditionDescription" value={condition.description} readOnly multiline
                     rows={3} data-testid="condition-description-display"/>

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-4">

                  {/* Add Player Panel */}
                  <div
                    className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30"
                    data-testid="add-player-panel">
                    <label
                      className="flex text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-2 items-center gap-2">
                      <UserPlus size={16} className="text-blue-600 dark:text-blue-400"/>
                      Add Player
                    </label>
                    <form onSubmit={handleAddPlayer} className="flex flex-col gap-2 mb-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="newOwnerPlin"
                          className={`${inputClasses} flex-1 min-w-0`}
                          value={newOwner}
                          onChange={handleNewOwnerChange}
                          placeholder="1234#12"
                          data-testid="add-player-plin-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="newExpiryDate"
                          className={`${inputClasses} flex-1 min-w-0`}
                          value={newExpiry}
                          onChange={handleExpiryChange}
                          placeholder="dd/mm/yyyy"
                          data-testid="add-player-expiry-input"
                        />
                        <Button type="submit" isLoading={isUpdating} className="w-24 h-[38px]"
                                disabled={!condition || isUpdating || newOwner.length === 0}
                                data-testid="assign-button">Assign</Button>
                      </div>
                    </form>
                    {newOwnerName && (
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 pl-1"
                           data-testid="new-owner-name-display">
                        {newOwnerName}
                      </div>
                    )}
                  </div>

                  {/* Remove Player Panel */}
                  <div
                    className="p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 relative"
                    ref={removeDropdownRef} data-testid="remove-player-panel">
                    <div className="flex justify-between items-center mb-1.5">
                      <label
                        className="flex text-sm font-bold text-gray-800 dark:text-gray-200 font-serif items-center gap-2">
                        <UserMinus size={16} className="text-red-600 dark:text-red-400"/>
                        Remove Players
                      </label>
                      {selectedRemovePlins.size > 0 && (
                        <span
                          className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full"
                          data-testid="selected-removals-count">
                                      {selectedRemovePlins.size} Selected
                                  </span>
                      )}
                    </div>

                    <div className="relative mb-2">
                      <div className="relative">
                        <input
                          ref={removeInputRef}
                          type="text"
                          id="removeFilterInput"
                          className={`${inputClasses} pr-8`}
                          placeholder="Filter players to remove..."
                          value={removeFilter}
                          onChange={(e) => {
                            setRemoveFilter(e.target.value);
                            setShowRemoveDropdown(true);
                          }}
                          onFocus={() => setShowRemoveDropdown(true)}
                          data-testid="remove-player-filter-input"
                        />
                        <div
                          className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (removeFilter) {
                              setRemoveFilter('');
                              setShowRemoveDropdown(true);
                              removeInputRef.current?.focus();
                            } else {
                              setShowRemoveDropdown(!showRemoveDropdown);
                            }
                          }}
                          data-testid="remove-filter-clear-toggle-button"
                        >
                          {removeFilter ? <X size={16}/> : <ChevronDown size={16}/>}
                        </div>
                      </div>

                      {showRemoveDropdown && currentAssignments.length > 0 && (
                        <div
                          className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto"
                          data-testid="remove-player-dropdown-menu">
                          <div
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 sticky top-0 z-20"
                            onClick={toggleSelectFilteredRemove}
                            data-testid="select-all-filtered-button"
                          >
                            {isAllFilteredRemoveSelected ? <CheckSquare size={14}/> : <Square size={14}/>}
                            {isAllFilteredRemoveSelected ? "Deselect All" : "Select All"}
                          </div>

                          {filteredRemoveAssignments.length > 0 ? (
                            filteredRemoveAssignments.map(a => {
                              const isSelected = selectedRemovePlins.has(a.plin);
                              return (
                                <div
                                  key={a.plin}
                                  className={`px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3 ${isSelected ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                                  onClick={() => toggleRemovePlinSelect(a.plin)}
                                  data-testid={`remove-item-${a.plin}`}
                                >
                                  <div className={isSelected ? "text-red-600 dark:text-red-400" : "text-gray-400"}>
                                    {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                                  </div>
                                  <div className="flex-1">
                                    <span
                                      className="font-mono font-bold text-gray-700 dark:text-gray-300">{a.plin}</span>
                                    <span className="ml-2 text-xs text-gray-500">Exp: {a.expiryDate}</span>
                                    {getCharacterName(a.plin) && <div className="text-xs text-gray-500 truncate"
                                                                      data-testid={`remove-item-name-${a.plin}`}>{getCharacterName(a.plin)}</div>}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500 italic text-center"
                                 data-testid="no-matches-found">No matches found</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleRemovePlayers}
                        isLoading={isUpdating}
                        className="h-[38px]"
                        disabled={selectedRemovePlins.size === 0}
                        data-testid="remove-selected-button"
                      >
                        Remove Selected {selectedRemovePlins.size > 0 && `(${selectedRemovePlins.size})`}
                      </Button>
                    </div>
                  </div>

                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={!isUnsaved}
                    title="Save the current assignment and removal changes as a local draft"
                    data-testid="save-draft-button"
                  >
                    <FileText size={16} className="mr-2"/> Save Draft
                  </Button>
                  <span data-testid="draft-info" className="sr-only">{isUnsaved ? "Unsaved" : "Saved"}</span>
                </div>

              </div>
            </div>
          )}
        </div>
      </Panel>
    </Page>
  );
};

export default AssignCondition;
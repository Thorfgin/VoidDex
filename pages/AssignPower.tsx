import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchPowerByPoin, updatePower, getCharacterName } from '../services/api';
import { saveStoredChange, deleteStoredChange } from '../services/offlineStorage';
import { Power, Assignment } from '../types';

// IMPORT COMPONENTS
import UserPlusMinus from '../components/icons/UserPlusMinus';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Search, Home, ArrowLeft, UserMinus, UserPlus, ChevronDown, CheckSquare, Square, X, FileText, AlertTriangle } from 'lucide-react';

// IMPORT UTILS
import { getDefaultExpiry, formatDate } from '../utils/dateUtils';
import { formatPLIN } from '../utils/playerUtils';

type ModalConfig = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  primaryAction: React.ComponentProps<typeof ConfirmModal>['primaryAction'];
  secondaryAction?: React.ComponentProps<typeof ConfirmModal>['secondaryAction'];
  icon?: React.ComponentProps<typeof ConfirmModal>['icon'];
  iconColorClass?: string;
}

const AssignPower: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [poinSearch, setPoinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  const [power, setPower] = useState<Power | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);

  // Inputs for Adding
  const [newOwner, setNewOwner] = useState('');
  const [newExpiry, setNewExpiry] = useState(getDefaultExpiry());

  // Inputs for Removing (Multi-select)
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

  // FIXED: Removed the statusMessage check. isUnsaved should only check for state difference.
  const isUnsaved = power !== null && getCurrentStateString() !== baselineJson;

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

  // Click outside to close the dropdown
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

  // --- INITIALIZATION ---
  useEffect(() => {
    if (location.state) {
      if (location.state.initialData) {
        // Load Draft
        const { power: savedPower, newOwner: savedNewOwner, newExpiry: savedNewExpiry, selectedRemovePlins: savedRemovePlins } = location.state.initialData;
        setPower(savedPower);
        setPoinSearch(savedPower.poin);
        setCurrentAssignments(savedPower.assignments || []);
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
        // Load from View
        const passedItem = location.state.item as Power;
        if (passedItem && passedItem.poin) {
          setPower(passedItem);
          setPoinSearch(passedItem.poin);
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
    setPower(null);
    setPoinSearch('');
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
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setStatusMessage(null);
    setPower(null);
    setNewOwner('');
    setNewExpiry(getDefaultExpiry());
    setSelectedRemovePlins(new Set());
    setRemoveFilter('');
    setBaselineJson('');
    setDraftId(null);
    setDraftTimestamp(null);

    setIsSearching(true);
    try {
      const result = await searchPowerByPoin(poinSearch);
      if (result.success && result.data) {
        const pow = result.data;
        setPower(pow);
        setCurrentAssignments(pow.assignments || []);
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
    if (!power) return;
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'power',
      action: 'assign',
      data: { power, newOwner, newExpiry, selectedRemovePlins: Array.from(selectedRemovePlins) },
      timestamp: now,
      title: power.name || 'Unknown Power',
      subtitle: `Assign POIN: ${power.poin}`
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setBaselineJson(getCurrentStateString());
    setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
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

  const executeAddPlayer = async () => {
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const updatedAssignments = [...currentAssignments, { plin: newOwner, expiryDate: newExpiry }];
      const result = await updatePower(power!.poin, { assignments: updatedAssignments });

      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        setStatusMessage({ type: 'success', text: `Assigned ${newOwner}` });
        setPower({ ...power!, assignments: updatedAssignments });
        setCurrentAssignments(updatedAssignments);
        setNewOwner('');
        setNewExpiry(getDefaultExpiry());
        setBaselineJson(JSON.stringify({
          newOwner: '',
          newExpiry: getDefaultExpiry(),
          selectedRemovePlins: []
        }));
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to assign.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPlayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!power) return;

    if (newOwner.trim().length === 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a Player PLIN.' });
      return;
    }

    if (!/^\d{1,4}#\d{1,2}$/.test(newOwner) && newOwner !== 'SYSTEM') {
      setStatusMessage({ type: 'error', text: 'PLIN format: 1234#12' });
      return;
    }

    if (currentAssignments.some(a => a.plin === newOwner)) {
      setStatusMessage({ type: 'error', text: 'Player is already assigned.' });
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newExpiry) && newExpiry.toLowerCase() !== 'until death') {
      setStatusMessage({ type: 'error', text: 'Invalid Expiry Date format.' });
      return;
    }

    if (draftId) {
      setModalConfig({
        isOpen: true,
        title: "Process Draft?",
        message: "The object may have been changed since this draft was stored. Proceed?",
        primaryAction: {
          label: "Process",
          handler: () => { executeAddPlayer(); closeModal(); },
          variant: "primary",
        },
        icon: FileText,
        iconColorClass: "text-blue-600 dark:text-blue-400",
      });
      return;
    }

    await executeAddPlayer();
  };

  const executeRemovePlayers = async () => {
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      const updatedAssignments = currentAssignments.filter(a => !selectedRemovePlins.has(a.plin));
      const result = await updatePower(power!.poin, { assignments: updatedAssignments });

      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        const removedPlinsStr = Array.from(selectedRemovePlins).join(', ');
        setStatusMessage({ type: 'success', text: `Unassigned: ${removedPlinsStr}` });
        setPower({ ...power!, assignments: updatedAssignments });
        setCurrentAssignments(updatedAssignments);
        setSelectedRemovePlins(new Set());
        setRemoveFilter('');
        setBaselineJson(JSON.stringify({
          newOwner: '',
          newExpiry: getDefaultExpiry(),
          selectedRemovePlins: []
        }));
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to unassign.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemovePlayers = async () => {
    if (!power) return;

    if (selectedRemovePlins.size === 0) {
      setStatusMessage({ type: 'error', text: 'Select players to remove.' });
      return;
    }

    if (draftId) {
      setModalConfig({
        isOpen: true,
        title: "Process Draft?",
        message: "The object may have been changed since this draft was stored. Proceed?",
        primaryAction: {
          label: "Process",
          handler: () => { executeRemovePlayers(); closeModal(); },
          variant: "primary",
        },
        icon: FileText,
        iconColorClass: "text-blue-600 dark:text-blue-400",
      });
      return;
    }

    await executeRemovePlayers();
  };

  const getAssignedPlayersDisplay = () => {
    if (currentAssignments.length === 0) return 'None';
    return currentAssignments.map(a => {
      const n = getCharacterName(a.plin);
      return n ? `${a.plin} (${n})` : a.plin;
    }).join('\n');
  }

  const headerLeftContent = (<UserPlusMinus size={20} className="text-entity-power" />);
  const headerRightContent = (
    draftId && draftTimestamp ? (
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
             <span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleDateString()}
          </span>
    ) : null
  );

  return (
    <Page maxWidth="lg">

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

      {/* External Button Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-start gap-2">
        <div className="flex gap-2">
          {/* Back Button */}
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate(returnTo || `/?${returnQuery}`))} title="Back">
              <ArrowLeft size={16} />
            </Button>
          )}
          {/* Home Button */}
          <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))} title="Dashboard">
            <Home size={16} />
          </Button>
          {/* New Search Button */}
          <Button variant="secondary" type="button" onClick={() => confirmAction(handleResetSearch)} title="New Search">
            <Search size={16} />
          </Button>
        </div>
      </div>
      {/* End External Button Bar */}

      {/* Panel Wrapper */}
      <Panel
        title='Assign Power'
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
      >
        <div className="p-4">
          {!power && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2 max-w-sm mx-auto">
              <Input
                label="Enter POIN"
                value={poinSearch}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPoinSearch(val);
                }}
                placeholder="4-digit ID"
                error={searchError}
                className="mb-0"
                inputMode="numeric"
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSearching} disabled={!poinSearch}>
                  <Search size={16} className="mr-2" /> Find
                </Button>
              </div>
            </form>
          )}
          {power && (
            <div className="space-y-2 animation-fade-in">
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
                  <Input label="POIN" value={power.poin} readOnly className="font-mono bg-entity-power/10 text-entity-power h-[38px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    label="Assigned Players"
                    value={getAssignedPlayersDisplay()}
                    readOnly
                    placeholder="None"
                    multiline={true}
                  />
                </div>
              </div>

              <Input label="Name" value={power.name} readOnly />
              <Input label="Description" value={power.description} readOnly multiline rows={3} />

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Add Player Panel */}
                  <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-2 items-center gap-2">
                      <UserPlus size={16} className="text-blue-600 dark:text-blue-400"/>
                      Add Player
                    </label>
                    <form onSubmit={handleAddPlayer} className="flex flex-col gap-2 mb-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className={`${inputClasses} flex-1 min-w-0`}
                          value={newOwner}
                          onChange={handleNewOwnerChange}
                          placeholder="1234#12"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className={`${inputClasses} flex-1 min-w-0`}
                          value={newExpiry}
                          onChange={handleExpiryChange}
                          placeholder="dd/mm/yyyy"
                        />
                        <Button type="submit" isLoading={isUpdating} className="w-24 h-[38px]" disabled={!power || isUpdating || newOwner.length === 0}>Assign</Button>
                      </div>
                    </form>
                    {newOwnerName && (
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 pl-1">
                        {newOwnerName}
                      </div>
                    )}
                  </div>

                  {/* Remove Player Panel */}
                  <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 relative" ref={removeDropdownRef}>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif items-center gap-2">
                        <UserMinus size={16} className="text-red-600 dark:text-red-400"/>
                        Remove Players
                      </label>
                      {selectedRemovePlins.size > 0 && (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                                      {selectedRemovePlins.size} Selected
                                  </span>
                      )}
                    </div>

                    {/* Multi-select Dropdown */}
                    <div className="relative mb-2">
                      <div className="relative">
                        <input
                          ref={removeInputRef}
                          type="text"
                          className={`${inputClasses} pr-8`}
                          placeholder="Filter players to remove..."
                          value={removeFilter}
                          onChange={(e) => {
                            setRemoveFilter(e.target.value);
                            setShowRemoveDropdown(true);
                          }}
                          onFocus={() => setShowRemoveDropdown(true)}
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
                        >
                          {removeFilter ? <X size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Dropdown Menu - Opens Upwards */}
                      {showRemoveDropdown && currentAssignments.length > 0 && (
                        <div className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                          <div
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 sticky top-0 z-20"
                            onClick={toggleSelectFilteredRemove}
                          >
                            {isAllFilteredRemoveSelected ? <CheckSquare size={14} /> : <Square size={14} />}
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
                                >
                                  <div className={isSelected ? "text-red-600 dark:text-red-400" : "text-gray-400"}>
                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{a.plin}</span>
                                    <span className="ml-2 text-xs text-gray-500">Exp: {a.expiryDate}</span>
                                    {getCharacterName(a.plin) && <div className="text-xs text-gray-500 truncate">{getCharacterName(a.plin)}</div>}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500 italic text-center">No matches found</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Only the Remove button remains in this panel */}
                    <div className="flex justify-end">
                      <Button type="button" variant="danger" onClick={handleRemovePlayers} isLoading={isUpdating} className="h-[38px]" disabled={selectedRemovePlins.size === 0}>
                        Remove Selected {selectedRemovePlins.size > 0 && `(${selectedRemovePlins.size})`}
                      </Button>
                    </div>
                  </div>

                </div>

                {/* --- NEW DEDICATED ACTION BAR FOR DRAFT --- */}
                {/* Placed after the grid container */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    //disabled={!isUnsaved} // CORRECTED: Only checks for state difference.
                    title="Save the current assignment and removal changes as a local draft"
                  >
                    Save Draft
                  </Button>
                </div>
                {/* ------------------------------------------- */}
              </div>
            </div>
          )}
        </div>
      </Panel>
    </Page>
  );
};

export default AssignPower;
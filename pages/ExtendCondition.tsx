/**
 * ExtendCondition Component
 *
 * This page facilitates searching for a specific Condition (by COIN) and updating the expiry date
 * for selected assigned players (PLINs). It uses declarative state for modal management,
 * handles unsaved changes with navigation guards, and manages local drafts via offline storage.
 */
import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {searchConditionByCoin, updateCondition, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
import {Condition} from '../types';

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
  Save,
  ChevronDown,
  CheckSquare,
  Square,
  X,
  FileText,
  CalendarPlus,
  CalendarClock,
  AlertTriangle,
  LucideIcon
} from 'lucide-react';

// IMPORT UTILS
import {formatDate, getDefaultExpiry} from "../utils/dateUtils";


/**
 * Define ModalConfig type for declarative state management of the ConfirmModal.
 * This type ensures all necessary properties for the modal display and primary action are present.
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

const ExtendCondition: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [coinSearch, setCoinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  /**
   * State to hold the fetched Condition object.
   */
  const [condition, setCondition] = useState<Condition | null>(null);

  /**
   * State to track the set of PLINs selected for expiry extension.
   */
  const [selectedPlins, setSelectedPlins] = useState<Set<string>>(new Set());

  const [showPlinDropdown, setShowPlinDropdown] = useState(false);
  const [plinFilter, setPlinFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plinInputRef = useRef<HTMLInputElement>(null);

  const [expiryDate, setExpiryDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  /**
   * State to hold the configuration for the ConfirmModal, managing its content and actions.
   */
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const closeModal = () => setModalConfig(null);

  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  /**
   * Stores the JSON string representation of the last saved/drafted state to enable change detection.
   */
  const [baselineJson, setBaselineJson] = useState('');

  /**
   * Generates a string representation of the current component state (selected PLINs and expiry date)
   * used to check for unsaved changes against the baseline.
   */
  const getCurrentStateString = () => JSON.stringify({
    selectedPlins: Array.from(selectedPlins).sort(),
    expiryDate
  });

  const isUnsaved = condition !== null && getCurrentStateString() !== baselineJson && !statusMessage?.text.includes("Updated");
  const isDirtyDB = (isUnsaved || draftId) && selectedPlins.size > 0;

  const inputClasses = "w-full px-3 py-2 border rounded shadow-inner font-serif text-sm transition-all duration-200 border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600";

  /**
   * Effect hook to warn the user about unsaved changes before page unload/closing the tab.
   * This is critical for data integrity and user experience.
   */
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlinDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Implements a navigation guard, prompting the user with a modal if `isUnsaved` is true
   * before executing the requested navigation action.
   */
  const confirmNavigation = (action: () => void) => {
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
        // Initialization from draft data (most complex)
        const {
          condition: savedCondition,
          expiryDate: savedExpiry,
          selectedPlins: savedPlins
        } = location.state.initialData;
        setCondition(savedCondition);
        setCoinSearch(savedCondition.coin);
        setExpiryDate(savedExpiry);

        const safePlins = savedPlins || [];
        setSelectedPlins(new Set(safePlins));
        setBaselineJson(JSON.stringify({
          selectedPlins: safePlins.sort(),
          expiryDate: savedExpiry
        }));
        if (location.state.draftId) setDraftId(location.state.draftId);
        if (location.state.draftTimestamp) setDraftTimestamp(location.state.draftTimestamp);
      } else if (location.state.item) {
        // Initialization from a simple passed item
        const passedItem = location.state.item as Condition;
        if (passedItem && passedItem.coin) {
          setCondition(passedItem);
          setCoinSearch(passedItem.coin);
          setPlinFilter('');
          setBaselineJson(JSON.stringify({selectedPlins: [], expiryDate: ''}));
        }
      }
    }
  }, [location.state]);

  const handleResetSearch = () => {
    setCondition(null);
    setCoinSearch('');
    setExpiryDate('');
    setSelectedPlins(new Set());
    setPlinFilter('');
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
    setSelectedPlins(new Set());
    setPlinFilter('');
    setExpiryDate('');
    setBaselineJson('');
    setDraftId(null);
    setDraftTimestamp(null);

    const coinRegex = /^\d{4}$/;
    if (!coinRegex.test(coinSearch)) {
      setSearchError('Invalid COIN.');
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchConditionByCoin(coinSearch);
      if (result.success && result.data) {
        setCondition(result.data);
        setBaselineJson(JSON.stringify({selectedPlins: [], expiryDate: ''}));
      } else {
        setSearchError('Not found');
      }
    } catch (err) {
      setSearchError('Error');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Saves the current player selection and new expiry date as a local draft in offline storage.
   * It generates a new ID if one does not exist, updates state, and sets the baseline.
   */
  const handleSaveDraft = () => {
    if (!condition) return;
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'condition',
      action: 'extend',
      data: {condition, expiryDate, selectedPlins: Array.from(selectedPlins)},
      timestamp: now,
      title: condition.name || 'Unknown Condition',
      subtitle: `Extend COIN: ${condition.coin}`
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setBaselineJson(getCurrentStateString());
    setStatusMessage({type: 'success', text: 'Draft saved successfully.'});
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  /**
   * Toggles the selection status of a single PLIN. If it's the first PLIN selected
   * and the expiry date is empty, it attempts to pre-fill the expiry date.
   */
  const togglePlinSelect = (plin: string) => {
    const newSet = new Set(selectedPlins);
    if (newSet.has(plin)) {
      newSet.delete(plin);
    } else {
      newSet.add(plin);
      if (newSet.size === 1 && condition && expiryDate === '') {
        const assign = condition.assignments.find(a => a.plin === plin);
        if (assign && assign.expiryDate === 'until death') {
          setExpiryDate('');
        }
        // --- END FIX ---
        else if (assign && assign.expiryDate) {
          setExpiryDate(assign.expiryDate);
        } else {
          setExpiryDate(getDefaultExpiry());
        }
      }
    }
    setSelectedPlins(newSet);
    setStatusMessage(null);
  };

  const filteredAssignments = condition?.assignments.filter(a => {
    const search = plinFilter.toLowerCase();
    const name = getCharacterName(a.plin) || '';
    return a.plin.toLowerCase().includes(search) || name.toLowerCase().includes(search);
  }) || [];

  /**
   * Toggles selection for all currently visible (filtered) assignments.
   * If all are selected, it deselects all; otherwise, it selects all and attempts to set a default expiry date.
   */
  const toggleSelectFiltered = () => {
    const newSet = new Set(selectedPlins);
    const allFilteredSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => newSet.has(a.plin));

    if (allFilteredSelected) {
      filteredAssignments.forEach(a => newSet.delete(a.plin));
    } else {
      filteredAssignments.forEach(a => newSet.add(a.plin));
      if (filteredAssignments.length > 0 && expiryDate === '') {
        const firstAssignment = filteredAssignments.find(a => a.expiryDate && a.expiryDate !== 'until death');
        if (firstAssignment) {
          setExpiryDate(firstAssignment.expiryDate);
        } else {
          setExpiryDate(getDefaultExpiry());
        }
      }
    }
    setSelectedPlins(newSet);
  };

  const isAllFilteredSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => selectedPlins.has(a.plin));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (expiryDate && val.length < expiryDate.length) setExpiryDate(val);
    else setExpiryDate(formatDate(val));
  };

  /**
   * Adds one year to the current expiry date and rounds it up to the first of the next month if necessary.
   * Contains complex date logic and validation.
   */
  const handleAddYearAndRound = () => {
    if (!expiryDate || expiryDate === 'until death') return;
    setStatusMessage(null);

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) {
      setStatusMessage({type: 'error', text: 'Please enter a valid DD/MM/YYYY date before adding a year.'});
      return;
    }

    const parts = expiryDate.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    if (isNaN(date.getTime())) {
      setStatusMessage({type: 'error', text: 'Invalid calendar date detected.'});
      return;
    }

    date.setFullYear(date.getFullYear() + 1);

    // If the new date is not the 1st, set it to the 1st of the next month (rounding up)
    if (date.getDate() !== 1) {
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
    }

    if (date.getFullYear() > 2100) {
      setStatusMessage({type: 'error', text: 'Cannot set expiry past year 2100.'});
      return;
    }

    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = date.getFullYear();
    setExpiryDate(formatDate(`${newDay}${newMonth}${newYear}`));
  };

  /**
   * Validates the expiry date string for format (DD/MM/YYYY), date range (1980-2100),
   * and calendar validity (e.g., February 30th is invalid).
   */
  const validateExpiryDate = (val: string): string | null => {
    if (val === 'until death' || val === '') return null;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return 'Invalid date format (DD/MM/YYYY)';
    const [d, m, y] = val.split('/').map(Number);
    if (d < 1 || d > 31) return 'Day must be between 1 and 31';
    else if (m < 1 || m > 12) return 'Month must be between 1 and 12';
    else if (y < 1980 || y > 2100) return 'Year must be between 1980 and 2100';

    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return 'Invalid calendar date.';
    }

    return null;
  };

  /**
   * Determines the Tailwind CSS class to visually indicate the expiry status (e.g., red for expired, green for valid).
   */
  const getExpiryStatusClass = (dateStr: string) => {
    if (!dateStr || dateStr === 'until death') return 'text-green-600 dark:text-green-400';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 'text-gray-500';
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const expiry = new Date(y, m, d);
    expiry.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400';
  };

  /**
   * The core function to perform the condition update API call.
   * It prepares the new assignment list and handles draft cleanup on success.
   */
  const executeUpdate = async () => {
    if (!condition) return;

    const newEffectiveExpiry = expiryDate.trim() === '' ? 'until death' : expiryDate;
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const newAssignments = condition.assignments.map(a =>
        selectedPlins.has(a.plin) ? {...a, expiryDate: newEffectiveExpiry} : a
      );
      const result = await updateCondition(condition.coin, {assignments: newAssignments});
      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        const updatedCount = selectedPlins.size;
        const firstPlin = Array.from(selectedPlins)[0];
        const msg = updatedCount === 1
          ? `Updated expiry for ${firstPlin}.`
          : `Updated expiry for ${updatedCount} players (e.g., ${firstPlin}).`;

        setStatusMessage({type: 'success', text: msg});
        setCondition({...condition!, assignments: newAssignments});
        setBaselineJson(getCurrentStateString());
      } else {
        setStatusMessage({type: 'error', text: 'Update Failed: ' + (result as any).error});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'An unexpected error occurred during condition update.'});
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handles the update submission: performs final validation and displays confirmation modals
   * for draft processing or mass updates (3+ players) before calling `executeUpdate`.
   */
  const handleUpdate = () => {
    if (!condition || selectedPlins.size === 0) return;

    const dateError = validateExpiryDate(expiryDate);
    if (dateError) {
      setStatusMessage({type: 'error', text: dateError});
      return;
    }

    const action = () => executeUpdate();

    if (draftId) {
      setModalConfig({
        isOpen: true,
        title: "Process Draft?",
        message: "The object may have been changed since this draft was stored. Proceed?",
        primaryAction: {
          label: "Confirm",
          handler: () => {
            action().then();
            closeModal();
          },
          variant: "primary",
        },
        secondaryAction: {label: "Cancel", handler: closeModal},
        icon: AlertTriangle,
        iconColorClass: "text-blue-600 dark:text-blue-500",
      });
      return;
    }

    if (selectedPlins.size >= 3) {
      setModalConfig({
        isOpen: true,
        title: "Confirm Mass Update",
        message: `You are about to update the expiry date for ${selectedPlins.size} players. Do you want to proceed?`,
        primaryAction: {
          label: "Confirm",
          handler: () => {
            action().then();
            closeModal();
          },
          variant: "primary",
        },
        secondaryAction: {label: "Cancel", handler: closeModal},
        icon: AlertTriangle,
        iconColorClass: "text-amber-600 dark:text-amber-500",
      });
    } else {
      action().then();
    }
  };

  /**
   * Utility to format and truncate the list of assigned players for display in a read-only input field.
   */
  const getAssignedPlayersDisplay = () => {
    if (!condition || !condition.assignments || condition.assignments.length === 0) return 'None';
    const displayAssignments = condition.assignments.slice(0, 5).map(a => {
      const n = getCharacterName(a.plin);
      return n ? `${a.plin} (${n})` : a.plin;
    });

    if (condition.assignments.length > 5) {
      displayAssignments.push(`... and ${condition.assignments.length - 5} more.`);
    }
    return displayAssignments.join('\n');
  }

  // --- Panel Header Definitions ---
  const headerLeftContent = (<CalendarClock size={20} className="text-entity-condition"/>);
  const headerRightContent = (draftId && draftTimestamp ? (
    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
      <span className="font-bold">(Draft)</span>
      {new Date(draftTimestamp).toLocaleString()}
    </span>) : null);

  return (
    <Page>
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

      {/* --- Page Header / Nav Area --- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button"
                    onClick={() => confirmNavigation(() => navigate(returnTo || `/?${returnQuery}`))} title="Back">
              <ArrowLeft size={16}/>
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={() => confirmNavigation(() => navigate('/'))}
                  title="Dashboard">
            <Home size={16}/>
          </Button>
          <Button variant="secondary" type="button" onClick={() => confirmNavigation(handleResetSearch)}
                  title="New Search">
            <Search size={16}/>
          </Button>
        </div>
      </div>

      {/* --- Main Content Panel (Using explicit header props) --- */}
      <Panel
        title="Extend Condition"
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
      >
        <div className="p-4">
          {!condition && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2 max-w-sm mx-auto">
              <Input
                id="coin-search"
                data-testid="coin-search-input"
                label="Enter COIN"
                value={coinSearch}
                onChange={(e) => setCoinSearch(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit ID"
                error={searchError}
                className="mb-0"
                inputMode="numeric"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSearching}
                  disabled={!coinSearch}
                  data-testid="find-coin-button"
                >
                  <Search size={16} className="mr-2"/> Find
                </Button>
              </div>
            </form>
          )}
          {condition && (
            <div className="space-y-2 animation-fade-in">
              {statusMessage && (
                <div
                  className={`p-2 rounded border text-sm font-serif ${statusMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'}`}
                  data-testid="status-message"
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <Input
                    id="condition-coin"
                    data-testid="condition-coin-input"
                    label="COIN"
                    value={condition.coin}
                    readOnly
                    className="font-mono bg-entity-condition/10 text-entity-condition h-[38px]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    id="assigned-players"
                    data-testid="assigned-players-display"
                    label="Assigned Players"
                    value={getAssignedPlayersDisplay()}
                    readOnly
                    placeholder="None"
                    multiline={true}
                    rows={condition.assignments.length > 5 ? 6 : Math.max(2, condition.assignments.length)}
                  />
                </div>
              </div>

              <Input
                id="condition-name"
                data-testid="condition-name-input"
                label="Name"
                value={condition.name}
                readOnly
              />
              <Input
                id="condition-description"
                data-testid="condition-description-input"
                label="Description"
                value={condition.description}
                readOnly
                multiline
                rows={3}
              />

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div
                  className="p-4 rounded-lg bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30">
                  <h3
                    className="text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-4 flex items-center gap-2">
                    <CalendarClock size={16} className="text-pink-600 dark:text-pink-400"/>
                    Update Expiry for Players
                  </h3>

                  {/* Player Selection */}
                  <div className="relative mb-4" ref={dropdownRef}>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif">Select
                        Players</label>
                      {selectedPlins.size > 0 && (
                        <span
                          className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/50 px-2 py-0.5 rounded-full"
                          data-testid="selected-plins-count"
                        >
                          {selectedPlins.size} Selected
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      {/* Input Field for Filtering */}
                      <div className="relative">
                        <input
                          ref={plinInputRef}
                          type="text"
                          className={`${inputClasses} pr-8`}
                          placeholder="Filter by PLIN or Name..."
                          value={plinFilter}
                          onChange={(e) => {
                            setPlinFilter(e.target.value);
                            setShowPlinDropdown(true);
                          }}
                          onFocus={() => setShowPlinDropdown(true)}
                          data-testid="plin-filter-input"
                        />
                        <div
                          className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (plinFilter) {
                              setPlinFilter('');
                              setShowPlinDropdown(true);
                              plinInputRef.current?.focus();
                            } else {
                              setShowPlinDropdown(!showPlinDropdown);
                            }
                          }}
                          data-testid="plin-filter-clear-toggle"
                        >
                          {plinFilter ? <X size={16}/> : <ChevronDown size={16}/>}
                        </div>
                      </div>

                      {/* Dropdown Menu - Opens Upwards */}
                      {showPlinDropdown && condition.assignments.length > 0 && (
                        <div
                          className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto"
                          data-testid="plin-dropdown-menu"
                        >
                          <div
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 sticky top-0 z-20"
                            onClick={toggleSelectFiltered}
                            data-testid="select-all-filtered-button"
                          >
                            {isAllFilteredSelected ? <CheckSquare size={14}/> : <Square size={14}/>}
                            {isAllFilteredSelected ? "Deselect All" : "Select All"}
                          </div>

                          {filteredAssignments.length > 0 ? (
                            filteredAssignments.map(a => {
                              const isSelected = selectedPlins.has(a.plin);
                              return (
                                <div
                                  key={a.plin}
                                  className={`px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center gap-3 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                  onClick={() => togglePlinSelect(a.plin)}
                                  data-testid={`plin-option-${a.plin}`}
                                >
                                  <div className={isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}>
                                    {isSelected ? <CheckSquare size={16}/> : <Square size={16}/>}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <span
                                        className="font-mono font-bold text-gray-700 dark:text-gray-300">{a.plin}</span>
                                      <span
                                        className={`text-xs ${getExpiryStatusClass(a.expiryDate)}`}>Exp: {a.expiryDate}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{getCharacterName(a.plin)}</div>
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
                  </div>

                  <label
                    htmlFor="new-expiry-date"
                    className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-1.5"
                  >
                    New Expiry Date:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-expiry-date"
                      type="text"
                      className={`${inputClasses} flex-1 min-w-0`}
                      value={expiryDate}
                      onChange={handleDateChange}
                      placeholder="dd/mm/yyyy (Empty = 'until death')"
                      disabled={selectedPlins.size === 0}
                      data-testid="new-expiry-date-input"
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleAddYearAndRound}
                      title="+1 Year & Round Up"
                      disabled={selectedPlins.size === 0}
                      className="h-[38px] w-[38px]"
                      style={{padding: 0}}
                      data-testid="add-year-button"
                    >
                      <CalendarPlus size={24} strokeWidth={2}/>
                    </Button>
                  </div>

                  <div className="flex justify-end mt-4 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSaveDraft}
                      disabled={!isUnsaved}
                      data-testid="save-draft-button"
                    >
                      <FileText size={16} className="mr-2"/> Save Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUpdate}
                      isLoading={isUpdating}
                      disabled={!isDirtyDB}
                      data-testid="update-button"
                    >
                      <Save size={16} className="mr-2"/> Update
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </Page>
  );
};

export default ExtendCondition;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { searchPowerByPoin, updatePower, getCharacterName } from '../services/api';
import { saveStoredChange, deleteStoredChange } from '../services/offlineStorage';
import { Power, Assignment } from '../types';
import { Search, Home, ArrowLeft, UserMinus, UserPlus, ChevronDown, CheckSquare, Square, X, FileText } from 'lucide-react';
import UserPlusMinus from '../components/icons/UserPlusMinus';

// Layout Components
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';


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
  const [newExpiry, setNewExpiry] = useState('');

  // Inputs for Removing (Multi-select)
  const [selectedRemovePlins, setSelectedRemovePlins] = useState<Set<string>>(new Set());
  const [showRemoveDropdown, setShowRemoveDropdown] = useState(false);
  const [removeFilter, setRemoveFilter] = useState('');
  const removeDropdownRef = useRef<HTMLDivElement>(null);
  const removeInputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Discard Changes?");
  const [confirmMessage, setConfirmMessage] = useState("You have unsaved changes. Are you sure you want to discard them?");
  const [confirmLabel, setConfirmLabel] = useState("Discard");
  const [confirmVariant, setConfirmVariant] = useState<'primary'|'danger'>("danger");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  const newOwnerName = getCharacterName(newOwner);

  // Baseline to track unsaved changes
  const [baselineJson, setBaselineJson] = useState('');

  const getCurrentStateString = () => JSON.stringify({
    newOwner,
    newExpiry,
    selectedRemovePlins: Array.from(selectedRemovePlins).sort()
  });

  const isUnsaved = power !== null && getCurrentStateString() !== baselineJson && !statusMessage?.text.includes("Assigned");

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
        // Load Draft
        const { power: savedPower, newOwner: savedNewOwner, newExpiry: savedNewExpiry, selectedRemovePlins: savedRemovePlins } = location.state.initialData;
        setPower(savedPower);
        setPoinSearch(savedPower.poin);
        setCurrentAssignments(savedPower.assignments || []);
        setNewOwner(savedNewOwner);
        setNewExpiry(savedNewExpiry);

        // Safe default for the potentially undefined array from old drafts
        const safeRemovePlins = savedRemovePlins || [];
        setSelectedRemovePlins(new Set(safeRemovePlins));

        // Set baseline from draft
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
          // Baseline for new item to load
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
        // Set baseline
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
    setBaselineJson(getCurrentStateString()); // Update baseline
    setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
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

  const formatDate = (val: string) => {
    let clean = val.replace(/\D/g, '');
    let day = clean.slice(0, 2);
    let month = clean.slice(2, 4);
    let year = clean.slice(4, 8);

    if (day.length === 2) {
      let d = parseInt(day, 10);
      if (d > 31) d = 31;
      if (d < 1) d = 1;
      day = d.toString().padStart(2, '0');
    }
    if (month.length === 2) {
      let m = parseInt(month, 10);
      if (m > 12) m = 12;
      if (m < 1) m = 1;
      month = m.toString().padStart(2, '0');
    }
    if (year.length === 4) {
      let y = parseInt(year, 10);
      if (y > 2100) y = 2100;
      if (y < 1980) y = 1980;
      year = y.toString();
    }
    return day + (clean.length >= 3 ? `/${month}` : '') + (clean.length >= 5 ? `/${year}` : '');
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

  // Filter assignments based on input
  const filteredRemoveAssignments = currentAssignments.filter(a => {
    const search = removeFilter.toLowerCase();
    const name = getCharacterName(a.plin) || '';
    return a.plin.toLowerCase().includes(search) || name.toLowerCase().includes(search);
  });

  const toggleSelectFilteredRemove = () => {
    const newSet = new Set(selectedRemovePlins);
    // Check if all *visible* elements are selected
    const allFilteredSelected = filteredRemoveAssignments.length > 0 && filteredRemoveAssignments.every(a => newSet.has(a.plin));

    if (allFilteredSelected) {
      // Deselect only the filtered ones
      filteredRemoveAssignments.forEach(a => newSet.delete(a.plin));
    } else {
      // Select all filtered ones
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
        // Reset baseline for next action
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

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(newExpiry) && newExpiry !== 'until death') {
      setStatusMessage({ type: 'error', text: 'Invalid Expiry Date format.' });
      return;
    }

    if (draftId) {
      setConfirmTitle("Process Draft?");
      setConfirmMessage("The object may have been changed since this draft was stored. Proceed?");
      setConfirmLabel("Process");
      setConfirmVariant("primary");
      setPendingAction(() => executeAddPlayer);
      setShowConfirm(true);
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
        // Reset baseline
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
      setConfirmTitle("Process Draft?");
      setConfirmMessage("The object may have been changed since this draft was stored. Proceed?");
      setConfirmLabel("Process");
      setConfirmVariant("primary");
      setPendingAction(() => executeRemovePlayers);
      setShowConfirm(true);
      return;
    }

    await executeRemovePlayers();
  };

  const getAssignedPlayersDisplay = () => {
    if (currentAssignments.length === 0) return 'None';
    return currentAssignments.map(a => {
      const n = getCharacterName(a.plin);
      return n ? `${a.plin} ${n}` : a.plin;
    }).join('\n');
  }

  // --- Header/Panel Content Definitions ---

  const headerLeftContent = (<UserPlusMinus size={20} className="text-entity-power" />);
  const headerRightContent = (
    draftId && draftTimestamp ? (
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
             <span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleDateString()}
          </span>
    ) : null
  );

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
            <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate(returnTo || `/?${returnQuery}`))} title="Back">
              <ArrowLeft size={16} className="mr-2" /> Back
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
                        <Button type="submit" isLoading={isUpdating} className="w-24 h-[38px]">Assign</Button>
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

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                        <FileText size={16} className="mr-2" /> Save Draft
                      </Button>
                      <Button type="button" variant="danger" onClick={handleRemovePlayers} isLoading={isUpdating} className="h-[38px]" disabled={selectedRemovePlins.size === 0}>
                        Remove Selected {selectedRemovePlins.size > 0 && `(${selectedRemovePlins.size})`}
                      </Button>
                    </div>
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

export default AssignPower;
import React, {useState, useEffect, useRef} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import {searchConditionByCoin, updateCondition, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
import {Condition} from '../types';
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
  CalendarClock
} from 'lucide-react';

// --- Layout Components Import ---
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';

const ExtendCondition: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [coinSearch, setCoinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  const [condition, setCondition] = useState<Condition | null>(null);

  const [selectedPlins, setSelectedPlins] = useState<Set<string>>(new Set());
  // noinspection SpellCheckingInspection
  const [showPlinDropdown, setShowPlinDropdown] = useState(false);
  // noinspection SpellCheckingInspection
  const [plinFilter, setPlinFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  // noinspection SpellCheckingInspection
  const plinInputRef = useRef<HTMLInputElement>(null);

  const [expiryDate, setExpiryDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Discard Changes?");
  const [confirmMessage, setConfirmMessage] = useState("You have unsaved changes. Are you sure you want to discard them?");
  const [confirmLabel, setConfirmLabel] = useState("Discard");
  const [confirmVariant, setConfirmVariant] = useState<'primary' | 'danger'>("danger");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

  const [baselineJson, setBaselineJson] = useState('');

  const getCurrentStateString = () => JSON.stringify({
    selectedPlins: Array.from(selectedPlins).sort(),
    expiryDate
  });

  const isUnsaved = condition !== null && getCurrentStateString() !== baselineJson && !statusMessage?.text.includes("Updated");
  const effectiveExpiry = expiryDate.trim() === '' ? 'until death' : expiryDate;
  const isDirtyDB = condition?.assignments.some(a =>
    selectedPlins.has(a.plin) && a.expiryDate !== effectiveExpiry
  ) && !statusMessage?.text.includes("Updated");

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlinDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const confirmNavigation = (action: () => void) => {
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

  useEffect(() => {
    if (location.state) {
      if (location.state.initialData) {
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

  // noinspection SpellCheckingInspection
  const togglePlinSelect = (plin: string) => {
    const newSet = new Set(selectedPlins);
    if (newSet.has(plin)) {
      newSet.delete(plin);
    } else {
      newSet.add(plin);
      if (newSet.size === 1 && condition && expiryDate === '') {
        const assign = condition.assignments.find(a => a.plin === plin);
        if (assign) setExpiryDate(assign.expiryDate);
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

  const toggleSelectFiltered = () => {
    const newSet = new Set(selectedPlins);
    const allFilteredSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => newSet.has(a.plin));

    if (allFilteredSelected) {
      filteredAssignments.forEach(a => newSet.delete(a.plin));
    } else {
      filteredAssignments.forEach(a => newSet.add(a.plin));
      if (filteredAssignments.length > 0 && expiryDate === '') {
        setExpiryDate(filteredAssignments[0].expiryDate);
      }
    }
    setSelectedPlins(newSet);
  };

  const isAllFilteredSelected = filteredAssignments.length > 0 && filteredAssignments.every(a => selectedPlins.has(a.plin));

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (expiryDate && val.length < expiryDate.length) setExpiryDate(val);
    else setExpiryDate(formatDate(val));
  };

  const handleAddYearAndRound = () => {
    if (!expiryDate || expiryDate === 'until death') return;
    setStatusMessage(null);
    const parts = expiryDate.split('/');
    if (parts.length !== 3) return;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return;
    date.setFullYear(date.getFullYear() + 1);
    if (date.getDate() !== 1) {
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
    }
    if (date.getFullYear() > 2100) return;
    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = date.getFullYear();
    setExpiryDate(`${newDay}/${newMonth}/${newYear}`);
  };

  const validateExpiryDate = (val: string): string | null => {
    if (val === 'until death' || val === '') return null;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return 'Invalid date format (DD/MM/YYYY)';
    const [d, m, y] = val.split('/').map(Number);
    if (d < 1 || d > 31) return 'Day must be between 1 and 31';
    else if (m < 1 || m > 12) return 'Month must be between 1 and 12';
    else if (y < 1980 || y > 2100) return 'Year must be between 1980 and 2100';
    return null;
  };

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

  const executeUpdate = async () => {
    const newEffectiveExpiry = expiryDate.trim() === '' ? 'until death' : expiryDate;
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const newAssignments = condition!.assignments.map(a =>
        selectedPlins.has(a.plin) ? {...a, expiryDate: newEffectiveExpiry} : a
      );
      const result = await updateCondition(condition!.coin, {assignments: newAssignments});
      if (result.success) {
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        const updatedPlins = Array.from(selectedPlins).join(', ');
        setStatusMessage({type: 'success', text: `Updated expiry for: ${updatedPlins}`});
        setCondition({...condition!, assignments: newAssignments});
        setBaselineJson(getCurrentStateString());
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
    if (!condition || selectedPlins.size === 0) return;

    const dateError = validateExpiryDate(expiryDate);
    if (dateError) {
      setStatusMessage({type: 'error', text: dateError});
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

    if (selectedPlins.size >= 5) {
      setConfirmTitle("Confirm Mass Update");
      setConfirmMessage(`You are about to update the expiry date for ${selectedPlins.size} players. Do you want to proceed?`);
      setConfirmLabel("Update");
      setConfirmVariant("primary");
      setPendingAction(() => executeUpdate);
      setShowConfirm(true);
    } else {
      executeUpdate().then();
    }
  };

  const getAssignedPlayersDisplay = () => {
    if (!condition || !condition.assignments || condition.assignments.length === 0) return 'None';
    return condition.assignments.map(a => {
      const n = getCharacterName(a.plin);
      return n ? `${a.plin} ${n}` : a.plin;
    }).join('\n');
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
              <Input label="Enter COIN" value={coinSearch}
                     onChange={(e) => setCoinSearch(e.target.value.replace(/\D/g, '').slice(0, 4))}
                     placeholder="4-digit ID" error={searchError} className="mb-0" inputMode="numeric"/>
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSearching} disabled={!coinSearch}><Search size={16}
                                                                                             className="mr-2"/> Find</Button>
              </div>
            </form>
          )}
          {condition && (
            <div className="space-y-2 animation-fade-in">
              {statusMessage && (
                <div
                  className={`p-2 rounded border text-sm font-serif ${statusMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                  {statusMessage.text}
                </div>
              )}

              <div className="flex gap-2">
                <div className="w-20 shrink-0">
                  <Input label="COIN" value={condition.coin} readOnly
                         className="font-mono bg-entity-condition/10 text-entity-condition h-[38px]"/>
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

              <Input label="Name" value={condition.name} readOnly/>
              <Input label="Description" value={condition.description} readOnly multiline rows={3}/>

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
                          className="text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/50 px-2 py-0.5 rounded-full">
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
                        >
                          {plinFilter ? <X size={16}/> : <ChevronDown size={16}/>}
                        </div>
                      </div>

                      {/* Dropdown Menu - Opens Upwards */}
                      {showPlinDropdown && condition.assignments.length > 0 && (
                        <div
                          className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                          <div
                            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 sticky top-0 z-20"
                            onClick={toggleSelectFiltered}
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

                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-1.5">New
                    Expiry Date:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`${inputClasses} flex-1 min-w-0`}
                      value={expiryDate}
                      onChange={handleDateChange}
                      placeholder="dd/mm/yyyy (Empty = 'until death')"
                      disabled={selectedPlins.size === 0}
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleAddYearAndRound}
                      title="+1 Year"
                      disabled={selectedPlins.size === 0}
                      className="h-[38px] w-[38px]"
                      style={{padding: 0}}
                    >
                      <CalendarPlus size={24} strokeWidth={2}/>
                    </Button>
                  </div>

                  <div className="flex justify-end mt-4 gap-2">
                    <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                      <FileText size={16} className="mr-2"/> Save Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUpdate}
                      isLoading={isUpdating}
                      disabled={selectedPlins.size === 0 || !isDirtyDB}>
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
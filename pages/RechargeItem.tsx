import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { searchItemByItin, updateItem, getCharacterName } from '../services/api';
import { saveStoredChange, deleteStoredChange } from '../services/offlineStorage';
import { Item } from '../types';
import { Search, CalendarPlus, Home, ArrowLeft, Save, FileText } from 'lucide-react';

const RechargeItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Search State
  const [itinSearch, setItinSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Navigation return logic
  const returnQuery = location.state?.returnQuery;
  const returnTo = location.state?.returnTo;

  // Item Data
  const [item, setItem] = useState<Item | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  
  // UI State
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

  // --- DIRTY CHECKING BASELINE ---
  const [baselineExpiry, setBaselineExpiry] = useState('');

  // Check if current state differs from the last saved/loaded state
  const isUnsaved = item !== null && expiryDate !== baselineExpiry && !statusMessage?.text.includes("Success");

  const inputClasses = "w-full px-3 py-2 border rounded shadow-inner font-serif text-sm transition-all duration-200 border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none bg-white text-gray-900 dark:bg-gray-900 dark:text-white dark:border-gray-600";

  // Prevent navigation if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUnsaved) {
        e.preventDefault();
        e.returnValue = '';
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
             const { item: savedItem, expiryDate: savedExpiry } = location.state.initialData;
             setItem(savedItem);
             setItinSearch(savedItem.itin);
             setExpiryDate(savedExpiry);
             setBaselineExpiry(savedExpiry);
             if (location.state.draftId) setDraftId(location.state.draftId);
             if (location.state.draftTimestamp) setDraftTimestamp(location.state.draftTimestamp);
        } else if (location.state.item) {
             const passedItem = location.state.item as Item;
             setItem(passedItem);
             setItinSearch(passedItem.itin);
             setExpiryDate(passedItem.expiryDate);
             setBaselineExpiry(passedItem.expiryDate);
        }
    }
  }, [location.state]);

  const handleResetSearch = () => {
    setItem(null);
    setItinSearch('');
    setExpiryDate('');
    setBaselineExpiry('');
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
    setItem(null);
    setDraftId(null);
    setDraftTimestamp(null);

    const itinRegex = /^\d{4}$/;
    if (!itinRegex.test(itinSearch)) {
      setSearchError('Invalid ITIN.');
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchItemByItin(itinSearch);
      if (result.success && result.data) {
        setItem(result.data);
        setExpiryDate(result.data.expiryDate);
        setBaselineExpiry(result.data.expiryDate);
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
      action: 'recharge',
      data: { item, expiryDate },
      timestamp: now,
      title: item.name || 'Unknown Item',
      subtitle: `Recharge ITIN: ${item.itin}`
    });
    setDraftId(id);
    setDraftTimestamp(now);
    setBaselineExpiry(expiryDate);
    setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
    setTimeout(() => {
        setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
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

    let res = day;
    if (clean.length >= 3) {
      res += `/${month}`;
    }
    if (clean.length >= 5) {
      res += `/${year}`;
    }
    return res;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = e.target.value;
     if (expiryDate && val.length < expiryDate.length) {
         setExpiryDate(val);
     } else {
         setExpiryDate(formatDate(val));
     }
  };

  const handleAddYearAndRound = () => {
    if (!expiryDate) return;
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

    if (date.getFullYear() > 2100) {
        return; 
    }

    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = date.getFullYear();

    setExpiryDate(`${newDay}/${newMonth}/${newYear}`);
  };

  const validateExpiryDate = (val: string): string | null => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return 'Invalid date format (DD/MM/YYYY)';
    const [d, m, y] = val.split('/').map(Number);
    if (y < 1980 || y > 2100) return 'Year must be between 1980 and 2100';
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
        return 'Invalid calendar date';
    }
    return null;
  };

  const executeUpdate = async () => {
    if (!item) return;
    
    const dateError = validateExpiryDate(expiryDate);
    if (dateError) {
        setStatusMessage({ type: 'error', text: dateError });
        return;
    }

    setIsUpdating(true);
    setStatusMessage(null);
    try {
      const oldExpiry = item.expiryDate;
      const result = await updateItem(item.itin, { expiryDate });
      if (result.success) {
        if (draftId) {
            deleteStoredChange(draftId);
            setDraftId(null);
            setDraftTimestamp(null);
        }
        setStatusMessage({ type: 'success', text: `Success! Expiry updated from ${oldExpiry} to ${expiryDate}` });
        setItem({...item, expiryDate});
        setBaselineExpiry(expiryDate); 
      } else {
        setStatusMessage({ type: 'error', text: 'Failed.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = () => {
      if (draftId) {
          setConfirmTitle("Process Draft?");
          setConfirmMessage("The object may have been changed since this draft was stored. Proceed?");
          setConfirmLabel("Process");
          setConfirmVariant("primary");
          setPendingAction(() => executeUpdate);
          setShowConfirm(true);
          return;
      }
      executeUpdate();
  };

  const formatOwner = (plin: string) => {
    const name = getCharacterName(plin);
    return name ? `${plin} ${name}` : plin;
  };

  return (
    <div className="mx-auto mt-2 px-2 w-full landscape:w-9/12">
      
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
         <div className="flex gap-2">
            {(returnQuery || returnTo) && (
              <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate(returnTo || `/?${returnQuery}`))} title="Back">
                <ArrowLeft size={16} />
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))} title="Dashboard">
              <Home size={16} />
            </Button>
            <Button variant="secondary" type="button" onClick={() => confirmAction(handleResetSearch)} title="New Search">
              <Search size={16} />
            </Button>
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-panel border border-gray-300 dark:border-gray-600 overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center gap-2">
          <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            Recharge Item
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {draftId && draftTimestamp ? (
                <span><span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleString()}</span>
            ) : null}
          </div>
        </div>

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
                     <Search size={16} className="mr-2" /> Find
                   </Button>
                </div>
             </form>
           )}

           {item && (
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
                     <Input label="ITIN" value={item.itin} readOnly className="font-mono bg-gray-50" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <Input label="Player (PLIN)" value={formatOwner(item.owner)} readOnly multiline={true} />
                   </div>
                </div>

                <Input label="Name" value={item.name} readOnly />
                <Input label="Description" value={item.description} readOnly multiline rows={3} />
                <Input label="Remarks" value={item.remarks || ''} readOnly multiline rows={3} />
                <Input label="CS Remarks" value={item.csRemarks || ''} readOnly multiline rows={3} />
                
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 font-serif mb-1.5">Expiry Date:</label>
                <div className="flex gap-2">
                     <input 
                         type="text"
                         className={`${inputClasses} flex-1 min-w-0`}
                         value={expiryDate}
                         onChange={handleDateChange}
                         placeholder="dd/mm/yyyy"
                     />
                      <Button 
                        variant="secondary" 
                        type="button" 
                        onClick={handleAddYearAndRound} 
                        title="+1 Year (Round to 1st)" 
                        className="h-[38px] w-[38px]"
                        style={{ padding: 0 }}
                      >
                        <CalendarPlus size={24} strokeWidth={2} />
                      </Button>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                    <FileText size={16} className="mr-2" /> Save Draft
                  </Button>
                  <Button type="button" onClick={handleUpdate} isLoading={isUpdating}>
                    <Save size={16} className="mr-2" /> Update
                  </Button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default RechargeItem;
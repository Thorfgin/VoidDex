import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { createItem, getCharacterName } from '../services/api';
import { saveStoredChange, deleteStoredChange } from '../services/offlineStorage';
import { Home, FilePlus, BatteryCharging, ArrowLeft, Save, FileText } from 'lucide-react';
import { Item } from '../types';

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

const CreateItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewItin, setViewItin] = useState('');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);
  
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
          const item = location.state.item as Item;
          const data = {
            name: item.name,
            description: item.description,
            owner: item.owner,
            expiryDate: item.expiryDate,
            remarks: item.remarks || '',
            csRemarks: item.csRemarks || ''
          };
          setFormData(data);
          setInitialState(data);
          setViewItin(item.itin);
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
    setViewItin('');
    setStatusMessage(null);
    setIsLoading(false);
    setDraftId(null);
    setDraftTimestamp(null);
    navigate('/create-item', { replace: true, state: {} });
  };

  const handleNavigateWithState = (path: string) => {
    const currentItem: Item = {
      itin: viewItin,
      name: formData.name,
      description: formData.description,
      owner: formData.owner,
      expiryDate: formData.expiryDate,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'owner') {
        newValue = formatPLIN(value);
    } else if (name === 'expiryDate') {
        if ((formData.expiryDate && value.length < formData.expiryDate.length)) {
             newValue = value; 
        } else {
             newValue = formatDate(value);
        }
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleSaveDraft = () => {
    const id = draftId || `draft-${Date.now()}`;
    const now = Date.now();
    saveStoredChange({
      id: id,
      type: 'item',
      action: 'create',
      data: formData,
      timestamp: now,
      title: formData.name || 'Untitled Item',
      subtitle: 'Draft Item'
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
    if (!/^\d{1,4}#\d{1,2}$/.test(owner)) return "Player must be format 1234#12 or 12#1";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) return "Expiry Date must be DD/MM/YYYY";
    
    const [d, m, y] = expiryDate.split('/').map(Number);
    if (y < 1980 || y > 2100) return 'Year must be between 1980 and 2100';
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
        return "Invalid calendar date";
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
      const result = await createItem({
        name: formData.name,
        description: formData.description,
        owner: formData.owner,
        expiryDate: formData.expiryDate,
        remarks: formData.remarks,
        csRemarks: formData.csRemarks
      });

      if (result.success) {
        if (draftId) {
            deleteStoredChange(draftId);
            setDraftId(null);
            setDraftTimestamp(null);
        }
        setStatusMessage({ type: 'success', text: `Item Created! ITIN: ${result.data?.itin}` });
        setIsReadOnly(true);
        setInitialState(formData);
      } else {
        setStatusMessage({ type: 'error', text: 'Failed: ' + result.error });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const ownerInput = (
    <div>
        <Input
        label="Player (PLIN)"
        name="owner"
        value={isViewMode && characterName ? `${formData.owner} ${characterName}` : formData.owner}
        onChange={handleChange}
        readOnly={isReadOnly}
        required={!isViewMode}
        placeholder="1234#12"
        multiline={isViewMode}
        />
        {!isViewMode && characterName && (
            <div className="-mt-3 mb-3 ml-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                {characterName}
            </div>
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
      required={!isViewMode}
      placeholder="dd/mm/yyyy"
    />
  );

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
            <Button variant="secondary" type="button" onClick={() => confirmAction(handleReset)} title="New Item">
                 <FilePlus size={16} />
            </Button>

            {isViewMode && (
              <>
                <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/recharge-item')} title="Recharge">
                  <BatteryCharging size={16} />
                </Button>
                <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/assign-item')} title="Assign">
                  <UserPlusMinus size={16} />
                </Button>
              </>
            )}
         </div>
       </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-panel border border-gray-300 dark:border-gray-600 overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center gap-2">
          <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            {isViewMode ? 'Item Properties' : 'Create Item'}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {draftId && draftTimestamp ? (
                <span><span className="font-bold">(Draft)</span> {new Date(draftTimestamp).toLocaleString()}</span>
            ) : null}
          </div>
        </div>
        
        <div className="p-4">
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
                   <Input label="ITIN" value={viewItin} readOnly className="font-mono" />
                </div>
                <div className="flex-1 min-w-0">
                   {ownerInput}
                </div>
              </div>
            ) : null}

            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              readOnly={isReadOnly}
              required={!isViewMode}
              placeholder="Item Name"
            />
            
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              readOnly={isReadOnly}
              required={!isViewMode}
              placeholder="Description"
              multiline
              rows={4}
              expandable={false}
            />
            
            {!isViewMode ? (
              <div className="flex gap-2">
                <div className="flex-1">{ownerInput}</div>
                <div className="flex-1">{expiryInput}</div>
              </div>
            ) : expiryInput}

            <Input
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              readOnly={isReadOnly}
              placeholder="Remarks"
              multiline
              rows={4}
            />

            <Input
              label="CS Remarks"
              name="csRemarks"
              value={formData.csRemarks}
              onChange={handleChange}
              readOnly={isReadOnly}
              placeholder="CS Remarks"
              multiline
              rows={4}
            />

            {!isReadOnly && !isViewMode && (
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <Button type="button" variant="secondary" onClick={handleSaveDraft}>
                   <FileText size={16} className="mr-2" />
                   Save Draft
                </Button>
                <Button type="submit" isLoading={isLoading}>
                   <Save size={16} className="mr-2" />
                   Create Item
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateItem;
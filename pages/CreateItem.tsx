import React, {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import UserPlusMinus from '../components/icons/UserPlusMinus';
import {createItem, getCharacterName} from '../services/api';
import {saveStoredChange, deleteStoredChange} from '../services/offlineStorage';
import {
  Home,
  FilePlus,
  PlusSquare,
  BatteryCharging,
  ArrowLeft,
  Save,
  FileText,
  AlertTriangle,
  LucideIcon
} from 'lucide-react';
import {Item} from '../types';
import {formatDate, getDefaultExpiry} from "../utils/dateUtils";
import {formatPLIN} from "../utils/playerUtils";

// Define ModalConfig type
type ModalConfig = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  primaryAction: React.ComponentProps<typeof ConfirmModal>['primaryAction'];
  secondaryAction?: React.ComponentProps<typeof ConfirmModal>['secondaryAction'];
  icon?: LucideIcon;
  iconColorClass?: string;
}

const CreateItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isViewMode, setIsViewMode] = useState(false);
  const [viewItin, setViewItin] = useState('');

  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [draftId, setDraftId] = useState<string | null>(() => location.state?.draftId || null);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(() => location.state?.draftTimestamp || null);

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

  // NEW: Function to close the modal
  const closeModal = () => setModalConfig(null);

  // --- Effects and Handlers ---

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // UPDATED: Use modalConfig for confirmation
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
    navigate('/create-item', {replace: true, state: {}});
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
    confirmAction(() => { // Added confirmAction wrapper
      navigate(path, {
        state: {
          item: currentItem,
          returnQuery: returnQuery
        }
      });
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const {name, value} = e.target;
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
    setFormData(prev => ({...prev, [name]: newValue}));
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
    setStatusMessage({type: 'success', text: 'Draft saved successfully.'});
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === 'Draft saved successfully.' ? null : prev);
    }, 3000);
  };

  const validateForm = () => {
    const {name, description, owner, expiryDate} = formData;
    if (!name.trim()) return "Name is required.";
    if (!description.trim()) return "Description is required.";
    // Updated PLIN validation message for consistency
    if (!/^\d{1,4}#\d{1,2}$/.test(owner)) return "Player must be format 1234#12";

    // Check if expiry date is required and valid
    if (!expiryDate.trim()) return "Expiry Date is required and must be DD/MM/YYYY.";

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) return "Expiry Date must be DD/MM/YYYY.";

    const [d, m, y] = expiryDate.split('/').map(Number);
    if (y < 1980 || y > 2100) return 'Year must be between 1980 and 2100';

    // Validate calendar date integrity
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
      setStatusMessage({type: 'error', text: error});
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

      if (result.success && result.data?.itin) { // Ensure data and itin exist
        if (draftId) {
          deleteStoredChange(draftId);
          setDraftId(null);
          setDraftTimestamp(null);
        }
        setStatusMessage({type: 'success', text: `Item Created! ITIN: ${result.data.itin}`});
        setIsReadOnly(true);
        setInitialState(formData);
        setViewItin(result.data.itin); // Set ITIN for view mode
        setIsViewMode(true);
      } else {
        setStatusMessage({type: 'error', text: 'Failed: ' + (result.error || 'No item ID returned.')});
      }
    } catch (err) {
      setStatusMessage({type: 'error', text: 'An unexpected error occurred.'});
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Props ---
  const ownerInput = (
    <div className="mb-4 w-full">
      <Input
        label="Player (PLIN)"
        name="owner"
        // Show PLIN and Character Name in View Mode, otherwise just PLIN
        value={isViewMode && characterName ? `${formData.owner} (${characterName})` : formData.owner}
        onChange={handleChange}
        readOnly={isReadOnly}
        required={!isViewMode}
        placeholder="1234#12"
        multiline={isViewMode}
      />
      {/* Show character name hint only in edit/create mode */}
      {!isViewMode && characterName && (
        <div className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
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

  // Preparing Panel content
  const headerLeftContent = (<PlusSquare size={20} className="text-entity-item"/>);
  const headerRightContent = (draftId && draftTimestamp ? (
    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
      <span className="font-bold">(Draft)</span>
      {new Date(draftTimestamp).toLocaleDateString()}
    </span>) : null) // Updated to toLocaleDateString() for consistency

  // --- Main Render Block ---
  return (
    <Page maxWidth="xl" className="landscape:w-9/12">
      {/* Generic Modal Rendering - UPDATED */}
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

      {/* Top Button Bar - remains outside the Panel */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(returnQuery || returnTo) && (
            <Button variant="secondary" type="button" onClick={handleBack} title="Back">
              <ArrowLeft size={16}/>
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={() => confirmAction(() => navigate('/'))}
                  title="Dashboard">
            <Home size={16}/>
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => confirmAction(handleReset)} title="New Item">
            <FilePlus size={16}/>
          </Button>

          {isViewMode && (
            <>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/recharge-item')}
                      title="Recharge">
                <BatteryCharging size={16}/>
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleNavigateWithState('/assign-item')}
                      title="Assign">
                <UserPlusMinus size={16}/>
              </Button>
            </>
          )}
        </div>
      </div>

      <Panel
        title={isViewMode ? 'Item Properties' : 'Create Item'}
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
      >
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
                  {/* Added consistency class h-[38px] */}
                  <Input label="ITIN" value={viewItin} readOnly className="font-mono h-[38px]"/>
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
                <Button type="button" variant="secondary" onClick={handleSaveDraft}
                        disabled={!isDirty}> {/* Added disabled prop */}
                  <FileText size={16} className="mr-2"/>
                  Save Draft
                </Button>
                <Button type="submit" isLoading={isLoading}>
                  <Save size={16} className="mr-2"/>
                  Create Item
                </Button>
              </div>
            )}
          </form>
        </div>
      </Panel>
    </Page>
  );
};

export default CreateItem;
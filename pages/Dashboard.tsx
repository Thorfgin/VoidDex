// noinspection SpellCheckingInspection

import React, {useState, useEffect, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {
  BatteryCharging,
  Search,
  X,
  PlusSquare,
  CalendarClock,
  ClipboardList,
  StickyNote,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  User,
  Zap,
  Activity,
  Box,
  QrCode,
  LayoutGrid,
  List
} from 'lucide-react';
import Button from '../components/ui/Button';
import UserPlusMinus from '../components/icons/UserPlusMinus';
import {searchGlobal, getCharacterName} from '../services/api';
import {getStoredChanges, getNotes} from '../services/offlineStorage';
import {Item, Condition, Power, Assignment} from '../types';

type FilterType = 'all' | 'name' | 'owner' | 'itin' | 'coin' | 'power';
type SortField = 'DATE' | 'NAME';
type SortDirection = 'ASC' | 'DESC';
type ViewMode = 'grid' | 'list';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // View Mode State (Persisted)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('dashboard_view_mode') as ViewMode) || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_view_mode', viewMode);
  }, [viewMode]);

  // Filter State
  const getFilterFromUrl = (): FilterType => {
    const f = searchParams.get('filter');
    if (f === 'name' || f === 'owner' || f === 'itin' || f === 'coin' || f === 'power') return f as FilterType;
    return 'all';
  };

  const [activeFilter, setActiveFilter] = useState<FilterType>(getFilterFromUrl());

  // Search State
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<(Item | Condition | Power)[] | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);

  // Sort State
  const [sortField, setSortField] = useState<SortField>('NAME');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');

  // --- SEARCH EXECUTION EFFECT ---
  useEffect(() => {
    const currentQ = searchParams.get('q');
    setActiveFilter(getFilterFromUrl());

    if (!currentQ) {
      setSearchResults(null);
      setQuery('');
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      const sanitized = currentQ.replace(/[^a-zA-Z0-9 #\-_]/g, '');
      try {
        const result = await searchGlobal(sanitized);
        if (result.success && result.data) {
          setSearchResults(result.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch().then();
  }, [searchParams]);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const changes = getStoredChanges();
    setDraftCount(changes.length);
    const notes = getNotes();
    setNoteCount(notes.length);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const rawQuery = query.trim();
    if (!rawQuery) return;

    let nextQuery = rawQuery;
    let nextFilter = activeFilter;

    // --- SMART SEARCH DETECTION ---
    const match = rawQuery.match(/^(POIN|COIN|ITIN|PLIN)(\s*)(.*)/i);

    if (match) {
      const prefix = match[1].toUpperCase();
      const separator = match[2];
      const rest = match[3];

      const isCompact = separator.length === 0;
      const isValidTrigger = !isCompact || /^[\d#]/.test(rest);

      if (isValidTrigger) {
        const value = rest.trim();
        if (value) {
          nextQuery = value;
          switch (prefix) {
            case 'POIN':
              nextFilter = 'power';
              break;
            case 'COIN':
              nextFilter = 'coin';
              break;
            case 'ITIN':
              nextFilter = 'itin';
              break;
            case 'PLIN':
              nextFilter = 'owner';
              break;
          }
        }
      }
    }

    setQuery(nextQuery);
    setActiveFilter(nextFilter);

    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('q', nextQuery);
      newParams.set('filter', nextFilter);
      return newParams;
    });
  };

  const clearSearch = () => {
    setSearchParams({});
    setSortField('NAME');
    setSortDirection('ASC');
  };

  const handleFilterChange = (f: FilterType) => {
    setActiveFilter(f);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('filter', f);
      const currentQ = prev.get('q');
      if (currentQ) newParams.set('q', currentQ);
      return newParams;
    });
  };

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection(field === 'DATE' ? 'ASC' : 'ASC');
    }
  };

  const parseDateValue = (dateStr: string): number => {
    if (!dateStr) return 9999999999999;
    if (dateStr === 'until death') return 8888888888888;

    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return 9999999999999;
  };

  const getSortDate = (item: Item | Condition | Power): number => {
    if ('expiryDate' in item) {
      return parseDateValue((item as Item).expiryDate);
    }
    const assignments = (item as (Condition | Power)).assignments;
    if (!assignments || assignments.length === 0) return 9999999999999;

    const timestamps = assignments.map(a => parseDateValue(a.expiryDate));
    return Math.min(...timestamps);
  };

  const displayedResults = useMemo(() => {
    if (!searchResults) return [];

    let filtered = searchResults;
    if (activeFilter !== 'all') {
      const lowerQuery = query.toLowerCase();
      filtered = searchResults.filter(item => {
        const isCondition = 'coin' in item;
        const isPower = 'poin' in item;

        if (activeFilter === 'name') return item.name.toLowerCase().includes(lowerQuery);

        if (activeFilter === 'owner') {
          if (isCondition) {
            const c = item as Condition;
            return c.assignments.some(a => a.plin.toLowerCase().includes(lowerQuery));
          } else if (isPower) {
            const p = item as Power;
            return p.assignments.some(a => a.plin.toLowerCase().includes(lowerQuery));
          } else {
            const i = item as Item;
            return i.owner.toLowerCase().includes(lowerQuery);
          }
        }

        if (activeFilter === 'itin') {
          if (isCondition || isPower) return false;
          return (item as Item).itin.includes(query);
        }

        if (activeFilter === 'coin') {
          if (!isCondition) return false;
          return (item as Condition).coin.includes(query);
        }

        if (activeFilter === 'power') {
          if (!isPower) return false;
          return (item as Power).poin.includes(query);
        }

        return true;
      });
    }

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'NAME') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'DATE') {
        const dateA = getSortDate(a);
        const dateB = getSortDate(b);
        comparison = dateA - dateB;
      }
      return sortDirection === 'ASC' ? comparison : -comparison;
    });

  }, [searchResults, activeFilter, query, sortField, sortDirection]);


  const handleItemClick = (item: Item | Condition | Power) => {
    if ('coin' in item) {
      navigate('/create-condition', {state: {item, mode: 'view', returnQuery: searchParams.toString()}});
    } else if ('poin' in item) {
      navigate('/create-power', {state: {item, mode: 'view', returnQuery: searchParams.toString()}});
    } else {
      navigate('/create-item', {state: {item, mode: 'view', returnQuery: searchParams.toString()}});
    }
  };

  const formatOwner = (plin: string) => {
    const name = getCharacterName(plin);
    return name ? `${plin} ${name}` : plin;
  };

  const formatAssignmentsDisplay = (assignments: Assignment[]) => {
    if (!assignments || assignments.length === 0) return 'None';
    if (assignments.length === 1) return assignments[0].plin;
    return `${assignments[0].plin}, +${assignments.length - 1} Players`;
  };

  const GridAction = ({icon: Icon, title, onClick, type, className = ''}: {
    icon: any,
    title: string,
    onClick: () => void,
    type: 'item' | 'condition' | 'power' | 'scan',
    className?: string
  }) => {
    const isGrid = viewMode === 'grid';
    const [isHovered, setIsHovered] = useState(false);

    // Map type to semantic color classes
    let colorClass;
    let glowColorVar = "--color-primary"; // fallback

    if (type === 'item') {
      colorClass = "text-entity-item bg-entity-item/10";
      glowColorVar = "--color-item";
    } else if (type === 'condition') {
      colorClass = "text-entity-condition bg-entity-condition/10";
      glowColorVar = "--color-condition";
    } else if (type === 'power') {
      colorClass = "text-entity-power bg-entity-power/10";
      glowColorVar = "--color-power";
    } else {
      colorClass = "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"; // scan
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          // Add a glow on hover using entity color variable
          boxShadow: isHovered && type !== 'scan' ? `0 0 15px -2px rgba(var(${glowColorVar}), 0.4)` : '',
          borderColor: isHovered && type !== 'scan' ? `rgba(var(${glowColorVar}), 0.5)` : ''
        }}
        className={`flex ${isGrid ? 'flex-col items-center justify-center p-2 sm:p-2 aspect-square' : 'flex-row items-center p-1.5'} w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-300 active:scale-[0.98] group cursor-pointer select-none ${className}`}
      >
        <div
          className={`${isGrid ? 'p-3 sm:p-4 mb-2' : 'p-1.5 mr-2'} rounded-xl transition-colors duration-300 ${colorClass}`}>
          <Icon strokeWidth={1.5} size={isGrid ? 32 : 18} className={isGrid ? "sm:w-10 sm:h-10" : ""}/>
        </div>
        <div
          className={`${isGrid ? 'min-h-[2rem] justify-center' : 'h-auto justify-start'} w-full flex items-center px-1`}>
          <h3
            className={`font-display font-bold text-gray-700 dark:text-gray-200 ${isGrid ? 'text-sm sm:text-base text-center leading-tight line-clamp-2' : 'text-base'}`}>
            {title}
          </h3>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center mx-auto px-1 w-full max-w-lg">

      {/* 1. Search Bar */}
      <form onSubmit={handleSearch}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-0.5 shadow-panel flex gap-0.5 items-center sticky top-1 z-20">
        <div className="flex-grow relative min-w-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-2 h-[38px] bg-white text-gray-900 border border-gray-300 rounded-md shadow-inner focus:ring-1 focus:ring-brand-primary focus:border-brand-primary focus:outline-none dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600 font-serif text-sm"
          />
          {searchResults !== null && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
            >
              <X size={16}/>
            </button>
          )}
        </div>
        <Button type="submit" isLoading={isSearching} className="px-3 h-[38px]">
          <Search size={18}/>
        </Button>
      </form>

      {/* 2. Controls Row */}
      <div className="w-full flex justify-between items-center mt-4 mb-2 px-0.5">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/stored-changes')}
            className="relative px-3 h-[38px] z-10 text-entity-draft dark:text-entity-draft bg-entity-draft/5 dark:bg-entity-draft/10 border-entity-draft/30 dark:border-entity-draft/30 hover:bg-entity-draft/10 dark:hover:bg-entity-draft/20"
            title="My Stored Changes"
          >
            <ClipboardList size={18}/>
            {draftCount > 0 && (
              // Updated Badge to use RED (Notification Style)
              <span
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-sm ring-1 ring-white dark:ring-gray-800">
                   {draftCount}
                 </span>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/my-notes')}
            className="relative px-3 h-[38px] text-entity-note dark:text-entity-note bg-entity-note/5 dark:bg-entity-note/10 border-entity-note/30 dark:border-entity-note/30 hover:bg-entity-note/10 dark:hover:bg-entity-note/20"
            title="My Notes"
          >
            <StickyNote size={18}/>
            {noteCount > 0 && (
              // Updated Badge to use RED (Notification Style)
              <span
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-sm ring-1 ring-white dark:ring-gray-800">
                   {noteCount}
                 </span>
            )}
          </Button>
        </div>

        {searchResults === null && (
          <div
            className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700 h-[38px] items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-full px-2.5 rounded-md transition-colors flex items-center justify-center ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16}/>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-full px-2.5 rounded-md transition-colors flex items-center justify-center ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="List View"
            >
              <List size={16}/>
            </button>
          </div>
        )}
      </div>

      {searchResults !== null ? (
        <>
          <div className="w-full mb-2">
            <Button onClick={clearSearch} variant="secondary"
                    className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-sm py-2">
              <ArrowLeft size={16}/> Back to Dashboard
            </Button>
          </div>

          <div
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-panel p-2">

            <div
              className="flex gap-1 overflow-x-auto pb-2 mb-2 border-b border-gray-100 dark:border-gray-700 no-scrollbar">
              {(['all', 'name', 'owner', 'itin', 'coin', 'power'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFilterChange(f)}
                  className={`px-2 py-1 rounded-full text-xs font-serif font-bold transition-all uppercase whitespace-nowrap border ${
                    activeFilter === f
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}
                >
                  {f === 'owner' ? 'PLIN' : f === 'power' ? 'POIN' : f === 'name' ? 'OTHER' : f}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mb-2 px-1">
                    <span className="font-display font-bold text-gray-700 dark:text-gray-300 text-xs">
                        {displayedResults.length} Found
                    </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortToggle('DATE')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    sortField === 'DATE'
                      ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Calendar size={12}/>
                  Date
                  {sortField === 'DATE' && (sortDirection === 'ASC' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                </button>
                <button
                  onClick={() => handleSortToggle('NAME')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    sortField === 'NAME'
                      ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {sortDirection === 'ASC' ? <ArrowDownAZ size={12}/> : <ArrowUpAZ size={12}/>}
                  Title
                  {sortField === 'NAME' && (sortDirection === 'ASC' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                </button>
              </div>
            </div>

            {displayedResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-serif italic text-sm">
                No results match your search.
              </div>
            ) : (
              <div className="space-y-2">
                {displayedResults.map((item, idx) => {
                  const isCondition = 'coin' in item;
                  const isPower = 'poin' in item;
                  const isItem = !isCondition && !isPower;

                  let typeLabel,
                    id,
                    Icon,
                    ownerDisplay;

                  // Use semantic entity colors for icon backgrounds
                  let iconBgClass,
                    iconTextClass;

                  if (isCondition) {
                    typeLabel = 'COIN';
                    id = (item as Condition).coin;
                    Icon = Activity;
                    ownerDisplay = formatAssignmentsDisplay((item as Condition).assignments);
                    iconBgClass = "bg-entity-condition/10";
                    iconTextClass = "text-entity-condition";
                  } else if (isPower) {
                    typeLabel = 'POIN';
                    id = (item as Power).poin;
                    Icon = Zap;
                    ownerDisplay = formatAssignmentsDisplay((item as Power).assignments);
                    iconBgClass = "bg-entity-power/10";
                    iconTextClass = "text-entity-power";
                  } else {
                    typeLabel = 'ITIN';
                    id = (item as Item).itin;
                    Icon = Box;
                    ownerDisplay = formatOwner((item as Item).owner);
                    iconBgClass = "bg-entity-item/10";
                    iconTextClass = "text-entity-item";
                  }

                  let expiryDateStr = '';
                  let expiryStatusClass = "text-gray-500";

                  if (isItem) {
                    expiryDateStr = (item as Item).expiryDate;
                    if (expiryDateStr && expiryDateStr !== 'until death') {
                      const [d, m, y] = expiryDateStr.split('/').map(Number);
                      const expDate = new Date(y, m - 1, d);
                      expDate.setHours(23, 59, 59, 999);
                      if (expDate < new Date()) expiryStatusClass = "text-red-600 font-bold";
                      else expiryStatusClass = "text-green-600";
                    }
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className={`p-2 rounded-full mr-3 ${iconTextClass} ${iconBgClass}`}>
                        <Icon size={20}/>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <h4
                            className="font-serif font-bold text-gray-900 dark:text-white truncate pr-2">{item.name}</h4>
                          <span className="font-mono text-xs text-gray-400 shrink-0">{typeLabel} {id}</span>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <div className="flex flex-col">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <User size={12} className="mr-1"/>
                              <span className="truncate max-w-[120px]">{ownerDisplay}</span>
                            </div>
                          </div>
                          {isItem && expiryDateStr && (
                            <div className={`text-xs font-mono font-bold ${expiryStatusClass} flex items-center`}>
                              <span
                                className="font-sans font-normal text-[10px] text-gray-400 dark:text-gray-500 mr-1">EXP</span>
                              {expiryDateStr === 'until death' ? '∞' : expiryDateStr}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Dashboard Grid Logic with Entity Colors */}
          <div className={viewMode === 'grid' ? "grid grid-cols-3 gap-3 mb-4" : "flex flex-col gap-2 mb-4"}>
            {/* Items */}
            <GridAction type="item" icon={PlusSquare} title="Create Item" onClick={() => navigate('/create-item')}/>
            <GridAction type="item" icon={BatteryCharging} title="Recharge Item"
                        onClick={() => navigate('/recharge-item')}/>
            <GridAction type="item" icon={UserPlusMinus} title="Assign Item" onClick={() => navigate('/assign-item')}/>

            {/* Conditions */}
            <GridAction type="condition" icon={Activity} title="Create Condition"
                        onClick={() => navigate('/create-condition')}/>
            <GridAction type="condition" icon={CalendarClock} title="Extend Condition"
                        onClick={() => navigate('/extend-condition')}/>
            <GridAction type="condition" icon={UserPlusMinus} title="Assign Condition"
                        onClick={() => navigate('/assign-condition')}/>

            {/* Powers */}
            <GridAction type="power" icon={Zap} title="Create Power" onClick={() => navigate('/create-power')}/>
            <GridAction type="power" icon={CalendarClock} title="Extend Power"
                        onClick={() => navigate('/extend-power')}/>
            <GridAction type="power" icon={UserPlusMinus} title="Assign Power"
                        onClick={() => navigate('/assign-power')}/>

            {/* Tools */}
            {viewMode === 'grid' && <div/>}
            <GridAction type="scan" icon={QrCode} title="Scan Code" onClick={() => navigate('/scan')}/>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
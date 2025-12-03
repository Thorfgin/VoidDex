import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { searchItemByItin, searchConditionByCoin, searchPowerByPoin } from '../services/api';
import { Loader2 } from 'lucide-react';

interface Props {
  type: 'item' | 'condition' | 'power';
}

/**
 * Handles incoming deep links or QR code scans (e.g., /items/1234).
 * It attempts to fetch the object by ID.
 * - If found: Redirects to the appropriate View/Edit page with the object data loaded.
 * - If not found: Redirects to the Dashboard Search with the ID pre-filled as a fallback.
 */
const DeepLinkHandler: React.FC<Props> = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const resolve = async () => {
      try {
        let result;
        let targetPath = '';

        if (type === 'item') {
          // Assuming param is ITIN
          result = await searchItemByItin(id);
          targetPath = '/create-item'; // View Mode uses this page
        } else if (type === 'condition') {
          // Assuming param is COIN
          result = await searchConditionByCoin(id);
          targetPath = '/create-condition';
        } else if (type === 'power') {
          // Assuming param is POIN
          result = await searchPowerByPoin(id);
          targetPath = '/create-power';
        }

        if (result && result.success && result.data) {
          // Found it! Redirect to the view page with data in state
          navigate(targetPath, { 
            replace: true, 
            state: { 
              item: result.data, 
              mode: 'view',
              returnQuery: '' // No return query as we came directly
            } 
          });
        } else {
          // Not found, try searching globally on dashboard as a fallback
          navigate(`/?q=${id}`, { replace: true });
        }
      } catch (e) {
        console.error("Deep link error", e);
        navigate('/');
      }
    };

    resolve();
  }, [id, type, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
       <Loader2 className="animate-spin text-gray-400 mb-2" size={32} />
       <p className="text-gray-500 font-serif">Loading {type === 'item' ? 'Item' : type === 'condition' ? 'Condition' : 'Power'} {id}...</p>
    </div>
  );
};

export default DeepLinkHandler;
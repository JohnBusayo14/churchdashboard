import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { setActiveBranchIdHeader } from '../api.js';

const BranchCtx = createContext(null);

const BRANCH_PICK_KEY = 'gofamint_active_branch';

export function BranchProvider({ children }) {
  const { branches } = useAuth();
  const [activeBranchId, setActive] = useState(() => {
    const raw = localStorage.getItem(BRANCH_PICK_KEY);
    if (!raw || raw === 'all') return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  });

  // If the persisted branch is no longer in the user's branch list (deleted
  // or moved to another church), clear the selection.
  useEffect(() => {
    if (activeBranchId == null) return;
    if (!branches?.length) return;
    if (!branches.some((b) => b.id === activeBranchId)) {
      setActive(null);
    }
  }, [branches, activeBranchId]);

  // Mirror the selection into api.js so every authed request picks it up
  // without each page having to remember to add the header.
  useEffect(() => {
    setActiveBranchIdHeader(activeBranchId);
    if (activeBranchId == null) localStorage.removeItem(BRANCH_PICK_KEY);
    else localStorage.setItem(BRANCH_PICK_KEY, String(activeBranchId));
  }, [activeBranchId]);

  const setActiveBranchId = (id) => setActive(id || null);
  const activeBranch = activeBranchId
    ? branches?.find((b) => b.id === activeBranchId) || null
    : null;

  return (
    <BranchCtx.Provider value={{ branches, activeBranchId, activeBranch, setActiveBranchId }}>
      {children}
    </BranchCtx.Provider>
  );
}

export const useBranch = () => useContext(BranchCtx);

import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../hooks/useAuth';

// Lazy load the Enhanced LevelUpModal component for better performance
const EnhancedLevelUpModal = lazy(() => import('../components/achievements/EnhancedLevelUpModal'));

const LevelUpContext = createContext();

export const useLevelUp = () => {
  const context = useContext(LevelUpContext);
  if (!context) {
    throw new Error('useLevelUp must be used within a LevelUpProvider');
  }
  return context;
};

export const LevelUpProvider = ({ children }) => {
  const { user } = useAuth();
  const [levelUpData, setLevelUpData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!user) return;

    const handleLevelUp = (event) => {
      if (event.detail.userId === user.id) {
        setLevelUpData({
          newLevel: event.detail.newLevel,
          oldLevel: event.detail.oldLevel
        });
        setShowCelebration(true);
      }
    };

    window.addEventListener('sportea:level_up', handleLevelUp);
    return () => window.removeEventListener('sportea:level_up', handleLevelUp);
  }, [user]);

  const closeCelebration = () => {
    setShowCelebration(false);
    setLevelUpData(null);
  };

  const triggerLevelUp = (newLevel, oldLevel, additionalData = {}) => {
    setLevelUpData({
      newLevel,
      oldLevel,
      xpGained: additionalData.xpGained || 0,
      newUnlocks: additionalData.newUnlocks || [],
      userTier: additionalData.userTier || 'bronze'
    });
    setShowCelebration(true);
  };

  const value = {
    triggerLevelUp,
    closeCelebration,
    levelUpData,
    showCelebration
  };

  return (
    <LevelUpContext.Provider value={value}>
      {children}
      
      {/* Global Enhanced Level Up Modal with Suspense for lazy loading */}
      {levelUpData && (
        <Suspense fallback={<div>Loading celebration...</div>}>
          <EnhancedLevelUpModal
            open={showCelebration}
            onClose={closeCelebration}
            newLevel={levelUpData.newLevel}
            oldLevel={levelUpData.oldLevel}
            xpGained={levelUpData.xpGained || 0}
            newUnlocks={levelUpData.newUnlocks || []}
            userTier={levelUpData.userTier || 'bronze'}
          />
        </Suspense>
      )}
    </LevelUpContext.Provider>
  );
};

export default LevelUpContext;

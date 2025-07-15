import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../hooks/useAuth';

// Lazy load the LevelUpCelebration component for better performance
const LevelUpCelebration = lazy(() => import('../components/achievements/LevelUpCelebration'));

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

  const triggerLevelUp = (newLevel, oldLevel) => {
    setLevelUpData({ newLevel, oldLevel });
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
      
      {/* Global Level Up Celebration with Suspense for lazy loading */}
      {levelUpData && (
        <Suspense fallback={<div>Loading celebration...</div>}>
          <LevelUpCelebration
            open={showCelebration}
            onClose={closeCelebration}
            newLevel={levelUpData.newLevel}
            oldLevel={levelUpData.oldLevel}
          />
        </Suspense>
      )}
    </LevelUpContext.Provider>
  );
};

export default LevelUpContext;

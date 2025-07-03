import React, { createContext, useContext, useState, useEffect } from 'react';
import { LevelUpCelebration } from '../components/achievements';
import { useAuth } from '../hooks/useAuth';

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
      
      {/* Global Level Up Celebration */}
      {levelUpData && (
        <LevelUpCelebration
          open={showCelebration}
          onClose={closeCelebration}
          newLevel={levelUpData.newLevel}
          oldLevel={levelUpData.oldLevel}
        />
      )}
    </LevelUpContext.Provider>
  );
};

export default LevelUpContext;

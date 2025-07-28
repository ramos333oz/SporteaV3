import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Stack,
  Avatar
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EmojiEvents as TrophyIcon,
  Share as ShareIcon,
  TrendingUp,
  Close as CloseIcon,
  Celebration as CelebrationIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { getLevelColor, getTierInfo } from '../../services/achievementService';
import ShinyText from '../animations/ShinyText';

/**
 * Enhanced Level Up Modal Component
 * Modern, professional, and highly interactive level up celebration
 * Features glass morphism design, multi-stage animations, and tier-specific theming
 */
const EnhancedLevelUpModal = ({
  open,
  onClose,
  newLevel,
  oldLevel,
  xpGained = 0,
  newUnlocks = [],
  userTier = 'bronze'
}) => {
  const [animationStage, setAnimationStage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Get tier information and colors
  const tierInfo = useMemo(() => getTierInfo(userTier), [userTier]);
  const levelColor = useMemo(() => getLevelColor(newLevel), [newLevel]);
  const oldLevelColor = useMemo(() => getLevelColor(oldLevel), [oldLevel]);

  // Animation sequence controller
  useEffect(() => {
    if (open) {
      const sequence = [
        { stage: 1, delay: 300 },   // Modal entrance
        { stage: 2, delay: 600 },   // Trophy and title
        { stage: 3, delay: 900 },   // Level progression
        { stage: 4, delay: 1200 },  // Stats and details
        { stage: 5, delay: 1500 },  // Action buttons
        { stage: 6, delay: 1800 }   // Confetti celebration
      ];

      sequence.forEach(({ stage, delay }) => {
        setTimeout(() => {
          setAnimationStage(stage);
          if (stage === 6) setShowConfetti(true);
        }, delay);
      });
    } else {
      setAnimationStage(0);
      setShowConfetti(false);
    }
  }, [open]);

  // Handle close with animation cleanup
  const handleClose = useCallback(() => {
    setAnimationStage(0);
    setShowConfetti(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Handle share achievement
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'Level Up Achievement!',
        text: `I just reached Level ${newLevel} in Sportea! 🏆`,
        url: window.location.origin
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        `I just reached Level ${newLevel} in Sportea! 🏆 ${window.location.origin}`
      );
    }
  }, [newLevel]);

  // Animation variants
  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      filter: 'blur(10px)'
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
        duration: 0.6
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: { duration: 0.3 }
    }
  };

  const staggerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut'
      }
    })
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'transparent',
          boxShadow: 'none',
          overflow: 'visible'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                overflow: 'visible',
                position: 'relative'
              }}
            >
              {/* Close Button */}
              <IconButton
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <CloseIcon />
              </IconButton>

              <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                {/* Trophy and Title Section */}
                <AnimatePresence>
                  {animationStage >= 2 && (
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                      custom={0}
                    >
                      <Box sx={{ mb: 3, position: 'relative' }}>
                        <motion.div
                          animate={{
                            rotate: [0, -10, 10, -5, 5, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                          }}
                        >
                          <TrophyIcon
                            sx={{
                              fontSize: 80,
                              color: levelColor,
                              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
                              mb: 2
                            }}
                          />
                        </motion.div>

                        {/* Floating particles */}
                        {showConfetti && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '100%',
                              height: '100%',
                              pointerEvents: 'none'
                            }}
                          >
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ 
                                  opacity: 0, 
                                  scale: 0,
                                  x: 0,
                                  y: 0
                                }}
                                animate={{
                                  opacity: [0, 1, 0],
                                  scale: [0, 1, 0.5],
                                  x: Math.cos(i * 45 * Math.PI / 180) * 60,
                                  y: Math.sin(i * 45 * Math.PI / 180) * 60
                                }}
                                transition={{
                                  duration: 2,
                                  delay: i * 0.1,
                                  repeat: Infinity,
                                  repeatDelay: 2
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: levelColor
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>

                      <Typography 
                        variant="h3" 
                        sx={{ 
                          fontFamily: '"Libre Baskerville", Georgia, serif',
                          fontWeight: 'bold', 
                          mb: 1,
                          background: `linear-gradient(135deg, ${levelColor} 0%, ${tierInfo?.color || '#9b2c2c'} 100%)`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          textShadow: 'none'
                        }}
                      >
                        <ShinyText 
                          text="Level Up!"
                          variant="dark"
                          speed={3}
                        />
                      </Typography>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Level Progression Section */}
                <AnimatePresence>
                  {animationStage >= 3 && (
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                      custom={1}
                    >
                      <Box sx={{ mb: 4 }}>
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          justifyContent="center"
                          sx={{ mb: 2 }}
                        >
                          <Chip
                            label={`Level ${oldLevel}`}
                            sx={{
                              backgroundColor: `${oldLevelColor}20`,
                              color: oldLevelColor,
                              fontWeight: 600,
                              fontSize: '1rem',
                              px: 2,
                              py: 1
                            }}
                          />

                          <motion.div
                            animate={{ x: [0, 10, 0] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                          >
                            <TrendingUp sx={{ color: levelColor, fontSize: 32 }} />
                          </motion.div>

                          <Chip
                            label={`Level ${newLevel}`}
                            sx={{
                              backgroundColor: levelColor,
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              px: 2,
                              py: 1,
                              boxShadow: `0 4px 12px ${levelColor}40`
                            }}
                          />
                        </Stack>

                        {/* Progress visualization */}
                        <Box sx={{ width: '80%', mx: 'auto', mb: 2 }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                          >
                            <LinearProgress
                              variant="determinate"
                              value={100}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: `${levelColor}20`,
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: levelColor,
                                  borderRadius: 4
                                }
                              }}
                            />
                          </motion.div>
                        </Box>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Achievement Stats Section */}
                <AnimatePresence>
                  {animationStage >= 4 && (
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                      custom={2}
                    >
                      <Card
                        sx={{
                          background: 'rgba(255, 255, 255, 0.6)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: 3,
                          mb: 3,
                          p: 2
                        }}
                      >
                        <Stack spacing={2}>
                          {/* XP Gained */}
                          {xpGained > 0 && (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" sx={{
                                fontWeight: 700,
                                color: levelColor,
                                mb: 0.5
                              }}>
                                <ShinyText
                                  text={`+${xpGained.toLocaleString()}`}
                                  variant="dark"
                                  speed={4}
                                />
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Experience Points Gained
                              </Typography>
                            </Box>
                          )}

                          {/* Tier Information */}
                          {tierInfo && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Box sx={{ textAlign: 'center' }}>
                                {/* Tier Image */}
                                <Box sx={{ mb: 2 }}>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                                    animate={{
                                      opacity: 1,
                                      scale: 1,
                                      rotateY: 0
                                    }}
                                    transition={{
                                      type: 'spring',
                                      damping: 20,
                                      stiffness: 300,
                                      duration: 0.8
                                    }}
                                  >
                                    <Avatar
                                      src={tierInfo.iconImage}
                                      alt={`${tierInfo.name} rank`}
                                      slotProps={{
                                        img: {
                                          style: {
                                            objectFit: 'contain',
                                            width: '100%',
                                            height: '100%',
                                            transition: 'all 0.4s ease-in-out'
                                          }
                                        }
                                      }}
                                      sx={{
                                        width: 80,
                                        height: 80,
                                        mx: 'auto',
                                        mb: 1,
                                        border: `3px solid ${tierInfo.color}`,
                                        boxShadow: `0 8px 24px ${tierInfo.color}40`,
                                        background: 'transparent', // Remove background when image loads
                                        fontSize: '2rem',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                          transform: 'scale(1.05) rotateY(5deg)',
                                          boxShadow: `0 12px 32px ${tierInfo.color}60`
                                        },
                                        // Fallback background only when no image
                                        '&:not(:has(img))': {
                                          background: `linear-gradient(135deg, ${tierInfo.bgColor} 0%, ${tierInfo.color}20 100%)`
                                        }
                                      }}
                                    >
                                      {tierInfo.icon}
                                    </Avatar>
                                  </motion.div>
                                </Box>

                                {/* Tier Text */}
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                    <StarIcon sx={{ color: tierInfo.color, fontSize: 20 }} />
                                    <Typography variant="h6" sx={{
                                      fontFamily: '"Libre Baskerville", Georgia, serif',
                                      color: tierInfo.color,
                                      fontWeight: 600,
                                      textShadow: `0 2px 4px ${tierInfo.color}20`
                                    }}>
                                      {tierInfo.name.replace(' Tier', '')}
                                    </Typography>
                                    <StarIcon sx={{ color: tierInfo.color, fontSize: 20 }} />
                                  </Stack>
                                  <Typography variant="body2" color="text.secondary" sx={{
                                    mt: 0.5,
                                    fontStyle: 'italic'
                                  }}>
                                    {tierInfo.subtitle}
                                  </Typography>
                                </motion.div>
                              </Box>
                            </>
                          )}

                          {/* New Unlocks */}
                          {newUnlocks.length > 0 && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Box>
                                <Typography variant="subtitle1" sx={{
                                  fontWeight: 600,
                                  mb: 1,
                                  textAlign: 'center'
                                }}>
                                  🎉 New Unlocks
                                </Typography>
                                <Stack spacing={1}>
                                  {newUnlocks.map((unlock, index) => (
                                    <motion.div
                                      key={index}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 + 0.5 }}
                                    >
                                      <Chip
                                        label={unlock}
                                        size="small"
                                        sx={{
                                          backgroundColor: `${levelColor}15`,
                                          color: levelColor,
                                          fontWeight: 500
                                        }}
                                      />
                                    </motion.div>
                                  ))}
                                </Stack>
                              </Box>
                            </>
                          )}
                        </Stack>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons Section */}
                <AnimatePresence>
                  {animationStage >= 5 && (
                    <motion.div
                      variants={staggerVariants}
                      initial="hidden"
                      animate="visible"
                      custom={3}
                    >
                      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
                        <Button
                          variant="contained"
                          onClick={handleClose}
                          size="large"
                          sx={{
                            backgroundColor: levelColor,
                            color: 'white',
                            fontWeight: 600,
                            px: 4,
                            py: 1.5,
                            borderRadius: 3,
                            boxShadow: `0 4px 12px ${levelColor}40`,
                            '&:hover': {
                              backgroundColor: levelColor,
                              transform: 'translateY(-2px)',
                              boxShadow: `0 6px 16px ${levelColor}50`
                            },
                            transition: 'all 0.3s ease'
                          }}
                          startIcon={<CelebrationIcon />}
                        >
                          Continue Journey
                        </Button>

                        <Button
                          variant="outlined"
                          onClick={handleShare}
                          size="large"
                          sx={{
                            borderColor: levelColor,
                            color: levelColor,
                            fontWeight: 600,
                            px: 3,
                            py: 1.5,
                            borderRadius: 3,
                            '&:hover': {
                              borderColor: levelColor,
                              backgroundColor: `${levelColor}10`,
                              transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                          startIcon={<ShareIcon />}
                        >
                          Share Achievement
                        </Button>
                      </Stack>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DialogContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default EnhancedLevelUpModal;

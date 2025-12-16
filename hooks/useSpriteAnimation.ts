import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimationState } from '../types';

export type EasingType = 'linear' | 'easeOut' | 'easeInOut' | 'elastic';

interface UseSpriteAnimationProps {
  isPlaying: boolean;
  fps: number;
  cols: number; // Number of frames per row
  animationState: AnimationState;
  transitionDuration: number;
  easing?: EasingType;
}

interface AnimationData {
  currentFrame: number;
  previousAnimationState: AnimationState;
  transitionProgress: number; // Eased progress 0 to 1
  frameProgress: number; // Normalized time between frames (0 to 1) for blending
  setManualFrame: (frame: number) => void;
}

export const useSpriteAnimation = ({
  isPlaying,
  fps,
  cols,
  animationState,
  transitionDuration,
  easing = 'easeInOut'
}: UseSpriteAnimationProps): AnimationData => {
  const [currentFrame, setCurrentFrame] = useState(0);
  
  // Refs for transition logic
  const prevAnimStateRef = useRef<AnimationState>(animationState);
  const transitionStartTimeRef = useRef<number | null>(null);
  const [rawProgress, setRawProgress] = useState(1);
  const [frameProgress, setFrameProgress] = useState(0);

  // Easing functions
  const applyEasing = (t: number, type: EasingType): number => {
    switch (type) {
      case 'easeOut':
        return 1 - Math.pow(1 - t, 3);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'elastic':
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
      case 'linear':
      default:
        return t;
    }
  };

  // Handle State Changes
  useEffect(() => {
    if (animationState !== prevAnimStateRef.current) {
      transitionStartTimeRef.current = performance.now();
      setRawProgress(0); // Start transition
    }
  }, [animationState]);

  // Main Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    const interval = 1000 / fps;

    const loop = (time: number) => {
      // Calculate elapsed time since last frame switch
      const elapsed = time - lastTime;
      
      // Calculate normalized progress (0.0 to 1.0) for interpolation
      // Clamp to 1.0 to prevent overshoot before frame switch
      const progress = isPlaying ? Math.min(elapsed / interval, 1.0) : 0;
      setFrameProgress(progress);

      // 1. Update Frame Counter based on FPS
      if (elapsed > interval) {
        if (isPlaying) {
          setCurrentFrame((prev) => (prev + 1) % cols);
        }
        lastTime = time - (elapsed % interval); // Maintain sync
      }

      // 2. Calculate Transition Progress (State switching)
      if (transitionStartTimeRef.current !== null) {
        const transElapsed = time - transitionStartTimeRef.current;
        const transProgress = Math.min(transElapsed / transitionDuration, 1);
        
        setRawProgress(transProgress);

        if (transProgress >= 1) {
          transitionStartTimeRef.current = null;
          prevAnimStateRef.current = animationState; // Transition complete
        }
      } else {
        // Ensure consistent state
        if (prevAnimStateRef.current !== animationState) {
           prevAnimStateRef.current = animationState;
           setRawProgress(1);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, fps, cols, animationState, transitionDuration]);

  const setManualFrame = useCallback((frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(frame, cols - 1)));
    setFrameProgress(0);
  }, [cols]);

  return {
    currentFrame,
    previousAnimationState: prevAnimStateRef.current,
    transitionProgress: applyEasing(rawProgress, easing),
    frameProgress,
    setManualFrame
  };
};
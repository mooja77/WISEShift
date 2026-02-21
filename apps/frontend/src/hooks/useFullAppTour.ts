import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import { fullAppTourChapters } from '../config/fullAppTourChapters';
import { useResearchStore } from '../stores/researchStore';

const DEMO_CODE = 'DASH-DEMO2025';

export function useFullAppTour() {
  const navigate = useNavigate();
  const [currentChapter, setCurrentChapter] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const { setAuth, setActiveTab, authenticated } = useResearchStore();

  const destroyDriver = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const runChapter = useCallback(
    (chapterIndex: number) => {
      if (chapterIndex < 0 || chapterIndex >= fullAppTourChapters.length) {
        // Tour finished
        destroyDriver();
        setIsRunning(false);
        setCurrentChapter(-1);
        return;
      }

      const chapter = fullAppTourChapters[chapterIndex];
      setCurrentChapter(chapterIndex);

      // Navigate to the correct page
      navigate(chapter.route);

      // Handle special setup (like switching to canvas tab)
      if (chapter.setup === 'canvas') {
        if (!authenticated) {
          setAuth(DEMO_CODE);
        }
        setActiveTab('canvas');
      }

      // For research pages that need auth
      if (chapter.route === '/research' && !chapter.setup) {
        if (!authenticated) {
          setAuth(DEMO_CODE);
        }
      }

      // For dashboard, we need the auth state handled by the page itself
      // The dashboard tour will describe the code entry step

      // Build driver steps: chapter interstitial + the actual steps
      const isLastChapter = chapterIndex === fullAppTourChapters.length - 1;
      const isFirstChapter = chapterIndex === 0;

      const interstitialStep = {
        popover: {
          title: chapter.title,
          description: `${isFirstChapter ? '' : 'Moving on... '}${chapter.steps[0]?.popover?.description || ''}`,
        },
      };

      // Merge interstitial with first step (they serve the same purpose)
      // Use remaining steps as-is, then add navigation buttons to the last step
      const stepsForDriver = [
        interstitialStep,
        ...chapter.steps.slice(1),
      ];

      // Small delay to allow navigation to complete and DOM to update
      setTimeout(() => {
        destroyDriver();

        const driverInstance = driver({
          showProgress: true,
          animate: true,
          smoothScroll: true,
          allowClose: true,
          stagePadding: 4,
          stageRadius: 8,
          popoverClass: 'wiseshift-tour-popover wiseshift-full-tour',
          steps: stepsForDriver,
          onDestroyed: () => {
            // User closed the tour or it ended naturally
          },
          onNextClick: (_el, _step, opts) => {
            // If this is the last step in the chapter, go to next chapter
            if (opts.state.activeIndex === stepsForDriver.length - 1) {
              if (isLastChapter) {
                destroyDriver();
                setIsRunning(false);
                setCurrentChapter(-1);
              } else {
                runChapter(chapterIndex + 1);
              }
              return;
            }
            driverInstance.moveNext();
          },
          onPrevClick: (_el, _step, opts) => {
            // If this is the first step in the chapter and not the first chapter,
            // go to the previous chapter
            if (opts.state.activeIndex === 0 && !isFirstChapter) {
              runChapter(chapterIndex - 1);
              return;
            }
            driverInstance.movePrevious();
          },
        });

        driverRef.current = driverInstance;
        driverInstance.drive();
      }, 600);
    },
    [navigate, destroyDriver, authenticated, setAuth, setActiveTab],
  );

  const startFullTour = useCallback(() => {
    setIsRunning(true);
    runChapter(0);
  }, [runChapter]);

  const stopTour = useCallback(() => {
    destroyDriver();
    setIsRunning(false);
    setCurrentChapter(-1);
  }, [destroyDriver]);

  return {
    startFullTour,
    stopTour,
    isRunning,
    currentChapter,
    totalChapters: fullAppTourChapters.length,
  };
}

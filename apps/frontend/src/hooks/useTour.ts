import { useCallback, useMemo } from 'react';
import { driver, type DriveStep } from 'driver.js';

const TOUR_PREFIX = 'wiseshift-tour-seen-';

export function useTour(pageName: string, steps: DriveStep[]) {
  const storageKey = `${TOUR_PREFIX}${pageName}`;

  const hasSeenTour = useMemo(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  }, [storageKey]);

  const startTour = useCallback(() => {
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      stagePadding: 4,
      stageRadius: 8,
      popoverClass: 'wiseshift-tour-popover',
      steps,
      onDestroyed: () => {
        try {
          localStorage.setItem(storageKey, 'true');
        } catch {
          // ignore storage errors
        }
      },
    });

    driverInstance.drive();
  }, [steps, storageKey]);

  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { hasSeenTour, startTour, resetTour };
}

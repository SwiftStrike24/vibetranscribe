"use client";

import { useEffect, useRef } from "react";

/**
 * Component that specifically targets and removes the Next.js development indicators
 * including the lightning bolt icon showing "Static route".
 * 
 * This consolidated component uses multiple strategies to ensure all indicators are removed.
 */
export default function DisableDevOverlay() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Function to remove Next.js indicators
    const removeIndicators = () => {
      try {
        // Target all variations of the indicator classes
        const selectors = [
          '.nextjs-toast',
          '.nextjs-static-indicator-toast-wrapper',
          '[data-nextjs-toast-wrapper]',
          '[class*="nextjs-toast"]',
          '[class*="nextjs-indicator"]', 
          'div[role="status"][class*="nextjs-"]',
          '[class*="toast"]',
          '[class*="overlay"]',
          '[class*="dev-indicator"]',
          '[class*="build-error"]',
          '[class*="hot-update"]',
          '[id*="__next-build-watcher"]',
          '[id*="__webpack-hot-middleware-client"]',
          '[id*="react-refresh"]'
        ];
        
        // Try to find and remove each type of indicator
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && element.parentNode) {
              element.parentNode.removeChild(element);
            }
          });
        });
        
        // Also try to click any close buttons
        const closeButtons = document.querySelectorAll('.nextjs-toast-hide-button, [class*="close"], [class*="dismiss"]');
        closeButtons.forEach(button => {
          if (button instanceof HTMLElement) {
            button.click();
          }
        });
        
        // Add a style tag to ensure indicators stay hidden
        if (!document.getElementById('disable-dev-overlay-style')) {
          const style = document.createElement('style');
          style.id = 'disable-dev-overlay-style';
          style.textContent = `
            .nextjs-toast, .nextjs-static-indicator-toast-wrapper, [data-nextjs-toast-wrapper],
            [class*="nextjs-"], div[role="status"][class*="nextjs-"], div[class*="nextjs-toast"],
            div[class*="indicator"], div[class*="toast"], div[class*="overlay"],
            div[class*="dev-indicator"], div[class*="build-error"], div[class*="hot-update"],
            [id*="__next-build-watcher"], [id*="__webpack-hot-middleware-client"], [id*="react-refresh"] {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
              width: 0 !important;
              height: 0 !important;
              position: absolute !important;
              left: -9999px !important;
              top: -9999px !important;
              z-index: -9999 !important;
              overflow: hidden !important;
            }
            
            html, body {
              background-color: transparent !important;
            }
          `;
          document.head.appendChild(style);
        }
      } catch (e) {
        console.error("Error removing dev indicators:", e);
      }
    };
    
    // Run immediately and after a short delay (to catch any that appear during startup)
    removeIndicators();
    const initialTimeoutId = setTimeout(removeIndicators, 100);
    
    // Then run periodically with increasing frequency at the beginning
    const timeouts = [200, 300, 500, 1000];
    timeouts.forEach(timeout => {
      setTimeout(removeIndicators, timeout);
    });
    
    // Then run periodically
    intervalRef.current = setInterval(removeIndicators, 500);
    
    // Also run when DOM changes
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          removeIndicators();
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Clean up
    return () => {
      clearTimeout(initialTimeoutId);
      timeouts.forEach(timeout => clearTimeout(timeout));
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      observer.disconnect();
    };
  }, []);
  
  return null;
} 
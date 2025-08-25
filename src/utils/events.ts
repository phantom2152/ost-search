export const EVENTS = {
    SUBTITLE_SELECTED: 'subtitle-selected',
    SUBTITLE_REMOVED: 'subtitle-removed', // Add this new event
    SELECTION_CLEARED: 'selection-cleared',
    SEARCH_COMPLETED: 'search-completed',
    SHOW_TOAST: 'show-toast',
  } as const;
  
  export class EventBus {
    static emit(eventName: string, data?: any): void {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  
    static on(eventName: string, callback: (event: CustomEvent) => void): void {
      window.addEventListener(eventName, callback as EventListener);
    }
  
    static off(eventName: string, callback: (event: CustomEvent) => void): void {
      window.removeEventListener(eventName, callback as EventListener);
    }
  }
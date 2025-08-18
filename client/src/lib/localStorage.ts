// Local Storage utility for WhatsApp Pro
export interface LocalStorageKeys {
  'whatsapp_settings': {
    token?: string;
    phoneNumberId?: string;
    verifyToken?: string;
    businessAccountId?: string;
  };
  'general_settings': {
    businessName?: string;
    timezone?: string;
    theme?: 'light' | 'dark';
  };
  'user_preferences': {
    sidebarCollapsed?: boolean;
    defaultMessageType?: 'text' | 'template';
    autoRefreshInterval?: number;
  };
  'draft_messages': {
    [contactId: string]: string;
  };
  'campaign_drafts': Array<{
    id: string;
    name: string;
    templateId: string;
    recipients: string[];
    parameters: any[];
    createdAt: string;
  }>;
}

class LocalStorageManager {
  private prefix = 'whatsapp_pro_';

  // Generic get method with type safety
  get<K extends keyof LocalStorageKeys>(key: K): LocalStorageKeys[K] | null {
    try {
      const item = window.localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return null;
    }
  }

  // Generic set method with type safety
  set<K extends keyof LocalStorageKeys>(key: K, value: LocalStorageKeys[K]): void {
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }

  // Remove a specific key
  remove<K extends keyof LocalStorageKeys>(key: K): void {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error(`Error removing from localStorage for key ${key}:`, error);
    }
  }

  // Clear all WhatsApp Pro data
  clearAll(): void {
    try {
      const keys = Object.keys(window.localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          window.localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // Get all stored keys for debugging
  getAllKeys(): string[] {
    try {
      return Object.keys(window.localStorage).filter(key => key.startsWith(this.prefix));
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }

  // Check if localStorage is available
  isAvailable(): boolean {
    try {
      const test = 'localStorage_test';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get storage usage information
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let key in window.localStorage) {
        if (window.localStorage.hasOwnProperty(key)) {
          used += (window.localStorage[key] as string).length + key.length;
        }
      }
      
      // Most browsers allow 5-10MB, we'll use 5MB as conservative estimate
      const available = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // Save draft message for a contact
  saveDraftMessage(contactId: string, message: string): void {
    const drafts = this.get('draft_messages') || {};
    drafts[contactId] = message;
    this.set('draft_messages', drafts);
  }

  // Get draft message for a contact
  getDraftMessage(contactId: string): string | null {
    const drafts = this.get('draft_messages') || {};
    return drafts[contactId] || null;
  }

  // Clear draft message for a contact
  clearDraftMessage(contactId: string): void {
    const drafts = this.get('draft_messages') || {};
    delete drafts[contactId];
    this.set('draft_messages', drafts);
  }

  // Save campaign draft
  saveCampaignDraft(draft: LocalStorageKeys['campaign_drafts'][0]): void {
    const drafts = this.get('campaign_drafts') || [];
    const existingIndex = drafts.findIndex(d => d.id === draft.id);
    
    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.push(draft);
    }
    
    this.set('campaign_drafts', drafts);
  }

  // Get all campaign drafts
  getCampaignDrafts(): LocalStorageKeys['campaign_drafts'] {
    return this.get('campaign_drafts') || [];
  }

  // Delete campaign draft
  deleteCampaignDraft(draftId: string): void {
    const drafts = this.get('campaign_drafts') || [];
    const filtered = drafts.filter(d => d.id !== draftId);
    this.set('campaign_drafts', filtered);
  }
}

// Export a singleton instance
export const localStorage = new LocalStorageManager();

// Hook for React components to use localStorage with reactive updates
import { useState, useEffect } from 'react';

export function useLocalStorage<K extends keyof LocalStorageKeys>(
  key: K,
  defaultValue: LocalStorageKeys[K]
): [LocalStorageKeys[K], (value: LocalStorageKeys[K]) => void] {
  const [value, setValue] = useState<LocalStorageKeys[K]>(() => {
    return localStorage.get(key) ?? defaultValue;
  });

  const setStoredValue = (newValue: LocalStorageKeys[K]) => {
    setValue(newValue);
    localStorage.set(key, newValue);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'whatsapp_pro_' + key) {
        setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue]);

  return [value, setStoredValue];
}
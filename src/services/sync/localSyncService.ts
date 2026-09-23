import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';
import { optimizeSquadForStorage } from '../../utils/routeOptimizer';

type SquadListener = (squad: Squad | null) => void;
type MembersListener = (members: SquadMember[]) => void;
type MessagesListener = (messages: ChatMessage[]) => void;
type SuggestionsListener = (suggestions: PlaceSuggestion[]) => void;

class LocalSyncService {
  private channel: BroadcastChannel | null = null;
  private squadListeners: Map<string, Set<SquadListener>> = new Map();
  private membersListeners: Map<string, Set<MembersListener>> = new Map();
  private messagesListeners: Map<string, Set<MessagesListener>> = new Map();
  private suggestionsListeners: Map<string, Set<SuggestionsListener>> = new Map();

  // In-memory fallback caches so operations succeed even if localStorage quota is exceeded
  private memorySquads: Map<string, Squad> = new Map();
  private memoryMembers: Map<string, SquadMember[]> = new Map();
  private memoryMessages: Map<string, ChatMessage[]> = new Map();
  private memorySuggestions: Map<string, PlaceSuggestion[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('squadnav_sync_channel');
      this.channel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }

    // Listen to storage events for cross-tab updates as fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('squadnav_')) {
          const parts = e.key.split('_');
          const squadId = parts[parts.length - 1];
          if (squadId) {
            this.broadcastLocalState(squadId);
          }
        }
      });
    }

    // Periodic heartbeat checker to flag members as offline if inactive > 45s
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.checkMemberHeartbeats();
      }, 10000);
    }
  }

  private handleIncomingMessage(data: any) {
    if (!data || !data.type || !data.squadId) return;

    const { type, squadId, payload } = data;

    switch (type) {
      case 'SQUAD_UPDATED':
        if (payload) this.memorySquads.set(squadId, payload);
        this.notifySquadListeners(squadId, payload);
        break;
      case 'MEMBERS_UPDATED':
        if (payload) this.memoryMembers.set(squadId, payload);
        this.notifyMembersListeners(squadId, payload);
        break;
      case 'MESSAGES_UPDATED':
        if (payload) this.memoryMessages.set(squadId, payload);
        this.notifyMessagesListeners(squadId, payload);
        break;
      case 'SUGGESTIONS_UPDATED':
        if (payload) this.memorySuggestions.set(squadId, payload);
        this.notifySuggestionsListeners(squadId, payload);
        break;
    }
  }

  private broadcast(type: string, squadId: string, payload: any) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, squadId, payload });
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }
  }

  private getStorageKey(type: string, squadId: string): string {
    return `squadnav_${type}_${squadId}`;
  }

  private cleanupOldStorage(keepSquadId?: string) {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('squadnav_') && key !== 'squadnav_user') {
          if (!keepSquadId || !key.includes(keepSquadId)) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  // SQUAD OPERATIONS
  saveSquad(squad: Squad) {
    const optimized = optimizeSquadForStorage(squad);
    this.memorySquads.set(squad.squadId, optimized);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey('squad', squad.squadId), JSON.stringify(optimized));
      } catch (err) {
        console.warn('LocalStorage quota exceeded or unavailable while saving squad. Cleaning cache...', err);
        this.cleanupOldStorage(squad.squadId);
        try {
          localStorage.setItem(this.getStorageKey('squad', squad.squadId), JSON.stringify(optimized));
        } catch (retryErr) {
          console.warn('LocalStorage save failed after cleanup, continuing with in-memory state:', retryErr);
        }
      }
    }

    this.notifySquadListeners(squad.squadId, optimized);
    this.broadcast('SQUAD_UPDATED', squad.squadId, optimized);
  }

  getSquad(squadId: string): Squad | null {
    if (this.memorySquads.has(squadId)) {
      return this.memorySquads.get(squadId)!;
    }

    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.getStorageKey('squad', squadId));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      this.memorySquads.set(squadId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  subscribeToSquad(squadId: string, callback: SquadListener): () => void {
    if (!this.squadListeners.has(squadId)) {
      this.squadListeners.set(squadId, new Set());
    }
    this.squadListeners.get(squadId)!.add(callback);

    // Immediately trigger with current data
    const current = this.getSquad(squadId);
    callback(current);

    return () => {
      this.squadListeners.get(squadId)?.delete(callback);
    };
  }

  private notifySquadListeners(squadId: string, squad: Squad | null) {
    const listeners = this.squadListeners.get(squadId);
    if (listeners) {
      listeners.forEach((cb) => cb(squad));
    }
  }

  // MEMBERS OPERATIONS
  getMembers(squadId: string): SquadMember[] {
    if (this.memoryMembers.has(squadId)) {
      return this.memoryMembers.get(squadId)!;
    }

    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey('members', squadId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      this.memoryMembers.set(squadId, parsed);
      return parsed;
    } catch {
      return [];
    }
  }

  saveMembers(squadId: string, members: SquadMember[]) {
    this.memoryMembers.set(squadId, members);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey('members', squadId), JSON.stringify(members));
      } catch (err) {
        console.warn('LocalStorage saveMembers error:', err);
      }
    }

    this.notifyMembersListeners(squadId, members);
    this.broadcast('MEMBERS_UPDATED', squadId, members);
  }

  updateMember(squadId: string, member: SquadMember) {
    const members = this.getMembers(squadId);
    const index = members.findIndex((m) => m.userId === member.userId);
    if (index >= 0) {
      members[index] = { ...members[index], ...member, lastUpdated: Date.now() };
    } else {
      members.push({ ...member, lastUpdated: Date.now() });
    }
    this.saveMembers(squadId, members);
  }

  removeMember(squadId: string, userId: string) {
    const members = this.getMembers(squadId).filter((m) => m.userId !== userId);
    this.saveMembers(squadId, members);
  }

  subscribeToMembers(squadId: string, callback: MembersListener): () => void {
    if (!this.membersListeners.has(squadId)) {
      this.membersListeners.set(squadId, new Set());
    }
    this.membersListeners.get(squadId)!.add(callback);

    // Initial trigger
    callback(this.getMembers(squadId));

    return () => {
      this.membersListeners.get(squadId)?.delete(callback);
    };
  }

  private notifyMembersListeners(squadId: string, members: SquadMember[]) {
    const listeners = this.membersListeners.get(squadId);
    if (listeners) {
      listeners.forEach((cb) => cb(members));
    }
  }

  private checkMemberHeartbeats() {
    this.membersListeners.forEach((_, squadId) => {
      const members = this.getMembers(squadId);
      let changed = false;
      const now = Date.now();

      const updated = members.map((m) => {
        // If inactive for > 45 seconds, mark offline
        if (m.online && now - m.lastUpdated > 45000) {
          changed = true;
          return { ...m, online: false, status: 'offline' as const };
        }
        return m;
      });

      if (changed) {
        this.saveMembers(squadId, updated);
      }
    });
  }

  // MESSAGES OPERATIONS
  getMessages(squadId: string): ChatMessage[] {
    if (this.memoryMessages.has(squadId)) {
      return this.memoryMessages.get(squadId)!;
    }

    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey('messages', squadId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      this.memoryMessages.set(squadId, parsed);
      return parsed;
    } catch {
      return [];
    }
  }

  sendMessage(squadId: string, message: ChatMessage) {
    const messages = this.getMessages(squadId);
    messages.push(message);
    this.memoryMessages.set(squadId, messages);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey('messages', squadId), JSON.stringify(messages));
      } catch (err) {
        console.warn('LocalStorage sendMessage error:', err);
      }
    }

    this.notifyMessagesListeners(squadId, messages);
    this.broadcast('MESSAGES_UPDATED', squadId, messages);
  }

  subscribeToMessages(squadId: string, callback: MessagesListener): () => void {
    if (!this.messagesListeners.has(squadId)) {
      this.messagesListeners.set(squadId, new Set());
    }
    this.messagesListeners.get(squadId)!.add(callback);

    callback(this.getMessages(squadId));

    return () => {
      this.messagesListeners.get(squadId)?.delete(callback);
    };
  }

  private notifyMessagesListeners(squadId: string, messages: ChatMessage[]) {
    const listeners = this.messagesListeners.get(squadId);
    if (listeners) {
      listeners.forEach((cb) => cb(messages));
    }
  }

  // SUGGESTIONS OPERATIONS
  getSuggestions(squadId: string): PlaceSuggestion[] {
    if (this.memorySuggestions.has(squadId)) {
      return this.memorySuggestions.get(squadId)!;
    }

    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.getStorageKey('suggestions', squadId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      this.memorySuggestions.set(squadId, parsed);
      return parsed;
    } catch {
      return [];
    }
  }

  saveSuggestion(squadId: string, suggestion: PlaceSuggestion) {
    const suggestions = this.getSuggestions(squadId);
    const index = suggestions.findIndex((s) => s.id === suggestion.id);
    if (index >= 0) {
      suggestions[index] = suggestion;
    } else {
      suggestions.push(suggestion);
    }
    this.memorySuggestions.set(squadId, suggestions);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey('suggestions', squadId), JSON.stringify(suggestions));
      } catch (err) {
        console.warn('LocalStorage saveSuggestion error:', err);
      }
    }

    this.notifySuggestionsListeners(squadId, suggestions);
    this.broadcast('SUGGESTIONS_UPDATED', squadId, suggestions);
  }

  voteSuggestion(squadId: string, suggestionId: string, userId: string, vote: boolean) {
    const suggestions = this.getSuggestions(squadId);
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      suggestion.votes[userId] = vote;
      this.saveSuggestion(squadId, suggestion);
    }
  }

  subscribeToSuggestions(squadId: string, callback: SuggestionsListener): () => void {
    if (!this.suggestionsListeners.has(squadId)) {
      this.suggestionsListeners.set(squadId, new Set());
    }
    this.suggestionsListeners.get(squadId)!.add(callback);

    callback(this.getSuggestions(squadId));

    return () => {
      this.suggestionsListeners.get(squadId)?.delete(callback);
    };
  }

  private notifySuggestionsListeners(squadId: string, suggestions: PlaceSuggestion[]) {
    const listeners = this.suggestionsListeners.get(squadId);
    if (listeners) {
      listeners.forEach((cb) => cb(suggestions));
    }
  }

  // REGROUP OPERATIONS
  setRegroupPoint(squadId: string, regroupPoint: RegroupPoint | null) {
    const squad = this.getSquad(squadId);
    if (squad) {
      squad.activeRegroupPoint = regroupPoint;
      this.saveSquad(squad);
    }
  }

  private broadcastLocalState(squadId: string) {
    this.notifySquadListeners(squadId, this.getSquad(squadId));
    this.notifyMembersListeners(squadId, this.getMembers(squadId));
    this.notifyMessagesListeners(squadId, this.getMessages(squadId));
    this.notifySuggestionsListeners(squadId, this.getSuggestions(squadId));
  }
}

export const localSyncService = new LocalSyncService();

import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';

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
          this.broadcastLocalState(e.key.replace('squadnav_', ''));
        }
      });
    }

    // Periodic heartbeat checker to flag members as offline if inactive > 60s
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
        this.notifySquadListeners(squadId, payload);
        break;
      case 'MEMBERS_UPDATED':
        this.notifyMembersListeners(squadId, payload);
        break;
      case 'MESSAGES_UPDATED':
        this.notifyMessagesListeners(squadId, payload);
        break;
      case 'SUGGESTIONS_UPDATED':
        this.notifySuggestionsListeners(squadId, payload);
        break;
    }
  }

  private broadcast(type: string, squadId: string, payload: any) {
    if (this.channel) {
      this.channel.postMessage({ type, squadId, payload });
    }
  }

  private getStorageKey(type: string, squadId: string): string {
    return `squadnav_${type}_${squadId}`;
  }

  // SQUAD OPERATIONS
  saveSquad(squad: Squad) {
    localStorage.setItem(this.getStorageKey('squad', squad.squadId), JSON.stringify(squad));
    this.notifySquadListeners(squad.squadId, squad);
    this.broadcast('SQUAD_UPDATED', squad.squadId, squad);
  }

  getSquad(squadId: string): Squad | null {
    const raw = localStorage.getItem(this.getStorageKey('squad', squadId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
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
    const raw = localStorage.getItem(this.getStorageKey('members', squadId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveMembers(squadId: string, members: SquadMember[]) {
    localStorage.setItem(this.getStorageKey('members', squadId), JSON.stringify(members));
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
    const raw = localStorage.getItem(this.getStorageKey('messages', squadId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  sendMessage(squadId: string, message: ChatMessage) {
    const messages = this.getMessages(squadId);
    messages.push(message);
    localStorage.setItem(this.getStorageKey('messages', squadId), JSON.stringify(messages));
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
    const raw = localStorage.getItem(this.getStorageKey('suggestions', squadId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
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
    localStorage.setItem(this.getStorageKey('suggestions', squadId), JSON.stringify(suggestions));
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

import { db, isFirebaseConfigured } from './firebaseConfig';
import { localSyncService } from '../sync/localSyncService';
import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';

const cleanForFirestore = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const withTimeout = <T>(promise: Promise<T>, ms = 2000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
};

export class SquadDataService {
  // SQUAD
  async saveSquad(squad: Squad): Promise<void> {
    // 1. Immediately persist locally so UI is never blocked
    localSyncService.saveSquad(squad);

    // 2. Sync to Firestore in background / with timeout
    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(setDoc(doc(db, 'squads', squad.squadId), cleanForFirestore(squad)), 2000);
      } catch (err) {
        console.warn('Firestore saveSquad error/timeout, operating in local sync mode:', err);
      }
    }
  }

  async getSquad(squadId: string): Promise<Squad | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await withTimeout(getDoc(doc(db, 'squads', squadId)), 2000);
        if (snap.exists()) {
          return snap.data() as Squad;
        }
      } catch (err) {
        console.warn('Firestore getSquad error/timeout, falling back to local storage:', err);
      }
    }
    return localSyncService.getSquad(squadId);
  }

  subscribeToSquad(squadId: string, callback: (squad: Squad | null) => void): () => void {
    const unsubLocal = localSyncService.subscribeToSquad(squadId, callback);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(
          doc(db, 'squads', squadId),
          (snap) => {
            if (snap.exists()) {
              callback(snap.data() as Squad);
            }
          },
          (err) => {
            console.warn('Firestore subscribeToSquad warning:', err);
          }
        );
      } catch (err) {
        console.warn('Firestore subscribeToSquad init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (unsubFirestore) unsubFirestore();
    };
  }

  // MEMBERS
  async getMembers(squadId: string): Promise<SquadMember[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const snapshot = await withTimeout(getDocs(collection(db, 'squads', squadId, 'members')), 2000);
        const members: SquadMember[] = [];
        snapshot.forEach((docSnap) => {
          members.push(docSnap.data() as SquadMember);
        });
        if (members.length > 0) return members;
      } catch (err) {
        console.warn('Firestore getMembers error/timeout:', err);
      }
    }
    return localSyncService.getMembers(squadId);
  }

  async updateMember(squadId: string, member: SquadMember): Promise<void> {
    localSyncService.updateMember(squadId, member);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(setDoc(doc(db, 'squads', squadId, 'members', member.userId), cleanForFirestore(member)), 2000);
      } catch (err) {
        // Silently warn to avoid console flood during GPS movement
      }
    }
  }

  async removeMember(squadId: string, userId: string): Promise<void> {
    localSyncService.removeMember(squadId, userId);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(deleteDoc(doc(db, 'squads', squadId, 'members', userId)), 2000);
      } catch (err) {
        console.warn('Firestore removeMember error/timeout:', err);
      }
    }
  }

  subscribeToMembers(squadId: string, callback: (members: SquadMember[]) => void): () => void {
    const unsubLocal = localSyncService.subscribeToMembers(squadId, callback);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(
          collection(db, 'squads', squadId, 'members'),
          (snapshot) => {
            const members: SquadMember[] = [];
            snapshot.forEach((docSnap) => {
              members.push(docSnap.data() as SquadMember);
            });
            if (members.length > 0) {
              callback(members);
            }
          },
          (err) => {
            console.warn('Firestore subscribeToMembers warning:', err);
          }
        );
      } catch (err) {
        console.warn('Firestore subscribeToMembers init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (unsubFirestore) unsubFirestore();
    };
  }

  // MESSAGES
  async sendMessage(squadId: string, message: ChatMessage): Promise<void> {
    localSyncService.sendMessage(squadId, message);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(addDoc(collection(db, 'squads', squadId, 'messages'), cleanForFirestore(message)), 2000);
      } catch (err) {
        console.warn('Firestore sendMessage error/timeout:', err);
      }
    }
  }

  subscribeToMessages(squadId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const unsubLocal = localSyncService.subscribeToMessages(squadId, callback);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(
          collection(db, 'squads', squadId, 'messages'),
          (snapshot) => {
            const messages: ChatMessage[] = [];
            snapshot.forEach((docSnap) => {
              messages.push({ ...docSnap.data(), id: docSnap.id } as ChatMessage);
            });
            messages.sort((a, b) => a.timestamp - b.timestamp);
            if (messages.length > 0) {
              callback(messages);
            }
          },
          (err) => {
            console.warn('Firestore subscribeToMessages warning:', err);
          }
        );
      } catch (err) {
        console.warn('Firestore subscribeToMessages init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (unsubFirestore) unsubFirestore();
    };
  }

  // SUGGESTIONS
  async saveSuggestion(squadId: string, suggestion: PlaceSuggestion): Promise<void> {
    localSyncService.saveSuggestion(squadId, suggestion);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(setDoc(doc(db, 'squads', squadId, 'suggestions', suggestion.id), cleanForFirestore(suggestion)), 2000);
      } catch (err) {
        console.warn('Firestore saveSuggestion error/timeout:', err);
      }
    }
  }

  async voteSuggestion(squadId: string, suggestionId: string, userId: string, vote: boolean): Promise<void> {
    localSyncService.voteSuggestion(squadId, suggestionId, userId, vote);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          updateDoc(doc(db, 'squads', squadId, 'suggestions', suggestionId), {
            [`votes.${userId}`]: vote
          }),
          2000
        );
      } catch (err) {
        console.warn('Firestore voteSuggestion error/timeout:', err);
      }
    }
  }

  subscribeToSuggestions(squadId: string, callback: (suggestions: PlaceSuggestion[]) => void): () => void {
    const unsubLocal = localSyncService.subscribeToSuggestions(squadId, callback);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(
          collection(db, 'squads', squadId, 'suggestions'),
          (snapshot) => {
            const suggestions: PlaceSuggestion[] = [];
            snapshot.forEach((docSnap) => {
              suggestions.push({ ...docSnap.data(), id: docSnap.id } as PlaceSuggestion);
            });
            if (suggestions.length > 0) {
              callback(suggestions);
            }
          },
          (err) => {
            console.warn('Firestore subscribeToSuggestions warning:', err);
          }
        );
      } catch (err) {
        console.warn('Firestore subscribeToSuggestions init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (unsubFirestore) unsubFirestore();
    };
  }

  // REGROUP
  async setRegroupPoint(squadId: string, regroupPoint: RegroupPoint | null): Promise<void> {
    localSyncService.setRegroupPoint(squadId, regroupPoint);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          updateDoc(doc(db, 'squads', squadId), {
            activeRegroupPoint: regroupPoint
          }),
          2000
        );
      } catch (err) {
        console.warn('Firestore setRegroupPoint error/timeout:', err);
      }
    }
  }
}

export const squadDataService = new SquadDataService();

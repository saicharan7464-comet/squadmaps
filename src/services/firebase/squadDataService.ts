import { db, isFirebaseConfigured } from './firebaseConfig';
import { localSyncService } from '../sync/localSyncService';
import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';
import { optimizeSquadForStorage } from '../../utils/routeOptimizer';
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

const withTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T | void> => {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms))
  ]);
};

export class SquadDataService {
  // SQUAD
  async saveSquad(squad: Squad): Promise<void> {
    const optimized = optimizeSquadForStorage(squad);

    // 1. Immediately update local storage & broadcast channel so the user is never blocked
    localSyncService.saveSquad(optimized);

    // 2. Persist to Firestore with a safety timeout so network hangs never freeze the app
    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          setDoc(doc(db, 'squads', squad.squadId), cleanForFirestore(optimized)),
          3500
        );
      } catch (err) {
        console.warn('Firestore saveSquad error:', err);
      }
    }
  }

  async getSquad(squadId: string): Promise<Squad | null> {
    // Check local sync first for fast cache
    const local = localSyncService.getSquad(squadId);
    if (local) return local;

    if (isFirebaseConfigured() && db) {
      try {
        const snap = await withTimeout(getDoc(doc(db, 'squads', squadId)), 3500);
        if (snap && snap.exists()) {
          const squad = snap.data() as Squad;
          localSyncService.saveSquad(squad);
          return squad;
        }
      } catch (err) {
        console.warn('Firestore getSquad error:', err);
      }
    }
    return null;
  }

  subscribeToSquad(squadId: string, callback: (squad: Squad | null) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(doc(db, 'squads', squadId), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Squad;
            callback(data);
          }
        }, (err) => {
          console.warn('Firestore subscribeToSquad error:', err);
        });
      } catch (err) {
        console.warn('Firestore subscribeToSquad init error:', err);
      }
    }

    const unsubLocal = localSyncService.subscribeToSquad(squadId, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // MEMBERS
  async getMembers(squadId: string): Promise<SquadMember[]> {
    const local = localSyncService.getMembers(squadId);
    if (local && local.length > 0) return local;

    if (isFirebaseConfigured() && db) {
      try {
        const snapshot = await withTimeout(getDocs(collection(db, 'squads', squadId, 'members')), 3500);
        if (snapshot) {
          const members: SquadMember[] = [];
          snapshot.forEach((docSnap) => {
            members.push(docSnap.data() as SquadMember);
          });
          if (members.length > 0) {
            localSyncService.saveMembers(squadId, members);
            return members;
          }
        }
      } catch (err) {
        console.warn('Firestore getMembers error:', err);
      }
    }
    return local || [];
  }

  async updateMember(squadId: string, member: SquadMember): Promise<void> {
    localSyncService.updateMember(squadId, member);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          setDoc(doc(db, 'squads', squadId, 'members', member.userId), cleanForFirestore(member)),
          3500
        );
      } catch (err) {
        console.warn('Firestore updateMember error:', err);
      }
    }
  }

  async removeMember(squadId: string, userId: string): Promise<void> {
    localSyncService.removeMember(squadId, userId);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(deleteDoc(doc(db, 'squads', squadId, 'members', userId)), 3500);
      } catch (err) {
        console.warn('Firestore removeMember error:', err);
      }
    }
  }

  subscribeToMembers(squadId: string, callback: (members: SquadMember[]) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', squadId, 'members'), (snapshot) => {
          const members: SquadMember[] = [];
          snapshot.forEach((docSnap) => {
            members.push(docSnap.data() as SquadMember);
          });
          callback(members);
        }, (err) => {
          console.warn('Firestore subscribeToMembers error:', err);
        });
      } catch (err) {
        console.warn('Firestore subscribeToMembers init error:', err);
      }
    }

    const unsubLocal = localSyncService.subscribeToMembers(squadId, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // MESSAGES
  async sendMessage(squadId: string, message: ChatMessage): Promise<void> {
    localSyncService.sendMessage(squadId, message);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          addDoc(collection(db, 'squads', squadId, 'messages'), cleanForFirestore(message)),
          3500
        );
      } catch (err) {
        console.warn('Firestore sendMessage error:', err);
      }
    }
  }

  subscribeToMessages(squadId: string, callback: (messages: ChatMessage[]) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', squadId, 'messages'), (snapshot) => {
          const messages: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            messages.push({ ...docSnap.data(), id: docSnap.id } as ChatMessage);
          });
          messages.sort((a, b) => a.timestamp - b.timestamp);
          callback(messages);
        }, (err) => {
          console.warn('Firestore subscribeToMessages error:', err);
        });
      } catch (err) {
        console.warn('Firestore subscribeToMessages init error:', err);
      }
    }

    const unsubLocal = localSyncService.subscribeToMessages(squadId, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // SUGGESTIONS
  async saveSuggestion(squadId: string, suggestion: PlaceSuggestion): Promise<void> {
    localSyncService.saveSuggestion(squadId, suggestion);

    if (isFirebaseConfigured() && db) {
      try {
        await withTimeout(
          setDoc(doc(db, 'squads', squadId, 'suggestions', suggestion.id), cleanForFirestore(suggestion)),
          3500
        );
      } catch (err) {
        console.warn('Firestore saveSuggestion error:', err);
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
          3500
        );
      } catch (err) {
        console.warn('Firestore voteSuggestion error:', err);
      }
    }
  }

  subscribeToSuggestions(squadId: string, callback: (suggestions: PlaceSuggestion[]) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', squadId, 'suggestions'), (snapshot) => {
          const suggestions: PlaceSuggestion[] = [];
          snapshot.forEach((docSnap) => {
            suggestions.push({ ...docSnap.data(), id: docSnap.id } as PlaceSuggestion);
          });
          callback(suggestions);
        }, (err) => {
          console.warn('Firestore subscribeToSuggestions error:', err);
        });
      } catch (err) {
        console.warn('Firestore subscribeToSuggestions init error:', err);
      }
    }

    const unsubLocal = localSyncService.subscribeToSuggestions(squadId, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
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
          3500
        );
      } catch (err) {
        console.warn('Firestore setRegroupPoint error:', err);
      }
    }
  }
}

export const squadDataService = new SquadDataService();

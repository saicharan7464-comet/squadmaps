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

export class SquadDataService {
  // SQUAD
  async saveSquad(squad: Squad): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'squads', squad.squadId), cleanForFirestore(squad));
      } catch (err) {
        console.warn('Firestore saveSquad error:', err);
      }
    }
    localSyncService.saveSquad(squad);
  }


  async getSquad(squadId: string): Promise<Squad | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDoc(doc(db, 'squads', squadId));
        if (snap.exists()) {
          return snap.data() as Squad;
        }
      } catch (err) {
        console.warn('Firestore getSquad error:', err);
      }
    }
    return localSyncService.getSquad(squadId);
  }

  subscribeToSquad(squadId: string, callback: (squad: Squad | null) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const unsubscribe = onSnapshot(doc(db, 'squads', squadId), (snap) => {
          if (snap.exists()) {
            callback(snap.data() as Squad);
          } else {
            callback(null);
          }
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Firestore subscribeToSquad error:', err);
      }
    }
    return localSyncService.subscribeToSquad(squadId, callback);
  }

  // MEMBERS
  async getMembers(squadId: string): Promise<SquadMember[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const snapshot = await getDocs(collection(db, 'squads', squadId, 'members'));
        const members: SquadMember[] = [];
        snapshot.forEach((docSnap) => {
          members.push(docSnap.data() as SquadMember);
        });
        return members;
      } catch (err) {
        console.warn('Firestore getMembers error:', err);
      }
    }
    return localSyncService.getMembers(squadId);
  }

  async updateMember(squadId: string, member: SquadMember): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'squads', squadId, 'members', member.userId), cleanForFirestore(member));
      } catch (err) {
        console.warn('Firestore updateMember error:', err);
      }
    }
    localSyncService.updateMember(squadId, member);
  }

  async removeMember(squadId: string, userId: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'squads', squadId, 'members', userId));
      } catch (err) {
        console.warn('Firestore removeMember error:', err);
      }
    }
    localSyncService.removeMember(squadId, userId);
  }

  subscribeToMembers(squadId: string, callback: (members: SquadMember[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'squads', squadId, 'members'), (snapshot) => {
          const members: SquadMember[] = [];
          snapshot.forEach((docSnap) => {
            members.push(docSnap.data() as SquadMember);
          });
          callback(members);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Firestore subscribeToMembers error:', err);
      }
    }
    return localSyncService.subscribeToMembers(squadId, callback);
  }

  // MESSAGES
  async sendMessage(squadId: string, message: ChatMessage): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await addDoc(collection(db, 'squads', squadId, 'messages'), cleanForFirestore(message));
      } catch (err) {
        console.warn('Firestore sendMessage error:', err);
      }
    }
    localSyncService.sendMessage(squadId, message);
  }

  subscribeToMessages(squadId: string, callback: (messages: ChatMessage[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'squads', squadId, 'messages'), (snapshot) => {
          const messages: ChatMessage[] = [];
          snapshot.forEach((docSnap) => {
            messages.push({ ...docSnap.data(), id: docSnap.id } as ChatMessage);
          });
          // Sort by timestamp
          messages.sort((a, b) => a.timestamp - b.timestamp);
          callback(messages);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Firestore subscribeToMessages error:', err);
      }
    }
    return localSyncService.subscribeToMessages(squadId, callback);
  }

  // SUGGESTIONS
  async saveSuggestion(squadId: string, suggestion: PlaceSuggestion): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'squads', squadId, 'suggestions', suggestion.id), cleanForFirestore(suggestion));
      } catch (err) {
        console.warn('Firestore saveSuggestion error:', err);
      }
    }
    localSyncService.saveSuggestion(squadId, suggestion);
  }

  async voteSuggestion(squadId: string, suggestionId: string, userId: string, vote: boolean): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'squads', squadId, 'suggestions', suggestionId), {
          [`votes.${userId}`]: vote
        });
      } catch (err) {
        console.warn('Firestore voteSuggestion error:', err);
      }
    }
    localSyncService.voteSuggestion(squadId, suggestionId, userId, vote);
  }

  subscribeToSuggestions(squadId: string, callback: (suggestions: PlaceSuggestion[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'squads', squadId, 'suggestions'), (snapshot) => {
          const suggestions: PlaceSuggestion[] = [];
          snapshot.forEach((docSnap) => {
            suggestions.push({ ...docSnap.data(), id: docSnap.id } as PlaceSuggestion);
          });
          callback(suggestions);
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Firestore subscribeToSuggestions error:', err);
      }
    }
    return localSyncService.subscribeToSuggestions(squadId, callback);
  }

  // REGROUP
  async setRegroupPoint(squadId: string, regroupPoint: RegroupPoint | null): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'squads', squadId), {
          activeRegroupPoint: regroupPoint
        });
      } catch (err) {
        console.warn('Firestore setRegroupPoint error:', err);
      }
    }
    localSyncService.setRegroupPoint(squadId, regroupPoint);
  }
}

export const squadDataService = new SquadDataService();

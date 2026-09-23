import { db, isFirebaseConfigured } from './firebaseConfig';
import { localSyncService } from '../sync/localSyncService';
import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';
import { optimizeSquadForStorage } from '../../utils/routeOptimizer';
import { normalizeSquadCode } from '../../utils/inviteUrl';
import { haversineDistance } from '../../utils/geo';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const cleanForFirestore = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export interface FindSquadResult {
  squad: Squad | null;
  error?: string;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'ENDED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'INVALID_CODE';
  technicalError?: string;
}

export class SquadDataService {
  // Throttle map for member location writes to Firestore: userId -> { timestamp, lat, lng, status }
  private lastMemberFirestoreWrite: Map<string, { timestamp: number; lat: number; lng: number; status: string }> = new Map();

  // ==========================================
  // SQUAD OPERATIONS
  // ==========================================

  /**
   * Persists a squad document to Firestore and local sync.
   * Ensures the public squad code is stored in the document as `code`.
   */
  async saveSquad(squad: Squad): Promise<void> {
    const code = normalizeSquadCode(squad.code || squad.squadId);
    const optimized = optimizeSquadForStorage({
      ...squad,
      code,
      squadId: squad.squadId || code
    });

    // 1. Immediately cache in local sync for instant reactivity
    localSyncService.saveSquad(optimized);

    // 2. Persist to Firestore as the source of truth
    if (isFirebaseConfigured() && db) {
      console.log(`[CREATE SQUAD]\nGenerated code: ${code}\nFirestore document ID: ${squad.squadId}\nWriting to Firestore...`);
      try {
        const firestoreData = {
          ...cleanForFirestore(optimized),
          code,
          squadId: squad.squadId || code,
          createdAt: serverTimestamp(),
          createdAtMs: squad.createdAt || Date.now(),
          expiresAt: squad.expiresAt || (Date.now() + 24 * 60 * 60 * 1000)
        };

        await setDoc(doc(db, 'squads', squad.squadId), firestoreData);
        console.log(`[CREATE SQUAD]\nGenerated code: ${code}\nFirestore document ID: ${squad.squadId}\nFirestore write successful: true`);
      } catch (err: any) {
        console.error(`[CREATE SQUAD]\nGenerated code: ${code}\nFirestore document ID: ${squad.squadId}\nFirestore write successful: false\nError:`, err);
        throw err;
      }
    }
  }

  /**
   * Universal squad lookup by code, URL, or raw string.
   * Used for QR code scanning, direct URL visits, and manual code input.
   */
  async findSquadByCode(rawInput: string): Promise<FindSquadResult> {
    const rawUrl = rawInput || '';
    const normalizedCode = normalizeSquadCode(rawInput);

    console.log(`[JOIN SQUAD]\nRaw URL: ${rawUrl}\nExtracted code: ${normalizedCode}\nNormalized code: ${normalizedCode}`);

    if (!normalizedCode || !/^SQ-[A-Za-z0-9_-]+$/.test(normalizedCode)) {
      console.warn(`[JOIN SQUAD] Invalid code format: "${rawInput}" normalized to "${normalizedCode}"`);
      return {
        squad: null,
        error: 'Invalid squad code format. Please check the code or invite link.',
        errorCode: 'INVALID_CODE'
      };
    }

    let foundSquad: Squad | null = null;
    let queryResultCount = 0;
    const queryDesc = `where("code", "==", "${normalizedCode}")`;

    // 1. Query Firestore
    if (isFirebaseConfigured() && db) {
      try {
        console.log(`[JOIN SQUAD]\nFirestore query: ${queryDesc}`);
        const squadQuery = query(collection(db, 'squads'), where('code', '==', normalizedCode));
        const snap = await getDocs(squadQuery);
        queryResultCount = snap.size;
        console.log(`[JOIN SQUAD]\nQuery result count: ${queryResultCount}`);

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          foundSquad = {
            ...data,
            squadId: data.squadId || docSnap.id,
            code: data.code || normalizedCode
          } as Squad;
        } else {
          // Fallback check: check document ID directly for legacy squads created before the `code` field
          const directDocSnap = await getDoc(doc(db, 'squads', normalizedCode));
          if (directDocSnap.exists()) {
            const data = directDocSnap.data();
            queryResultCount = 1;
            console.log(`[JOIN SQUAD] Found squad by document ID fallback: ${normalizedCode}`);
            foundSquad = {
              ...data,
              squadId: data.squadId || directDocSnap.id,
              code: data.code || normalizedCode
            } as Squad;
          }
        }
      } catch (err: any) {
        console.error('[JOIN SQUAD] Firestore query error:', err);
        const isPerm = err?.code === 'permission-denied';
        const isQuota = err?.code === 'resource-exhausted';
        const isNetwork = err?.code === 'unavailable' || err?.message?.includes('network');

        return {
          squad: null,
          error: isPerm
            ? 'Access denied by Firestore security rules. Unable to read squad.'
            : isQuota
            ? 'Firebase database daily quota has been exceeded. Please try again later.'
            : 'Unable to connect to Firebase. Please check your network connection.',
          errorCode: isPerm ? 'PERMISSION_DENIED' : isQuota ? 'NETWORK_ERROR' : 'NETWORK_ERROR',
          technicalError: err?.message || String(err)
        };
      }
    }

    // 2. Offline / Demo fallback
    if (!foundSquad) {
      const local = localSyncService.getSquad(normalizedCode);
      if (local) {
        console.log('[JOIN SQUAD] Located squad in local sync storage');
        foundSquad = local;
      }
    }

    // 3. Not Found verification
    if (!foundSquad) {
      console.log(`[JOIN SQUAD]\nSquad found: false`);
      return {
        squad: null,
        error: `Squad #${normalizedCode} was not found. Please verify the code with your squad host.`,
        errorCode: 'NOT_FOUND'
      };
    }

    console.log(`[JOIN SQUAD]\nSquad found: true\nSquad status: ${foundSquad.status}`);

    // 4. Status verification
    if (foundSquad.status === 'ended') {
      return {
        squad: foundSquad,
        error: 'This squad session has already ended.',
        errorCode: 'ENDED'
      };
    }

    // 5. Expiration verification
    // CRITICAL: Do NOT mark as expired if expiresAt is missing, pending, or 0
    let isExpired = false;
    let expiryStr = 'No expiry configured (Active)';
    if (foundSquad.expiresAt !== undefined && foundSquad.expiresAt !== null) {
      let expiresAtMs: number | null = null;
      if (typeof foundSquad.expiresAt === 'number') {
        expiresAtMs = foundSquad.expiresAt;
      } else if (typeof (foundSquad.expiresAt as any)?.toMillis === 'function') {
        expiresAtMs = (foundSquad.expiresAt as any).toMillis();
      } else if (typeof (foundSquad.expiresAt as any)?.seconds === 'number') {
        expiresAtMs = (foundSquad.expiresAt as any).seconds * 1000;
      }

      if (expiresAtMs && !isNaN(expiresAtMs) && expiresAtMs > 0) {
        expiryStr = new Date(expiresAtMs).toISOString();
        if (Date.now() > expiresAtMs) {
          isExpired = true;
        }
      }
    }

    console.log(`[JOIN SQUAD]\nExpiry: ${expiryStr}\nExpired: ${isExpired}`);

    if (isExpired) {
      return {
        squad: foundSquad,
        error: `Squad #${normalizedCode} has expired. Please ask the host for a new squad invitation.`,
        errorCode: 'EXPIRED'
      };
    }

    // Cache in local sync for rapid retrieval
    localSyncService.saveSquad(foundSquad);
    console.log(`[JOIN SQUAD]\nJoin successful: true`);

    return { squad: foundSquad };
  }

  /**
   * Retrieves a squad by ID or code.
   */
  async getSquad(squadId: string): Promise<Squad | null> {
    const result = await this.findSquadByCode(squadId);
    return result.squad;
  }

  subscribeToSquad(squadId: string, callback: (squad: Squad | null) => void): () => void {
    const normalized = normalizeSquadCode(squadId);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(doc(db, 'squads', normalized), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Squad;
            callback({
              ...data,
              squadId: data.squadId || snap.id,
              code: data.code || normalized
            });
          }
        }, (err) => {
          console.warn('Firestore subscribeToSquad error:', err);
        });
      } catch (err) {
        console.warn('Firestore subscribeToSquad init error:', err);
      }
    }

    const unsubLocal = localSyncService.subscribeToSquad(normalized, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // ==========================================
  // MEMBERS OPERATIONS
  // ==========================================

  async getMembers(squadId: string): Promise<SquadMember[]> {
    const normalized = normalizeSquadCode(squadId);
    const local = localSyncService.getMembers(normalized);
    if (local && local.length > 0) return local;

    if (isFirebaseConfigured() && db) {
      try {
        const snapshot = await getDocs(collection(db, 'squads', normalized, 'members'));
        if (snapshot && !snapshot.empty) {
          const members: SquadMember[] = [];
          snapshot.forEach((docSnap) => {
            members.push(docSnap.data() as SquadMember);
          });
          if (members.length > 0) {
            localSyncService.saveMembers(normalized, members);
            return members;
          }
        }
      } catch (err) {
        console.warn('Firestore getMembers error:', err);
      }
    }
    return local || [];
  }

  /**
   * Updates a squad member in local sync and Firestore.
   * Throttles Firestore coordinate writes (max 1 per 5s) to prevent exhausting database quota,
   * while always applying status changes and host registrations immediately.
   */
  async updateMember(squadId: string, member: SquadMember): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.updateMember(normalized, member);

    if (isFirebaseConfigured() && db) {
      const now = Date.now();
      const lastWrite = this.lastMemberFirestoreWrite.get(member.userId);

      const isStatusChange = !lastWrite || lastWrite.status !== member.status;
      const isTimeElapsed = !lastWrite || (now - lastWrite.timestamp > 5000);
      const isMovedSignificantly = !lastWrite || (
        haversineDistance(
          { lat: lastWrite.lat, lng: lastWrite.lng },
          { lat: member.latitude, lng: member.longitude }
        ) > 20
      );

      // Write to Firestore if status changed, or if sufficient time elapsed and member moved
      if (isStatusChange || (isTimeElapsed && isMovedSignificantly)) {
        this.lastMemberFirestoreWrite.set(member.userId, {
          timestamp: now,
          lat: member.latitude,
          lng: member.longitude,
          status: member.status
        });

        try {
          await setDoc(
            doc(db, 'squads', normalized, 'members', member.userId),
            cleanForFirestore(member)
          );
        } catch (err) {
          console.warn('Firestore updateMember error:', err);
        }
      }
    }
  }

  async removeMember(squadId: string, userId: string): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.removeMember(normalized, userId);
    this.lastMemberFirestoreWrite.delete(userId);

    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'squads', normalized, 'members', userId));
      } catch (err) {
        console.warn('Firestore removeMember error:', err);
      }
    }
  }

  subscribeToMembers(squadId: string, callback: (members: SquadMember[]) => void): () => void {
    const normalized = normalizeSquadCode(squadId);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', normalized, 'members'), (snapshot) => {
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

    const unsubLocal = localSyncService.subscribeToMembers(normalized, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // ==========================================
  // MESSAGES OPERATIONS
  // ==========================================

  async sendMessage(squadId: string, message: ChatMessage): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.sendMessage(normalized, message);

    if (isFirebaseConfigured() && db) {
      try {
        await addDoc(collection(db, 'squads', normalized, 'messages'), cleanForFirestore(message));
      } catch (err) {
        console.warn('Firestore sendMessage error:', err);
      }
    }
  }

  subscribeToMessages(squadId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const normalized = normalizeSquadCode(squadId);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', normalized, 'messages'), (snapshot) => {
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

    const unsubLocal = localSyncService.subscribeToMessages(normalized, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // ==========================================
  // SUGGESTIONS OPERATIONS
  // ==========================================

  async saveSuggestion(squadId: string, suggestion: PlaceSuggestion): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.saveSuggestion(normalized, suggestion);

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'squads', normalized, 'suggestions', suggestion.id), cleanForFirestore(suggestion));
      } catch (err) {
        console.warn('Firestore saveSuggestion error:', err);
      }
    }
  }

  async voteSuggestion(squadId: string, suggestionId: string, userId: string, vote: boolean): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.voteSuggestion(normalized, suggestionId, userId, vote);

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'squads', normalized, 'suggestions', suggestionId), {
          [`votes.${userId}`]: vote
        });
      } catch (err) {
        console.warn('Firestore voteSuggestion error:', err);
      }
    }
  }

  subscribeToSuggestions(squadId: string, callback: (suggestions: PlaceSuggestion[]) => void): () => void {
    const normalized = normalizeSquadCode(squadId);
    let unsubFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(collection(db, 'squads', normalized, 'suggestions'), (snapshot) => {
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

    const unsubLocal = localSyncService.subscribeToSuggestions(normalized, callback);

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  }

  // ==========================================
  // REGROUP OPERATIONS
  // ==========================================

  async setRegroupPoint(squadId: string, regroupPoint: RegroupPoint | null): Promise<void> {
    const normalized = normalizeSquadCode(squadId);
    localSyncService.setRegroupPoint(normalized, regroupPoint);

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'squads', normalized), {
          activeRegroupPoint: regroupPoint
        });
      } catch (err) {
        console.warn('Firestore setRegroupPoint error:', err);
      }
    }
  }
}

export const squadDataService = new SquadDataService();

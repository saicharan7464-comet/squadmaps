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


// ============================================================
// FIRESTORE HELPERS
// ============================================================

const cleanForFirestore = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};


/**
 * Firebase requests should not fail too quickly.
 *
 * Previously this was 2000ms.
 * We use 5000ms to avoid treating a slightly slow Firebase
 * connection as a complete failure.
 */
const withTimeout = <T>(
  promise: Promise<T>,
  ms = 5000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Operation timed out after ${ms}ms`)
          ),
        ms
      )
    )
  ]);
};


// ============================================================
// SQUAD DATA SERVICE
// ============================================================

export class SquadDataService {

  /**
   * ==========================================================
   * FIRESTORE LOCATION UPDATE CONTROL
   * ==========================================================
   *
   * SquadMaps can receive GPS updates very frequently.
   *
   * We DO NOT want every GPS update to create a Firestore write.
   *
   * Example:
   *
   * GPS update → local storage       ✅
   * GPS update → local storage       ✅
   * GPS update → local storage       ✅
   * GPS update → local storage       ✅
   *
   * Firestore → maximum once/10 sec  ✅
   *
   * This dramatically reduces Firestore writes.
   */

  private lastMemberFirestoreUpdate =
    new Map<string, number>();


  /**
   * Keep track of pending timers.
   *
   * If another GPS update happens while the user is inside
   * the 10-second Firestore window, we schedule the latest
   * member information to be uploaded after the window.
   */
  private memberUpdateTimers =
    new Map<string, ReturnType<typeof setTimeout>>();


  // ==========================================================
  // SQUAD
  // ==========================================================

  async saveSquad(squad: Squad): Promise<void> {

    // --------------------------------------------------------
    // 1. Save locally immediately.
    // --------------------------------------------------------

    localSyncService.saveSquad(squad);


    // --------------------------------------------------------
    // 2. Firebase must be configured.
    // --------------------------------------------------------

    if (!isFirebaseConfigured() || !db) {
      throw new Error(
        'Firebase is not configured. The squad could not be saved to the server.'
      );
    }


    // --------------------------------------------------------
    // 3. Save squad to Firestore.
    // --------------------------------------------------------

    try {

      await withTimeout(
        setDoc(
          doc(db, 'squads', squad.squadId),
          cleanForFirestore(squad)
        ),
        5000
      );


      console.log(
        'Squad successfully saved to Firestore:',
        squad.squadId
      );

    } catch (err) {

      console.error(
        'Failed to save squad to Firestore:',
        err
      );


      // Important:
      // Tell the caller that the remote save failed.
      //
      // This prevents the UI from incorrectly saying
      // "Squad Created" when the squad only exists locally.

      throw new Error(
        'Could not save the squad to the server. Please try again later.'
      );
    }
  }


  // ==========================================================
  // GET SQUAD
  // ==========================================================

  async getSquad(
    squadId: string
  ): Promise<Squad | null> {

    if (isFirebaseConfigured() && db) {

      try {

        const snap = await withTimeout(
          getDoc(
            doc(db, 'squads', squadId)
          ),
          5000
        );


        if (snap.exists()) {

          return snap.data() as Squad;

        }

      } catch (err) {

        console.warn(
          'Firestore getSquad error/timeout, falling back to local storage:',
          err
        );

      }

    }


    return localSyncService.getSquad(squadId);
  }


  // ==========================================================
  // SUBSCRIBE TO SQUAD
  // ==========================================================

  subscribeToSquad(
    squadId: string,
    callback: (squad: Squad | null) => void
  ): () => void {

    // Local subscription
    const unsubLocal =
      localSyncService.subscribeToSquad(
        squadId,
        callback
      );


    let unsubFirestore:
      (() => void) | null = null;


    if (isFirebaseConfigured() && db) {

      try {

        unsubFirestore = onSnapshot(

          doc(
            db,
            'squads',
            squadId
          ),

          (snap) => {

            if (snap.exists()) {

              callback(
                snap.data() as Squad
              );

            }

          },

          (err) => {

            console.warn(
              'Firestore subscribeToSquad warning:',
              err
            );

          }
        );

      } catch (err) {

        console.warn(
          'Firestore subscribeToSquad init error:',
          err
        );

      }

    }


    // Cleanup
    return () => {

      unsubLocal();

      if (unsubFirestore) {
        unsubFirestore();
      }

    };
  }


  // ==========================================================
  // MEMBERS
  // ==========================================================

  async getMembers(
    squadId: string
  ): Promise<SquadMember[]> {

    if (isFirebaseConfigured() && db) {

      try {

        const snapshot = await withTimeout(
          getDocs(
            collection(
              db,
              'squads',
              squadId,
              'members'
            )
          ),
          5000
        );


        const members: SquadMember[] = [];


        snapshot.forEach(
          (docSnap) => {

            members.push(
              docSnap.data() as SquadMember
            );

          }
        );


        if (members.length > 0) {

          return members;

        }

      } catch (err) {

        console.warn(
          'Firestore getMembers error/timeout:',
          err
        );

      }

    }


    return localSyncService.getMembers(
      squadId
    );
  }


  // ==========================================================
  // UPDATE MEMBER
  // ==========================================================

  async updateMember(
    squadId: string,
    member: SquadMember
  ): Promise<void> {

    // --------------------------------------------------------
    // ALWAYS update local state immediately.
    // --------------------------------------------------------

    localSyncService.updateMember(
      squadId,
      member
    );


    // --------------------------------------------------------
    // Firebase unavailable?
    // --------------------------------------------------------

    if (!isFirebaseConfigured() || !db) {
      return;
    }


    const key =
      `${squadId}_${member.userId}`;


    const now =
      Date.now();


    const lastUpdate =
      this.lastMemberFirestoreUpdate.get(key) || 0;


    const elapsed =
      now - lastUpdate;


    const FIRESTORE_UPDATE_INTERVAL =
      10_000; // 10 seconds


    // ========================================================
    // CASE 1:
    // More than 10 seconds have passed.
    // Upload immediately.
    // ========================================================

    if (
      elapsed >=
      FIRESTORE_UPDATE_INTERVAL
    ) {

      await this.writeMemberToFirestore(
        squadId,
        member,
        key
      );

      return;
    }


    // ========================================================
    // CASE 2:
    // We recently uploaded this member.
    //
    // Do NOT write again immediately.
    //
    // Instead, schedule the latest member information.
    // ========================================================

    if (
      !this.memberUpdateTimers.has(key)
    ) {

      const remaining =
        FIRESTORE_UPDATE_INTERVAL -
        elapsed;


      const timer =
        setTimeout(
          async () => {

            this.memberUpdateTimers.delete(
              key
            );


            // Upload the latest member state.
            await this.writeMemberToFirestore(
              squadId,
              member,
              key
            );

          },
          remaining
        );


      this.memberUpdateTimers.set(
        key,
        timer
      );

    }

  }


  // ==========================================================
  // ACTUAL FIRESTORE MEMBER WRITE
  // ==========================================================

  private async writeMemberToFirestore(
    squadId: string,
    member: SquadMember,
    key: string
  ): Promise<void> {

    if (!db) {
      return;
    }


    // Update timestamp BEFORE writing.
    //
    // This prevents multiple calls from simultaneously
    // trying to write the same member.

    this.lastMemberFirestoreUpdate.set(
      key,
      Date.now()
    );


    try {

      await withTimeout(

        setDoc(

          doc(
            db,
            'squads',
            squadId,
            'members',
            member.userId
          ),

          cleanForFirestore(member),

          {
            merge: true
          }

        ),

        5000

      );


    } catch (err) {

      console.warn(
        'Firestore updateMember error:',
        err
      );

    }

  }


  // ==========================================================
  // REMOVE MEMBER
  // ==========================================================

  async removeMember(
    squadId: string,
    userId: string
  ): Promise<void> {

    // Local
    localSyncService.removeMember(
      squadId,
      userId
    );


    // Remove pending timer
    const key =
      `${squadId}_${userId}`;


    const timer =
      this.memberUpdateTimers.get(key);


    if (timer) {

      clearTimeout(timer);

      this.memberUpdateTimers.delete(
        key
      );

    }


    this.lastMemberFirestoreUpdate.delete(
      key
    );


    // Firebase
    if (isFirebaseConfigured() && db) {

      try {

        await withTimeout(

          deleteDoc(

            doc(
              db,
              'squads',
              squadId,
              'members',
              userId
            )

          ),

          5000

        );

      } catch (err) {

        console.warn(
          'Firestore removeMember error/timeout:',
          err
        );

      }

    }

  }


  // ==========================================================
  // SUBSCRIBE TO MEMBERS
  // ==========================================================

  subscribeToMembers(
    squadId: string,
    callback: (
      members: SquadMember[]
    ) => void
  ): () => void {

    // Local subscription
    const unsubLocal =
      localSyncService.subscribeToMembers(
        squadId,
        callback
      );


    let unsubFirestore:
      (() => void) | null = null;


    if (isFirebaseConfigured() && db) {

      try {

        unsubFirestore = onSnapshot(

          collection(
            db,
            'squads',
            squadId,
            'members'
          ),

          (snapshot) => {

            const members:
              SquadMember[] = [];


            snapshot.forEach(
              (docSnap) => {

                members.push(
                  docSnap.data() as SquadMember
                );

              }
            );


            if (members.length > 0) {

              callback(
                members
              );

            }

          },

          (err) => {

            console.warn(
              'Firestore subscribeToMembers warning:',
              err
            );

          }

        );

      } catch (err) {

        console.warn(
          'Firestore subscribeToMembers init error:',
          err
        );

      }

    }


    return () => {

      unsubLocal();

      if (unsubFirestore) {

        unsubFirestore();

      }

    };

  }


  // ==========================================================
  // MESSAGES
  // ==========================================================

  async sendMessage(
    squadId: string,
    message: ChatMessage
  ): Promise<void> {

    // Local
    localSyncService.sendMessage(
      squadId,
      message
    );


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        await withTimeout(

          addDoc(

            collection(
              db,
              'squads',
              squadId,
              'messages'
            ),

            cleanForFirestore(
              message
            )

          ),

          5000

        );

      } catch (err) {

        console.warn(
          'Firestore sendMessage error/timeout:',
          err
        );

      }

    }

  }


  // ==========================================================
  // SUBSCRIBE TO MESSAGES
  // ==========================================================

  subscribeToMessages(
    squadId: string,
    callback: (
      messages: ChatMessage[]
    ) => void
  ): () => void {

    const unsubLocal =
      localSyncService.subscribeToMessages(
        squadId,
        callback
      );


    let unsubFirestore:
      (() => void) | null = null;


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        unsubFirestore = onSnapshot(

          collection(
            db,
            'squads',
            squadId,
            'messages'
          ),

          (snapshot) => {

            const messages:
              ChatMessage[] = [];


            snapshot.forEach(
              (docSnap) => {

                messages.push(

                  {
                    ...docSnap.data(),

                    id: docSnap.id

                  } as ChatMessage

                );

              }
            );


            messages.sort(
              (a, b) =>
                a.timestamp -
                b.timestamp
            );


            if (
              messages.length > 0
            ) {

              callback(
                messages
              );

            }

          },

          (err) => {

            console.warn(
              'Firestore subscribeToMessages warning:',
              err
            );

          }

        );

      } catch (err) {

        console.warn(
          'Firestore subscribeToMessages init error:',
          err
        );

      }

    }


    return () => {

      unsubLocal();

      if (unsubFirestore) {

        unsubFirestore();

      }

    };

  }


  // ==========================================================
  // SUGGESTIONS
  // ==========================================================

  async saveSuggestion(
    squadId: string,
    suggestion: PlaceSuggestion
  ): Promise<void> {

    // Local
    localSyncService.saveSuggestion(
      squadId,
      suggestion
    );


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        await withTimeout(

          setDoc(

            doc(
              db,
              'squads',
              squadId,
              'suggestions',
              suggestion.id
            ),

            cleanForFirestore(
              suggestion
            ),

            {
              merge: true
            }

          ),

          5000

        );

      } catch (err) {

        console.warn(
          'Firestore saveSuggestion error/timeout:',
          err
        );

      }

    }

  }


  // ==========================================================
  // VOTE SUGGESTION
  // ==========================================================

  async voteSuggestion(
    squadId: string,
    suggestionId: string,
    userId: string,
    vote: boolean
  ): Promise<void> {

    // Local
    localSyncService.voteSuggestion(
      squadId,
      suggestionId,
      userId,
      vote
    );


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        await withTimeout(

          updateDoc(

            doc(
              db,
              'squads',
              squadId,
              'suggestions',
              suggestionId
            ),

            {
              [`votes.${userId}`]:
                vote
            }

          ),

          5000

        );

      } catch (err) {

        console.warn(
          'Firestore voteSuggestion error/timeout:',
          err
        );

      }

    }

  }


  // ==========================================================
  // SUBSCRIBE TO SUGGESTIONS
  // ==========================================================

  subscribeToSuggestions(
    squadId: string,
    callback: (
      suggestions: PlaceSuggestion[]
    ) => void
  ): () => void {

    const unsubLocal =
      localSyncService.subscribeToSuggestions(
        squadId,
        callback
      );


    let unsubFirestore:
      (() => void) | null = null;


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        unsubFirestore = onSnapshot(

          collection(
            db,
            'squads',
            squadId,
            'suggestions'
          ),

          (snapshot) => {

            const suggestions:
              PlaceSuggestion[] = [];


            snapshot.forEach(
              (docSnap) => {

                suggestions.push(

                  {
                    ...docSnap.data(),

                    id: docSnap.id

                  } as PlaceSuggestion

                );

              }
            );


            if (
              suggestions.length > 0
            ) {

              callback(
                suggestions
              );

            }

          },

          (err) => {

            console.warn(
              'Firestore subscribeToSuggestions warning:',
              err
            );

          }

        );

      } catch (err) {

        console.warn(
          'Firestore subscribeToSuggestions init error:',
          err
        );

      }

    }


    return () => {

      unsubLocal();

      if (unsubFirestore) {

        unsubFirestore();

      }

    };

  }


  // ==========================================================
  // REGROUP POINT
  // ==========================================================

  async setRegroupPoint(
    squadId: string,
    regroupPoint: RegroupPoint | null
  ): Promise<void> {

    // Local
    localSyncService.setRegroupPoint(
      squadId,
      regroupPoint
    );


    if (
      isFirebaseConfigured() &&
      db
    ) {

      try {

        await withTimeout(

          updateDoc(

            doc(
              db,
              'squads',
              squadId
            ),

            {
              activeRegroupPoint:
                regroupPoint
            }

          ),

          5000

        );

      } catch (err) {

        console.warn(
          'Firestore setRegroupPoint error/timeout:',
          err
        );

      }

    }

  }

}


// ============================================================
// SINGLE SERVICE INSTANCE
// ============================================================

export const squadDataService =
  new SquadDataService();
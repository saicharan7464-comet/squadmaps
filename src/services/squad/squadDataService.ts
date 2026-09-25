import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { localSyncService } from '../sync/localSyncService';
import { Squad, SquadMember, RegroupPoint } from '../../types/squad';
import { ChatMessage } from '../../types/chat';
import { PlaceSuggestion } from '../../types/places';

// ============================================================
// ROW MAPPERS: SUPABASE POSTGRESQL <-> TYPESCRIPT DOMAIN TYPES
// ============================================================

const cleanObject = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

const mapSquadToRow = (squad: Squad) => ({
  squad_id: squad.squadId,
  host_id: squad.hostId,
  host_name: squad.hostName,
  name: squad.name,
  destination: squad.destination,
  destination_lat: squad.destinationCoordinates?.lat ?? 0,
  destination_lng: squad.destinationCoordinates?.lng ?? 0,
  vehicle_mode: squad.vehicleMode,
  status: squad.status,
  canonical_route: cleanObject(squad.canonicalRoute),
  settings: cleanObject(squad.settings),
  active_regroup_point: squad.activeRegroupPoint ? cleanObject(squad.activeRegroupPoint) : null,
  created_at_ms: squad.createdAt || Date.now()
});

const mapSquadRow = (row: any): Squad => ({
  squadId: row.squad_id ?? row.squadId,
  hostId: row.host_id ?? row.hostId,
  hostName: row.host_name ?? row.hostName,
  name: row.name ?? '',
  destination: row.destination ?? '',
  destinationCoordinates: {
    lat: Number(row.destination_lat ?? row.destinationCoordinates?.lat ?? 0),
    lng: Number(row.destination_lng ?? row.destinationCoordinates?.lng ?? 0)
  },
  vehicleMode: row.vehicle_mode ?? row.vehicleMode ?? 'car',
  createdAt: typeof row.created_at === 'number'
    ? row.created_at
    : (row.created_at_ms ?? (row.created_at ? new Date(row.created_at).getTime() : Date.now())),
  status: row.status ?? 'active',
  canonicalRoute: typeof row.canonical_route === 'string'
    ? JSON.parse(row.canonical_route)
    : (row.canonical_route ?? row.canonicalRoute),
  settings: typeof row.settings === 'string'
    ? JSON.parse(row.settings)
    : (row.settings ?? {
        allowMemberVehicleChange: true,
        fallingBehindThresholdKm: 3,
        fallingBehindThresholdMins: 7,
        autoReroute: true
      }),
  activeRegroupPoint: row.active_regroup_point
    ? (typeof row.active_regroup_point === 'string'
        ? JSON.parse(row.active_regroup_point)
        : row.active_regroup_point)
    : (row.activeRegroupPoint ?? null)
});

const mapMemberToRow = (squadId: string, member: SquadMember) => ({
  squad_id: squadId,
  user_id: member.userId,
  name: member.name,
  profile_image: member.profileImage,
  color: member.color,
  latitude: member.latitude,
  longitude: member.longitude,
  speed: member.speed,
  heading: member.heading,
  accuracy: member.accuracy,
  last_updated: member.lastUpdated || Date.now(),
  eta: member.eta,
  eta_seconds: member.etaSeconds,
  distance_remaining: member.distanceRemaining,
  status: member.status,
  online: member.online,
  vehicle_mode: member.vehicleMode,
  is_host: Boolean(member.isHost),
  location_sharing_paused: Boolean(member.locationSharingPaused)
});

const mapMemberRow = (row: any): SquadMember => ({
  userId: row.user_id ?? row.userId,
  name: row.name ?? '',
  profileImage: row.profile_image ?? row.profileImage ?? '',
  color: row.color ?? '#00F0FF',
  latitude: Number(row.latitude ?? 0),
  longitude: Number(row.longitude ?? 0),
  speed: Number(row.speed ?? 0),
  heading: Number(row.heading ?? 0),
  accuracy: Number(row.accuracy ?? 10),
  lastUpdated: typeof row.last_updated === 'number'
    ? row.last_updated
    : (row.lastUpdated ?? (row.updated_at ? new Date(row.updated_at).getTime() : Date.now())),
  eta: row.eta ?? 'Calculating...',
  etaSeconds: Number(row.eta_seconds ?? row.etaSeconds ?? 0),
  distanceRemaining: Number(row.distance_remaining ?? row.distanceRemaining ?? 0),
  status: row.status ?? 'active',
  online: Boolean(row.online ?? true),
  vehicleMode: row.vehicle_mode ?? row.vehicleMode ?? 'car',
  isHost: Boolean(row.is_host ?? row.isHost ?? false),
  locationSharingPaused: Boolean(row.location_sharing_paused ?? row.locationSharingPaused ?? false)
});

const mapMessageToRow = (squadId: string, message: ChatMessage) => ({
  id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  squad_id: squadId,
  sender_id: message.senderId,
  sender_name: message.senderName,
  sender_avatar: message.senderAvatar,
  sender_color: message.senderColor,
  text: message.text,
  type: message.type,
  quick_action: message.quickAction || null,
  timestamp: message.timestamp || Date.now()
});

const mapMessageRow = (row: any): ChatMessage => ({
  id: row.id,
  squadId: row.squad_id ?? row.squadId,
  senderId: row.sender_id ?? row.senderId,
  senderName: row.sender_name ?? row.senderName,
  senderAvatar: row.sender_avatar ?? row.senderAvatar ?? '',
  senderColor: row.sender_color ?? row.senderColor ?? '#00F0FF',
  text: row.text,
  type: row.type ?? 'chat',
  quickAction: row.quick_action ?? row.quickAction ?? undefined,
  timestamp: typeof row.timestamp === 'number'
    ? row.timestamp
    : (row.created_at ? new Date(row.created_at).getTime() : Date.now())
});

const mapSuggestionToRow = (squadId: string, suggestion: PlaceSuggestion) => ({
  id: suggestion.id,
  squad_id: squadId,
  created_by: suggestion.createdBy,
  created_by_name: suggestion.createdByName,
  place: cleanObject(suggestion.place),
  votes: cleanObject(suggestion.votes || {}),
  status: suggestion.status,
  created_at: suggestion.createdAt || Date.now()
});

const mapSuggestionRow = (row: any): PlaceSuggestion => ({
  id: row.id,
  squadId: row.squad_id ?? row.squadId,
  createdBy: row.created_by ?? row.createdBy,
  createdByName: row.created_by_name ?? row.createdByName,
  place: typeof row.place === 'string' ? JSON.parse(row.place) : row.place,
  votes: typeof row.votes === 'string' ? JSON.parse(row.votes) : (row.votes || {}),
  status: row.status ?? 'open',
  createdAt: typeof row.created_at === 'number'
    ? row.created_at
    : (row.created_at ? new Date(row.created_at).getTime() : Date.now())
});

// ============================================================
// TIMEOUT HELPER
// ============================================================

const withTimeout = <T>(promise: PromiseLike<T>, ms = 5000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
};

// ============================================================
// SQUAD DATA SERVICE (SUPABASE POSTGRESQL IMPLEMENTATION)
// ============================================================

export class SquadDataService {
  /**
   * GPS Write Throttle Control:
   * Throttle frequent GPS updates to max once per 10 seconds per member.
   */
  private lastMemberSupabaseUpdate = new Map<string, number>();
  private memberUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly SUPABASE_UPDATE_INTERVAL = 10_000; // 10 seconds

  // ==========================================================
  // SQUAD
  // ==========================================================

  async saveSquad(squad: Squad): Promise<void> {
    // 1. Supabase must be configured and initialized.
    if (!isSupabaseConfigured() || !supabase) {
      const errorMsg = 'Supabase server is not configured or unavailable. Squad cannot be created on the server.';
      console.error('[squadDataService] saveSquad failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // 2. Upsert squad into Supabase squads table and verify persistence.
    try {
      const row = mapSquadToRow(squad);
      console.log('[squadDataService] Persisting squad to Supabase:', squad.squadId);

      const query = supabase
        .from('squads')
        .upsert(row, { onConflict: 'squad_id' })
        .select('squad_id')
        .single();

      const { data, error } = await withTimeout(query, 5000);
      if (error) {
        console.error('[squadDataService] Supabase squads upsert error:', error);
        throw error;
      }

      if (!data || data.squad_id !== squad.squadId) {
        throw new Error(`Database did not acknowledge persistence of squad ${squad.squadId}`);
      }

      // 3. Save locally only after remote persistence is verified.
      localSyncService.saveSquad(squad);
      console.log('[squadDataService] Squad successfully saved to Supabase and verified:', squad.squadId);
    } catch (err: any) {
      console.error('[squadDataService] Failed to save squad to Supabase:', err);
      throw new Error(
        err?.message || 'Could not save the squad to the server. Please try again later.'
      );
    }
  }

  // ==========================================================
  // GET SQUAD
  // ==========================================================

  async getSquad(squadId: string): Promise<Squad | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const query = supabase
          .from('squads')
          .select('*')
          .eq('squad_id', squadId)
          .maybeSingle();

        const { data, error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase getSquad error:', error);
        } else if (data) {
          return mapSquadRow(data);
        }
      } catch (err) {
        console.warn('Supabase getSquad error/timeout, falling back to local storage:', err);
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
    const unsubLocal = localSyncService.subscribeToSquad(squadId, callback);
    let channel: any = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        // Initial fetch
        this.getSquad(squadId)
          .then((remote) => {
            if (remote) callback(remote);
          })
          .catch(() => {});

        const channelName = `squad_sub_${squadId}_${Math.random().toString(36).substring(2, 7)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'squads',
              filter: `squad_id=eq.${squadId}`
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                callback(null);
              } else if (payload.new) {
                callback(mapSquadRow(payload.new));
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`Subscribed to Supabase squads changes for ${squadId}`);
            }
          });
      } catch (err) {
        console.warn('Supabase subscribeToSquad init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }

  // ==========================================================
  // MEMBERS
  // ==========================================================

  async getMembers(squadId: string): Promise<SquadMember[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const query = supabase
          .from('squad_members')
          .select('*')
          .eq('squad_id', squadId);

        const { data, error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase getMembers error:', error);
        } else if (data && data.length > 0) {
          return data.map(mapMemberRow);
        }
      } catch (err) {
        console.warn('Supabase getMembers error/timeout:', err);
      }
    }

    return localSyncService.getMembers(squadId);
  }

  // ==========================================================
  // UPDATE MEMBER (WITH 10-SECOND GPS WRITE THROTTLING)
  // ==========================================================

  async updateMember(squadId: string, member: SquadMember): Promise<void> {
    // 1. ALWAYS update local state immediately
    localSyncService.updateMember(squadId, member);

    // 2. Supabase unavailable?
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    const key = `${squadId}_${member.userId}`;
    const now = Date.now();
    const lastUpdate = this.lastMemberSupabaseUpdate.get(key) || 0;
    const elapsed = now - lastUpdate;

    // CASE 1: Cooldown elapsed -> write immediately
    if (elapsed >= this.SUPABASE_UPDATE_INTERVAL) {
      await this.writeMemberToSupabase(squadId, member, key);
      return;
    }

    // CASE 2: Inside cooldown -> schedule timer for latest state
    if (!this.memberUpdateTimers.has(key)) {
      const remaining = this.SUPABASE_UPDATE_INTERVAL - elapsed;
      const timer = setTimeout(async () => {
        this.memberUpdateTimers.delete(key);
        await this.writeMemberToSupabase(squadId, member, key);
      }, remaining);

      this.memberUpdateTimers.set(key, timer);
    }
  }

  private async writeMemberToSupabase(
    squadId: string,
    member: SquadMember,
    key: string
  ): Promise<void> {
    if (!supabase) return;

    this.lastMemberSupabaseUpdate.set(key, Date.now());

    try {
      const row = mapMemberToRow(squadId, member);
      const query = supabase
        .from('squad_members')
        .upsert(row, { onConflict: 'squad_id,user_id' });

      const { error } = await withTimeout(query, 5000);
      if (error) {
        console.warn('Supabase updateMember error:', error);
      }
    } catch (err) {
      console.warn('Supabase updateMember timeout/error:', err);
    }
  }

  // ==========================================================
  // REMOVE MEMBER
  // ==========================================================

  async removeMember(squadId: string, userId: string): Promise<void> {
    localSyncService.removeMember(squadId, userId);

    const key = `${squadId}_${userId}`;
    const timer = this.memberUpdateTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.memberUpdateTimers.delete(key);
    }
    this.lastMemberSupabaseUpdate.delete(key);

    if (isSupabaseConfigured() && supabase) {
      try {
        const query = supabase
          .from('squad_members')
          .delete()
          .eq('squad_id', squadId)
          .eq('user_id', userId);

        const { error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase removeMember error:', error);
        }
      } catch (err) {
        console.warn('Supabase removeMember error/timeout:', err);
      }
    }
  }

  // ==========================================================
  // SUBSCRIBE TO MEMBERS
  // ==========================================================

  subscribeToMembers(
    squadId: string,
    callback: (members: SquadMember[]) => void
  ): () => void {
    const unsubLocal = localSyncService.subscribeToMembers(squadId, callback);
    let channel: any = null;
    const membersCache = new Map<string, SquadMember>();

    if (isSupabaseConfigured() && supabase) {
      try {
        // Initial fetch
        this.getMembers(squadId)
          .then((initialList) => {
            if (initialList && initialList.length > 0) {
              initialList.forEach((m) => membersCache.set(m.userId, m));
              callback(Array.from(membersCache.values()));
            }
          })
          .catch(() => {});

        const channelName = `members_sub_${squadId}_${Math.random().toString(36).substring(2, 7)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'squad_members',
              filter: `squad_id=eq.${squadId}`
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                const deletedUserId = payload.old?.user_id;
                if (deletedUserId) {
                  membersCache.delete(deletedUserId);
                }
              } else if (payload.new) {
                const member = mapMemberRow(payload.new);
                membersCache.set(member.userId, member);
              }
              callback(Array.from(membersCache.values()));
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase subscribeToMembers init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }

  // ==========================================================
  // MESSAGES
  // ==========================================================

  async sendMessage(squadId: string, message: ChatMessage): Promise<void> {
    localSyncService.sendMessage(squadId, message);

    if (isSupabaseConfigured() && supabase) {
      try {
        const row = mapMessageToRow(squadId, message);
        const query = supabase
          .from('chat_messages')
          .insert(row);

        const { error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase sendMessage error:', error);
        }
      } catch (err) {
        console.warn('Supabase sendMessage error/timeout:', err);
      }
    }
  }

  // ==========================================================
  // SUBSCRIBE TO MESSAGES (PRESERVES TIMESTAMP ORDERING)
  // ==========================================================

  subscribeToMessages(
    squadId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const unsubLocal = localSyncService.subscribeToMessages(squadId, callback);
    let channel: any = null;
    const messagesCache = new Map<string, ChatMessage>();

    const emitSorted = () => {
      const sorted = Array.from(messagesCache.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );
      if (sorted.length > 0) {
        callback(sorted);
      }
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        // Initial fetch
        const fetchMessages = async () => {
          if (!supabase) return;
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('squad_id', squadId)
            .order('timestamp', { ascending: true });

          if (!error && data && data.length > 0) {
            data.forEach((r) => {
              const msg = mapMessageRow(r);
              messagesCache.set(msg.id, msg);
            });
            emitSorted();
          }
        };
        fetchMessages().catch(() => {});

        const channelName = `messages_sub_${squadId}_${Math.random().toString(36).substring(2, 7)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'chat_messages',
              filter: `squad_id=eq.${squadId}`
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                const deletedId = payload.old?.id;
                if (deletedId) messagesCache.delete(deletedId);
              } else if (payload.new) {
                const msg = mapMessageRow(payload.new);
                messagesCache.set(msg.id, msg);
              }
              emitSorted();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase subscribeToMessages init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
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
    localSyncService.saveSuggestion(squadId, suggestion);

    if (isSupabaseConfigured() && supabase) {
      try {
        const row = mapSuggestionToRow(squadId, suggestion);
        const query = supabase
          .from('place_suggestions')
          .upsert(row, { onConflict: 'id' });

        const { error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase saveSuggestion error:', error);
        }
      } catch (err) {
        console.warn('Supabase saveSuggestion error/timeout:', err);
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
    localSyncService.voteSuggestion(squadId, suggestionId, userId, vote);

    if (isSupabaseConfigured() && supabase) {
      try {
        const fetchQuery = supabase
          .from('place_suggestions')
          .select('votes')
          .eq('squad_id', squadId)
          .eq('id', suggestionId)
          .maybeSingle();

        const { data } = await withTimeout(fetchQuery, 5000);
        const currentVotes = (data?.votes && typeof data.votes === 'object') ? data.votes : {};
        const updatedVotes = { ...currentVotes, [userId]: vote };

        const updateQuery = supabase
          .from('place_suggestions')
          .update({ votes: updatedVotes })
          .eq('squad_id', squadId)
          .eq('id', suggestionId);

        const { error } = await withTimeout(updateQuery, 5000);
        if (error) {
          console.warn('Supabase voteSuggestion error:', error);
        }
      } catch (err) {
        console.warn('Supabase voteSuggestion error/timeout:', err);
      }
    }
  }

  // ==========================================================
  // SUBSCRIBE TO SUGGESTIONS
  // ==========================================================

  subscribeToSuggestions(
    squadId: string,
    callback: (suggestions: PlaceSuggestion[]) => void
  ): () => void {
    const unsubLocal = localSyncService.subscribeToSuggestions(squadId, callback);
    let channel: any = null;
    const suggestionsCache = new Map<string, PlaceSuggestion>();

    const emitSuggestions = () => {
      const list = Array.from(suggestionsCache.values());
      if (list.length > 0) {
        callback(list);
      }
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const fetchSuggestions = async () => {
          if (!supabase) return;
          const { data, error } = await supabase
            .from('place_suggestions')
            .select('*')
            .eq('squad_id', squadId);

          if (!error && data && data.length > 0) {
            data.forEach((r) => {
              const sug = mapSuggestionRow(r);
              suggestionsCache.set(sug.id, sug);
            });
            emitSuggestions();
          }
        };
        fetchSuggestions().catch(() => {});

        const channelName = `suggestions_sub_${squadId}_${Math.random().toString(36).substring(2, 7)}`;
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'place_suggestions',
              filter: `squad_id=eq.${squadId}`
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                const deletedId = payload.old?.id;
                if (deletedId) suggestionsCache.delete(deletedId);
              } else if (payload.new) {
                const sug = mapSuggestionRow(payload.new);
                suggestionsCache.set(sug.id, sug);
              }
              emitSuggestions();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase subscribeToSuggestions init error:', err);
      }
    }

    return () => {
      unsubLocal();
      if (channel && supabase) {
        supabase.removeChannel(channel).catch(() => {});
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
    localSyncService.setRegroupPoint(squadId, regroupPoint);

    if (isSupabaseConfigured() && supabase) {
      try {
        const query = supabase
          .from('squads')
          .update({
            active_regroup_point: regroupPoint ? cleanObject(regroupPoint) : null
          })
          .eq('squad_id', squadId);

        const { error } = await withTimeout(query, 5000);
        if (error) {
          console.warn('Supabase setRegroupPoint error:', error);
        }
      } catch (err) {
        console.warn('Supabase setRegroupPoint error/timeout:', err);
      }
    }
  }
}

// ============================================================
// SINGLE SERVICE INSTANCE
// ============================================================

export const squadDataService = new SquadDataService();
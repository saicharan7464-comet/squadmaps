export type QuickActionType = 
  | 'wait_for_me'
  | 'stopping'
  | 'meet_here'
  | 'fuel_stop'
  | 'food_stop'
  | 'reached'
  | 'take_route';

export type MessageType = 'chat' | 'quick_action' | 'regroup' | 'alert' | 'arrival';

export interface ChatMessage {
  id: string;
  squadId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  text: string;
  type: MessageType;
  quickAction?: QuickActionType;
  timestamp: number;
}

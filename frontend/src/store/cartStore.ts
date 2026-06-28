import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product_id: string;
  quantity: number;
  icing_text?: string;
  size?: string; // Chosen variant/weight, e.g. "2KG"
  name?: string; // Cache the name for display
  price?: number; // Cache the price for display
  image?: string; // Cache the image for display
}

/** A single action in the agent's live "thinking" timeline. */
export interface AgentStep {
  id: string;
  /** 'thinking' = reasoning, 'tool' = an MCP tool invocation. */
  kind: 'thinking' | 'tool';
  label: string;
  status: 'running' | 'done';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'text' | 'voice';         // 'voice' for recorded audio messages
  lang?: string;                    // detected language code: en|ta|si|ta-rom|si-rom
  transcript?: string;              // voice message transcript (same as content after resolve)
  audioUrl?: string;                // object URL of the recorded audio blob
  thought?: string;
  steps?: AgentStep[];
  done?: boolean;
  products?: any[];
  productDetail?: any;              // a single looked-up product (with size variants)
  order?: Record<string, unknown>;  // structured order tracking result
  orderConfirmation?: Record<string, unknown>; // full submitted order (create_order)
  isProcessingVoice?: boolean;      // true while audio is uploading/transcribing
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type LanguagePreference = 'AUTO' | 'EN' | 'SI' | 'TA';

interface AppState {
  cart: CartItem[];
  conversations: Record<string, Conversation>;
  conversationOrder: string[]; // most-recent-first, drives the sidebar list
  languagePreference: LanguagePreference;

  addToCart: (item: CartItem) => void;
  removeFromCart: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  clearCart: () => void;

  createConversation: () => string;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'timestamp' | 'role'>>,
  ) => void;

  setLanguagePreference: (lang: LanguagePreference) => void;
}

const titleFromText = (text: string) => (text.length > 42 ? `${text.slice(0, 42)}…` : text);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      cart: [],
      conversations: {},
      conversationOrder: [],
      languagePreference: 'AUTO',

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((c) => c.product_id === item.product_id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.product_id === item.product_id
                  ? { ...c, quantity: c.quantity + (item.quantity || 1) }
                  : c,
              ),
            };
          }
          return { cart: [...state.cart, item] };
        }),

      removeFromCart: (product_id) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.product_id !== product_id),
        })),

      updateQuantity: (product_id, quantity) =>
        set((state) => ({
          cart: state.cart.map((c) => (c.product_id === product_id ? { ...c, quantity } : c)),
        })),

      clearCart: () => set({ cart: [] }),

      createConversation: () => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: { id, title: 'New chat', messages: [], createdAt: now, updatedAt: now },
          },
          conversationOrder: [id, ...state.conversationOrder],
        }));
        return id;
      },

      deleteConversation: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.conversations;
          return {
            conversations: rest,
            conversationOrder: state.conversationOrder.filter((cid) => cid !== id),
          };
        }),

      addMessage: (conversationId, message) => {
        const id = crypto.randomUUID();
        set((state) => {
          const convo = state.conversations[conversationId];
          if (!convo) return state;
          const isFirstUserMessage =
            message.role === 'user' && !convo.messages.some((m) => m.role === 'user');
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...convo,
                title: isFirstUserMessage ? titleFromText(message.content) : convo.title,
                messages: [...convo.messages, { ...message, id, timestamp: Date.now() }],
                updatedAt: Date.now(),
              },
            },
          };
        });
        return id;
      },

      updateMessage: (conversationId, messageId, patch) =>
        set((state) => {
          const convo = state.conversations[conversationId];
          if (!convo) return state;
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...convo,
                messages: convo.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, ...patch } : msg,
                ),
                updatedAt: Date.now(),
              },
            },
          };
        }),

      setLanguagePreference: (lang) => set({ languagePreference: lang }),
    }),
    {
      name: 'kapruka-agent-storage',
      version: 3,
      // v1 stored a flat `chatHistory` array. v2 moved to multi-conversation.
      // v3 does a one-time reset of the conversation list to clear leftover test
      // chats ("hello", "hwllo", duplicates) so the demo opens clean. The cart is
      // preserved in every case (its shape is unchanged).
      migrate: (persistedState, version) => {
        const old = persistedState as Partial<{ cart: CartItem[] }> | undefined;
        if (version < 3) {
          return {
            cart: old?.cart ?? [],
            conversations: {},
            conversationOrder: [],
            languagePreference: 'AUTO',
          } as unknown as AppState;
        }
        return persistedState as AppState;
      },
    },
  ),
);

import { useAppStore } from '../store/cartStore';
import type { AgentStep } from '../store/cartStore';

const API_BASE = 'http://localhost:8000';

let _pendingOrderIds: string[] = [];

export function setPendingOrderItems(ids: string[]): void {
  _pendingOrderIds = ids;
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;


// ── Core SSE streaming ─────────────────────────────────────────────────────────

/**
 * Streams the agent SSE response into an already-created bot message slot.
 * Reads conversation history from the store (excluding the bot placeholder).
 */
async function _streamIntoMessage(conversationId: string, botMsgId: string): Promise<void> {
  let currentText     = '';
  let currentThought  = '';
  let currentProducts: any[] = [];
  let currentProductDetail: any = null;
  const steps: AgentStep[] = [];
  const stepByTool    = new Map<string, AgentStep>();
  let thinkingStep: AgentStep | null = null;

  const flush = () => {
    useAppStore.getState().updateMessage(conversationId, botMsgId, {
      content:  currentText,
      thought:  currentThought || undefined,
      steps:    steps.length ? [...steps] : undefined,
      products: currentProducts.length ? currentProducts : undefined,
      productDetail: currentProductDetail ?? undefined,
    });
  };

  try {
    const conversation = useAppStore.getState().conversations[conversationId];
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: (conversation?.messages ?? [])
          .filter((m) => m.id !== botMsgId && !m.isProcessingVoice)
          .map((m) => ({ role: m.role, content: m.content || m.transcript || '' })),
        cart: useAppStore.getState().cart,
        language_preference: useAppStore.getState().languagePreference ?? 'auto',
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader  = response.body?.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (sseBuffer + chunk).split('\n');
        sseBuffer = lines.pop() ?? '';

        let dirty = false;

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;

          try {
            const event = JSON.parse(payload);

            if (event.type === 'detected_lang' && event.lang) {
              useAppStore.getState().updateMessage(conversationId, botMsgId, {
                lang: event.lang,
              });
            } else if (event.type === 'text') {
              currentText += event.content ?? '';
              if (thinkingStep && thinkingStep.status === 'running') {
                thinkingStep.status = 'done';
                thinkingStep.label  = 'Thought through your request';
                thinkingStep = null;
              }
              dirty = true;
            } else if (event.type === 'thought' || event.type === 'reasoning') {
              currentThought += event.content ?? '';
              if (!thinkingStep) {
                thinkingStep = { id: uid(), kind: 'thinking', label: 'Thinking', status: 'running' };
                steps.push(thinkingStep);
              }
              dirty = true;
            } else if (event.type === 'tool_use') {
              if (thinkingStep && thinkingStep.status === 'running') {
                thinkingStep.status = 'done';
                thinkingStep = null;
              }
              const step: AgentStep = {
                id: uid(),
                kind: 'tool',
                label: event.label ?? prettyToolName(event.name),
                status: 'running',
              };
              steps.push(step);
              stepByTool.set(event.name, step);
              dirty = true;
            } else if (event.type === 'products') {
              if (Array.isArray(event.items)) {
                currentProducts = [...currentProducts, ...event.items];
              }
              dirty = true;
            } else if (event.type === 'product_detail') {
              if (event.item) currentProductDetail = event.item;
              dirty = true;
            } else if (event.type === 'cart_add') {
              // Agent added item(s) to the cart on the customer's behalf
              // (e.g. "add the second one"). Apply to the React cart store.
              if (Array.isArray(event.items)) {
                const { addToCart } = useAppStore.getState();
                for (const it of event.items) {
                  if (!it?.product_id || !it?.name) continue;
                  addToCart({
                    product_id: String(it.product_id),
                    quantity: Number(it.quantity) || 1,
                    name: it.name,
                    price: typeof it.price === 'number' ? it.price : undefined,
                    image: it.image,
                    size: it.size,
                    icing_text: it.icing_text,
                  });
                }
              }
              dirty = true;
            } else if (event.type === 'order') {
              if (event.order) {
                useAppStore.getState().updateMessage(conversationId, botMsgId, {
                  order: event.order,
                });
              }
              dirty = true;
            } else if (event.type === 'order_confirmation') {
              if (event.order) {
                useAppStore.getState().updateMessage(conversationId, botMsgId, {
                  orderConfirmation: event.order,
                });
                if (_pendingOrderIds.length) {
                  const { removeFromCart } = useAppStore.getState();
                  _pendingOrderIds.forEach((id) => removeFromCart(id));
                  _pendingOrderIds = [];
                }
              }
              dirty = true;
            } else if (event.type === 'tool_result') {
              const step = stepByTool.get(event.name);
              if (step) {
                step.status = 'done';
                step.label  = doneLabel(step.label);
              }
              // Legacy fallback: JSON product arrays
              if (
                (event.name === 'kapruka_search_products' || event.tool === 'kapruka_search_products') &&
                event.data
              ) {
                try {
                  const toolData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                  const results  = toolData.results ?? toolData;
                  if (Array.isArray(results)) currentProducts = [...currentProducts, ...results];
                } catch { /* markdown result — products come via products event */ }
              }
              dirty = true;
            } else if (event.type === 'error') {
              currentText += `\n\n⚠️ ${event.content ?? 'Something went wrong.'}`;
              dirty = true;
            }
          } catch (e) {
            console.warn('[SSE] parse error:', payload, e);
          }
        }

        if (dirty) flush();
      }
    }
  } catch (error) {
    console.error('[chat] fetch error:', error);
    currentText = currentText || '⚠️ Could not reach the agent. Please try again.';
  } finally {
    steps.forEach(s => (s.status = 'done'));
    useAppStore.getState().updateMessage(conversationId, botMsgId, {
      content:  currentText,
      thought:  currentThought || undefined,
      steps:    steps.length ? [...steps] : undefined,
      products: currentProducts.length ? currentProducts : undefined,
      productDetail: currentProductDetail ?? undefined,
      done: true,
    });
  }
}


// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send a text message and stream the agent response.
 */
export async function sendAgentMessage(conversationId: string, text: string): Promise<void> {
  const store = useAppStore.getState();
  store.addMessage(conversationId, { role: 'user', content: text });
  const botMsgId = store.addMessage(conversationId, { role: 'model', content: '', done: false });
  await _streamIntoMessage(conversationId, botMsgId);
}


/**
 * Upload a voice blob, transcribe it, and stream the localized agent response.
 */
export async function sendVoiceMessage(conversationId: string, blob: Blob): Promise<void> {
  const store = useAppStore.getState();

  const audioUrl = URL.createObjectURL(blob);

  // Add voice user bubble (transcript pending)
  const userMsgId = store.addMessage(conversationId, {
    role: 'user',
    type: 'voice',
    content: '',
    audioUrl,
  });

  // Add bot shimmer placeholder
  const botMsgId = store.addMessage(conversationId, {
    role: 'model',
    content: '',
    done: false,
    isProcessingVoice: true,
  });

  try {
    const formData = new FormData();
    formData.append('audio', blob, blob.type.includes('ogg') ? 'recording.ogg' : 'recording.webm');

    const res = await fetch(`${API_BASE}/api/audio`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const transcript    = (data.transcript ?? data.transcription ?? '').trim();
    const detected_lang = data.detected_lang ?? 'en';

    if (!transcript) {
      useAppStore.getState().updateMessage(conversationId, userMsgId, {
        content: '[Voice message]',
        type: 'voice',
        done: true,
      });
      useAppStore.getState().updateMessage(conversationId, botMsgId, {
        content: "Sorry, I couldn't understand the audio. Please try again.",
        done: true,
        isProcessingVoice: false,
      });
      return;
    }

    // Update voice bubble with transcript + detected lang
    useAppStore.getState().updateMessage(conversationId, userMsgId, {
      content: transcript,
      transcript,
      lang: detected_lang,
    });

    // Clear the shimmer flag and stream the real reply
    useAppStore.getState().updateMessage(conversationId, botMsgId, {
      isProcessingVoice: false,
    });

    await _streamIntoMessage(conversationId, botMsgId);

  } catch (err) {
    console.error('[voice] upload error:', err);
    useAppStore.getState().updateMessage(conversationId, userMsgId, {
      content: '[Voice message]',
      type: 'voice',
      audioUrl,
      done: true,
    });
    useAppStore.getState().updateMessage(conversationId, botMsgId, {
      content: '⚠️ Voice upload failed. Please try again.',
      done: true,
      isProcessingVoice: false,
    });
  }
}


// ── Helpers ────────────────────────────────────────────────────────────────────

function prettyToolName(name?: string): string {
  if (!name) return 'Working';
  const pretty = name.replace('kapruka_', '').replace(/_/g, ' ').trim();
  return pretty ? `Running ${pretty}` : 'Working';
}

function doneLabel(label: string): string {
  return label
    .replace(/^Searching /, 'Searched ')
    .replace(/^Checking /,  'Checked ')
    .replace(/^Placing /,   'Placed ')
    .replace(/^Loading /,   'Loaded ')
    .replace(/^Tracking /,  'Tracked ')
    .replace(/^Browsing /,  'Browsed ')
    .replace(/^Looking /,   'Looked ')
    .replace(/^Running /,   'Ran ');
}

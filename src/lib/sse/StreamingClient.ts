export type SSEEventHandler = (data: any) => void;

type ConnectOptions = {
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
};

export class StreamingClient {
  // 🔥 GLOBAL SINGLETON CONNECTION + HANDLERS
  private static globalSource: EventSource | null = null;
  private static globalUrl: string | null = null;
  private static globalHandlers: Record<string, SSEEventHandler[]> = {};

  private url: string | null = null;
  private closedByClient = false;

  private retryDelayMs = 500;
  private maxRetryDelayMs = 8000;
  private retryTimer: number | null = null;

  connect(url: string, options?: ConnectOptions) {
    this.url = url;
    this.closedByClient = false;

    if (options?.retryDelayMs !== undefined) {
      this.retryDelayMs = options.retryDelayMs;
    }
    if (options?.maxRetryDelayMs !== undefined) {
      this.maxRetryDelayMs = options.maxRetryDelayMs;
    }

    // 🔥 HARD SINGLETON: never allow multiple connections
    if (StreamingClient.globalSource) {
      console.log("🧠 SSE already connected — skipping reconnect");
      return;
    }

    this.open();
  }

  on(event: string, handler: SSEEventHandler) {
    // 🔥 ALWAYS KEEP ONLY ONE HANDLER PER EVENT
    StreamingClient.globalHandlers[event] = [handler];
  }

  offAll() {
    // 🔥 CLEAR ALL GLOBAL HANDLERS
    StreamingClient.globalHandlers = {};
  }

  close() {
    this.closedByClient = true;

    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (StreamingClient.globalSource) {
      StreamingClient.globalSource.close();
      StreamingClient.globalSource = null;
      StreamingClient.globalUrl = null;
    }

    StreamingClient.globalHandlers = {};
  }

  private open() {
    if (!this.url) return;

    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    // 🔥 ALWAYS CLOSE EXISTING CONNECTION
    if (StreamingClient.globalSource) {
      StreamingClient.globalSource.close();
      StreamingClient.globalSource = null;
      StreamingClient.globalUrl = null;
    }

    try {
      const es = new EventSource(this.url);

      StreamingClient.globalSource = es;
      StreamingClient.globalUrl = this.url;

      es.addEventListener("open", () => {
        this.retryDelayMs = Math.max(
          250,
          Math.min(this.retryDelayMs, this.maxRetryDelayMs)
        );
        this.dispatch("sse.open", {});
      });

      es.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatch("message", data);
        } catch {}
      };

      const knownEvents = [
        "message.start",
        "message.delta",
        "message.complete",
        "system.notice",
        "execution.artifact",
        "execution.lifecycle",
        "ready",
      ];

      knownEvents.forEach((eventName) => {
        es.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            this.dispatch(eventName, data);
          } catch {}
        });
      });

      es.addEventListener("error", () => {
        if (!this.closedByClient) {
          this.scheduleReconnect();
        }
      });
    } catch {
      if (!this.closedByClient) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.closedByClient) return;
    if (!this.url) return;
    if (this.retryTimer !== null) return;

    const delay = Math.min(this.retryDelayMs, this.maxRetryDelayMs);

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.retryDelayMs = Math.min(
        this.retryDelayMs * 2,
        this.maxRetryDelayMs
      );
      this.open();
    }, delay);
  }

  private dispatch(event: string, data: any) {
    const list = StreamingClient.globalHandlers[event];
    if (!list || list.length === 0) return;

    list.forEach((handler) => {
      try {
        handler(data);
      } catch {}
    });
  }
}
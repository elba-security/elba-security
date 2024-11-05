export class EventEmitter {
  private listeners: Record<string, ((...args: unknown[]) => void | Promise<void>)[]>;

  constructor() {
    this.listeners = {};
  }

  on(event: string, callback: (...args: unknown[]) => void | Promise<void>) {
    if (!Object.hasOwn(this.listeners, event)) {
      this.listeners[event] = [];
    }

    // Ensure array exists after hasOwn check
    const listeners = this.listeners[event];
    if (listeners) {
      listeners.push(callback);
    }

    return this;
  }

  async emit(event: string, ...data: unknown[]): Promise<void> {
    if (!Object.hasOwn(this.listeners, event)) {
      return;
    }

    const listeners = this.listeners[event];
    if (listeners) {
      for (const callback of listeners) {
        await callback.call(this, ...data);
      }
    }
  }
}

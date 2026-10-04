import "server-only";

import { EventEmitter } from "events";
import { randomBytes } from "crypto";
import type { CacheBackend, ChangeListener } from "@/app/_lib/cache/types";

export const CHANGE_EVENT = "disk-change";

const MAX_BYTES = 64 * 1024 * 1024;

interface Entry {
  value: string;
  expiresAt: number;
}

export const newEpoch = (): string => randomBytes(8).toString("base64url");

export const changeBus = (): EventEmitter => {
  const bus = new EventEmitter();
  bus.setMaxListeners(0);
  return bus;
};

export const onChange = (bus: EventEmitter, listener: ChangeListener) => {
  bus.on(CHANGE_EVENT, listener);
  return () => {
    bus.off(CHANGE_EVENT, listener);
  };
};

export const memoryBackend = (): CacheBackend => {
  const entries = new Map<string, Entry>();
  const counters = new Map<string, string>();
  const bus = changeBus();
  let usedBytes = 0;

  const _drop = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return;

    usedBytes -= entry.value.length;
    entries.delete(key);
  };

  const _trim = () => {
    for (const key of entries.keys()) {
      if (usedBytes <= MAX_BYTES) return;
      _drop(key);
    }
  };

  const _epochOf = (scope: string): string => {
    const existing = counters.get(scope);
    if (existing) return existing;

    const created = newEpoch();
    counters.set(scope, created);
    return created;
  };

  return {
    read: async (key) => {
      const entry = entries.get(key);
      if (!entry) return null;

      _drop(key);
      if (entry.expiresAt <= Date.now()) return null;

      entries.set(key, entry);
      usedBytes += entry.value.length;
      return entry.value;
    },

    write: async (key, value, ttlSeconds) => {
      _drop(key);
      entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      usedBytes += value.length;
      _trim();
    },

    epochs: async (scopes) => scopes.map(_epochOf),

    bump: async (scopes) => {
      for (const scope of scopes) counters.set(scope, newEpoch());
    },

    announce: async (change) => {
      bus.emit(CHANGE_EVENT, change);
    },

    listen: (listener) => onChange(bus, listener),
  };
};

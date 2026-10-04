import "server-only";

import Valkey from "iovalkey";
import type { CacheBackend, DiskChange } from "@/app/_lib/cache/types";
import {
  CHANGE_EVENT,
  changeBus,
  newEpoch,
  onChange,
} from "@/app/_lib/cache/memory";
import { logger } from "@/app/_lib/logger";

const SCOPE = "valkey";

enum KeyKind {
  CACHE = "c",
  EPOCH = "e",
  CHANNEL = "disk-changes",
}

const COMMAND_OPTIONS = { enableOfflineQueue: false, maxRetriesPerRequest: 1 };

const _watchHealth = (client: Valkey, role: string) => {
  let isDown = false;

  client.on("error", (error) => {
    if (isDown) return;
    isDown = true;
    logger.warn(SCOPE, `Valkey ${role} connection lost`, error);
  });

  client.on("ready", () => {
    if (isDown) logger.info(SCOPE, `Valkey ${role} connection restored`);
    isDown = false;
  });
};

const _parseChange = (message: string): DiskChange | null => {
  try {
    const parsed = JSON.parse(message) as DiskChange;
    return Array.isArray(parsed.paths) ? parsed : null;
  } catch (error) {
    logger.warn(SCOPE, "Ignoring malformed change message", error);
    return null;
  }
};

export const valkeyBackend = (url: string, prefix: string): CacheBackend => {
  const client = new Valkey(url, COMMAND_OPTIONS);
  const subscriber = new Valkey(url);
  const bus = changeBus();
  const channel = `${prefix}${KeyKind.CHANNEL}`;

  const _key = (kind: KeyKind, name: string) => `${prefix}${kind}:${name}`;

  _watchHealth(client, "command");
  _watchHealth(subscriber, "subscriber");

  subscriber.subscribe(channel).catch((error) => {
    logger.error(SCOPE, "Cannot subscribe to change channel", error);
  });

  subscriber.on("message", (from: string, message: string) => {
    if (from !== channel) return;

    const change = _parseChange(message);
    if (change) bus.emit(CHANGE_EVENT, change);
  });

  const _claimEpoch = async (scope: string): Promise<string> => {
    const key = _key(KeyKind.EPOCH, scope);
    const created = newEpoch();
    const claimed = await client.set(key, created, "NX");
    return claimed ? created : ((await client.get(key)) ?? created);
  };

  return {
    read: (key) => client.get(_key(KeyKind.CACHE, key)),

    write: async (key, value, ttlSeconds) => {
      await client.set(_key(KeyKind.CACHE, key), value, "EX", ttlSeconds);
    },

    epochs: async (scopes) => {
      const keys = scopes.map((scope) => _key(KeyKind.EPOCH, scope));
      const values = await client.mget(...keys);

      return Promise.all(
        values.map((value, index) => value ?? _claimEpoch(scopes[index]))
      );
    },

    bump: async (scopes) => {
      if (scopes.length === 0) return;

      const pairs = scopes.flatMap((scope) => [
        _key(KeyKind.EPOCH, scope),
        newEpoch(),
      ]);
      await client.mset(...pairs);
    },

    announce: async (change) => {
      try {
        await client.publish(channel, JSON.stringify(change));
      } catch (error) {
        logger.warn(SCOPE, "Publish failed, notifying locally only", error);
        bus.emit(CHANGE_EVENT, change);
      }
    },

    listen: (listener) => onChange(bus, listener),
  };
};

"use client";

import { useEffect } from "react";

const SW_URL = "/api/serwist/sw.js";
const LEGACY_SW_PATH = "/sw.js";

const _dropLegacyWorkers = async (): Promise<void> => {
  const registrations = await navigator.serviceWorker.getRegistrations();

  for (const registration of registrations) {
    const scriptUrl = registration.active?.scriptURL ?? "";
    if (new URL(scriptUrl, window.location.origin).pathname === LEGACY_SW_PATH) {
      await registration.unregister();
    }
  }
};

const _promptOnUpdate = (registration: ServiceWorkerRegistration): void => {
  registration.addEventListener("updatefound", () => {
    const newWorker = registration.installing;

    newWorker?.addEventListener("statechange", () => {
      const isUpdate =
        newWorker.state === "installed" && !!navigator.serviceWorker.controller;

      if (isUpdate && confirm("New version available! Reload to update?")) {
        window.location.reload();
      }
    });
  });
};

const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    _dropLegacyWorkers()
      .then(() =>
        navigator.serviceWorker.register(SW_URL, {
          scope: "/",
          updateViaCache: "none",
        })
      )
      .then(_promptOnUpdate)
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  }, []);

  return null;
};

export default ServiceWorkerRegistrar;

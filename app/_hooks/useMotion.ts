import { useSyncExternalStore } from "react";
import { prefersReduced, watchReduced } from "@/app/_lib/motion";

const _serverReduced = (): boolean => false;

export const useMotion = (): boolean =>
  !useSyncExternalStore(watchReduced, prefersReduced, _serverReduced);

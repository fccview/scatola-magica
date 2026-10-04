import { REDUCED_MOTION_QUERY } from "@/app/_lib/constants";

export const watchReduced = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export const prefersReduced = (): boolean =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

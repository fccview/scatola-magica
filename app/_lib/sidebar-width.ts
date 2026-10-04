import {
  SIDEBAR_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_CSS_VAR,
  SIDEBAR_WIDTH,
} from "@/app/_lib/constants";

export const clampWidth = (width: number, ceiling: number = SIDEBAR_WIDTH.MAX): number =>
  Math.round(Math.min(ceiling, SIDEBAR_WIDTH.MAX, Math.max(SIDEBAR_WIDTH.MIN, width)));

export const parseWidth = (value?: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return SIDEBAR_WIDTH.DEFAULT;
  return clampWidth(parsed);
};

export const widthStyle = (width: number): Record<string, string> => ({
  [SIDEBAR_CSS_VAR]: `${width}px`,
});

export const storeWidth = (width: number): void => {
  document.cookie = `${SIDEBAR_COOKIE}=${width}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  document.documentElement.style.setProperty(SIDEBAR_CSS_VAR, `${width}px`);
};

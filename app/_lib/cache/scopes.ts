import "server-only";

import path from "path";
import { UPLOAD_DIR } from "@/app/_lib/storage";

export enum ScopeKind {
  ALL = "all",
  ROOT = "root",
  DIR = "dir",
  TREE = "tree",
}

export const ALL_SCOPE = `${ScopeKind.ALL}:`;

export const toRelative = (absolute: string): string =>
  path.relative(UPLOAD_DIR, absolute).split(path.sep).join("/");

const _parentOf = (relative: string): string => {
  const parent = path.posix.dirname(relative);
  return parent === "." ? "" : parent;
};

export const rootScope = (ownerRoot: string): string =>
  `${ScopeKind.ROOT}:${toRelative(ownerRoot)}`;

const _lineage = (relative: string): string[] =>
  relative
    .split("/")
    .filter(Boolean)
    .map((_, index, parts) => parts.slice(0, index + 1).join("/"));

export const dirScopes = (dirAbs: string): string[] => {
  const relative = toRelative(dirAbs);

  return [
    `${ScopeKind.DIR}:${relative}`,
    ..._lineage(relative).map((entry) => `${ScopeKind.TREE}:${entry}`),
  ];
};

export const scopesFor = (relative: string): string[] => {
  const parent = _parentOf(relative);
  const owner = relative.split("/")[0];

  return [
    `${ScopeKind.ROOT}:`,
    `${ScopeKind.ROOT}:${owner}`,
    `${ScopeKind.DIR}:${relative}`,
    `${ScopeKind.DIR}:${parent}`,
    `${ScopeKind.DIR}:${_parentOf(parent)}`,
    `${ScopeKind.TREE}:${relative}`,
  ];
};

export const isWithin = (relative: string, rootRelative: string): boolean =>
  rootRelative === "" ||
  relative === rootRelative ||
  relative.startsWith(`${rootRelative}/`);

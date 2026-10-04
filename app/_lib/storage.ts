import "server-only";

import path from "path";

export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || "./data/uploads"
);
export const TEMP_DIR_NAME = "temp";
export const TEMP_DIR = path.join(UPLOAD_DIR, TEMP_DIR_NAME);
export const THUMBNAIL_DIR = path.resolve(
  process.env.THUMBNAIL_CACHE_DIR || "./data/thumbnails"
);

export const PATH_ESCAPE_ERROR = "Nice try, Houdini. Path is outside your box";

const MAX_NAME_LENGTH = 255;
const FORBIDDEN_NAME_CHARS = /[/\\\0]/;

export interface StorageOwner {
  username: string;
  isAdmin: boolean;
}

export interface ScopedPath {
  absolute: string;
  relative: string;
}

export class PathEscapeError extends Error {
  constructor() {
    super(PATH_ESCAPE_ERROR);
    this.name = "PathEscapeError";
  }
}

const _toPosix = (value: string): string => value.split(path.sep).join("/");

export const isInside = (base: string, target: string): boolean => {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
};

export const isValidName = (name: unknown): name is string =>
  typeof name === "string" &&
  name.trim().length > 0 &&
  name.length <= MAX_NAME_LENGTH &&
  name !== "." &&
  name !== ".." &&
  !FORBIDDEN_NAME_CHARS.test(name);

export const userRoot = (owner: StorageOwner): string =>
  owner.isAdmin ? UPLOAD_DIR : path.join(UPLOAD_DIR, owner.username);

export const resolveIn = (base: string, relative = ""): string => {
  const absolute = path.resolve(path.join(base, relative || ""));

  if (!isInside(base, absolute) || isInside(TEMP_DIR, absolute)) {
    throw new PathEscapeError();
  }

  return absolute;
};

export const scopedPath = (
  owner: StorageOwner,
  relative = ""
): ScopedPath => {
  const absolute = resolveIn(userRoot(owner), relative);
  return { absolute, relative: _toPosix(path.relative(UPLOAD_DIR, absolute)) };
};

export const scopedId = (owner: StorageOwner, absolute: string): string =>
  _toPosix(path.relative(userRoot(owner), absolute));

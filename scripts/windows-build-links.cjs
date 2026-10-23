// Next 15 copies pnpm directory links with an untyped symlink call. Windows
// junctions need no symlink privilege and preserve the directory-link behavior.
// This adapter is loaded only in Windows build processes, never app runtime.
const fs = require("node:fs");
const path = require("node:path");
const { syncBuiltinESMExports } = require("node:module");

if (process.platform === "win32") {
  const typeFor = (target, destination, type) => {
    const resolved = path.resolve(path.dirname(destination), target);
    return fs.statSync(resolved).isDirectory() ? "junction" : type;
  };
  const originalPromise = fs.promises.symlink.bind(fs.promises);
  fs.promises.symlink = (target, destination, type) =>
    originalPromise(target, destination, typeFor(target, destination, type));
  const original = fs.symlink.bind(fs);
  fs.symlink = (target, destination, type, callback) => {
    if (typeof type === "function") {
      callback = type;
      type = undefined;
    }
    try {
      return original(
        target,
        destination,
        typeFor(target, destination, type),
        callback
      );
    } catch (error) {
      queueMicrotask(() => callback(error));
    }
  };
  syncBuiltinESMExports();
}

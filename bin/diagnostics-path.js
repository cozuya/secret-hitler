const path = require("path");

// Static handlers deny/ignore dotfiles in every relative path component. A hidden ancestor
// outside a static mount does not protect that mount's contents, so check each root separately.
module.exports = (dir, staticRoots) =>
  staticRoots.some((root) => {
    const relative = path.relative(path.resolve(root), path.resolve(dir));
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return false;
    return !relative.split(path.sep).some((part) => part.startsWith("."));
  });

// Use the scalar bundled core: the runtime's relaxed-SIMD build fails on this CPU.
const { createRequire } = require("node:module");
const ocrRequire = createRequire(require.resolve("tesseract.js"));
const features = ocrRequire("wasm-feature-detect");
features.simd = async () => false;
features.relaxedSimd = async () => false;
require(
  require("node:path").join(
    require("node:path").dirname(require.resolve("tesseract.js")),
    "worker-script/node/index.js",
  ),
);

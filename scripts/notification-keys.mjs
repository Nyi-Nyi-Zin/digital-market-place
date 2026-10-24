import { createRequire } from "node:module";
const require = createRequire(
  new URL("../packages/server/package.json", import.meta.url)
);
const { generateVAPIDKeys } = require("web-push");
const keys = generateVAPIDKeys();
console.log(
  `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}`
);

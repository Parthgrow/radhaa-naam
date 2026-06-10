import { kv } from "@vercel/kv";

export const getKVClient = () => kv;

export { kv };

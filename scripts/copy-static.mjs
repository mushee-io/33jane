import { mkdir, copyFile } from "node:fs/promises";

await mkdir("public", { recursive: true });
await copyFile("index.html", "public/index.html");
console.log("Copied 33Jane static console to public/index.html");

import { mkdir, copyFile } from "node:fs/promises";

await mkdir("public", { recursive: true });
await Promise.all([
  copyFile("index.html", "public/index.html"),
  copyFile("console.html", "public/console.html")
]);
console.log("Copied 33Jane homepage and execution console to public/");

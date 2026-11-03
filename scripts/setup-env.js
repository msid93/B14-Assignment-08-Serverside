import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const content = example.replace(
  /^((?:BETTER_AUTH_SECRET|JWT_SECRET)=)$/gm,
  (_, name) => name + randomBytes(32).toString("hex"),
);
try {
  await writeFile(new URL("../.env", import.meta.url), content, { flag: "wx", mode: 0o600 });
  console.log(
    "Created server/.env with fresh session and JWT secrets. Add credentials for Google and ImgBB there.",
  );
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Your existing .env is already in place.");
}

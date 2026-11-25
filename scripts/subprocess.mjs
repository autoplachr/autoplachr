import { spawn } from "node:child_process";

export function subprocess(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error("Command exited with " + code)));
  });
}

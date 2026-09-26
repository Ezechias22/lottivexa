import { createConnection } from "node:net";
export function redisCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts.map((x) => `$${Buffer.byteLength(x)}\r\n${x}\r\n`).join("")}`;
}
export async function redisReady(
  value = process.env.REDIS_URL ?? "redis://localhost:6379",
  timeoutMs = 1000,
) {
  const url = new URL(value);
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port || 6379),
    });
    let settled = false,
      authenticated = !url.password;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () =>
      socket.write(
        redisCommand(
          url.password ? ["AUTH", decodeURIComponent(url.password)] : ["PING"],
        ),
      ),
    );
    socket.on("data", (chunk) => {
      const response = chunk.toString();
      if (!authenticated && response.startsWith("+OK")) {
        authenticated = true;
        socket.write(redisCommand(["PING"]));
        return;
      }
      done(authenticated && response.startsWith("+PONG"));
    });
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

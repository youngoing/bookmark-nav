import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { failure, success, type Result } from "@loomark/shared";

export type PasswordError = {
  code: "PASSWORD_HASH_FAILED";
  message: string;
};

function derivePassword(
  password: string,
  salt: string,
): Promise<Result<Buffer, PasswordError>> {
  return new Promise((resolve) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error)
        resolve(
          failure({ code: "PASSWORD_HASH_FAILED", message: "无法处理密码" }),
        );
      else resolve(success(derivedKey));
    });
  });
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split(":");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !expectedHex ||
    !/^[0-9a-f]+$/i.test(expectedHex)
  )
    return false;
  const derived = await derivePassword(password, salt);
  if (!derived.ok) return false;
  const expected = Buffer.from(expectedHex, "hex");
  return (
    expected.length === derived.value.length &&
    timingSafeEqual(expected, derived.value)
  );
}

export async function hashPassword(
  password: string,
): Promise<Result<string, PasswordError>> {
  const salt = randomBytes(16).toString("hex");
  const derived = await derivePassword(password, salt);
  return derived.ok
    ? success(`scrypt:${salt}:${derived.value.toString("hex")}`)
    : derived;
}

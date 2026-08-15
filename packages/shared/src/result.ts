export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const success = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type ResultError = { code: string; message: string };

export const fromPromise = <T, E extends ResultError>(
  promise: Promise<T>,
  mapError: (reason: Error) => E,
): Promise<Result<T, E>> => promise.then(
  (value) => success(value),
  (reason: Error) => failure(mapError(reason)),
);

/**
 * Anything that can be converted to a string.
 */
interface Stringable {
  toString(): string;
}

/**
 * Removes the trailing and forward slashes from a given string.
 *
 * @param input - The string from which to remove the trailing slash.
 * @returns The string without trailing or forward slashes.
 */
export function removeTrailingForwardSlash(input: Stringable): string {
  const str = input.toString();
  return str.replace(/\/+$/, "");
}

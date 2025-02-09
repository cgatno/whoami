const themeOptions = ["light", "dark"] as const;
/**
 * Represents a theme option from the predefined list of theme options.
 *
 * This type is derived from the `themeOptions` array, and it represents
 * one of the possible theme configurations available in the application.
 */
export type Theme = (typeof themeOptions)[number];

// Internal tracking for system theme watcher
let isWatcherActive = false;

// CSS media query for detecting system color scheme preference
const MEDIA_QUERY = "(prefers-color-scheme: dark)" as const;

/**
 * The key used to store the theme preference in local storage.
 * @constant {string}
 */
export const STORAGE_KEY = "theme";

/**
 * Checks if the given theme is a valid theme. This is meant to be used as a type guard.
 *
 * @param theme - The theme to check.
 * @returns True if the theme is valid, otherwise false.
 */
function isValidTheme(theme: string): theme is Theme {
  return themeOptions.includes(theme as Theme);
}

/**
 * Retrieves the current theme setting.
 *
 * This function first checks for a theme stored in the local storage.
 * If a valid theme is found, it returns that theme.
 * If no valid theme is found, it checks the user's system preference for dark mode.
 * If the user prefers dark mode, it returns "dark".
 * If no preference is found, it defaults to "light".
 *
 * @returns {Theme} The current theme setting, either "dark" or "light".
 */
export function getTheme(): Theme {
  const localStorageTheme = localStorage?.getItem(STORAGE_KEY) ?? "";
  if (isValidTheme(localStorageTheme)) {
    return localStorageTheme;
  }

  // If the user has a dark mode preference, use dark mode
  if (window.matchMedia(MEDIA_QUERY).matches) {
    return "dark";
  }

  // Default to light mode
  return "light";
}

/**
 * Saves the given theme to local storage and optionally applies it.
 *
 * @param theme - The theme to be saved.
 * @param apply - A boolean indicating whether to apply the theme immediately. Defaults to true.
 */
export function saveTheme(theme: Theme = getTheme(), apply: boolean = true) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    console.error("Error saving theme to localStorage:", e);
  } finally {
    if (apply) {
      applyTheme(theme);
    }
  }
}

/**
 * Resets the theme by removing the theme-related data from local storage.
 * Optionally applies the default theme after resetting.
 *
 * @param apply - A boolean flag indicating whether to apply the default theme after resetting. Defaults to `true`.
 */
export function resetTheme(apply: boolean = true) {
  localStorage.removeItem(STORAGE_KEY);

  if (apply) {
    applyTheme();
  }
}

/**
 * Applies the given theme to the document by setting a data attribute on the root element.
 *
 * @param theme - The theme to be applied. This should be a string representing the theme name.
 */
export function applyTheme(theme: Theme = getTheme()) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Watches for changes in the system-level preferred color scheme and applies the corresponding theme.
 *
 * This function listens for changes in the `prefers-color-scheme` media query and applies the
 * "dark" or "light" theme based on the user's preference. If a theme is already set in localStorage,
 * it will not override it.
 */
export function watchTheme() {
  if (isWatcherActive) {
    return;
  }

  const mediaQuery = window.matchMedia(MEDIA_QUERY);

  mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

  isWatcherActive = true;
}

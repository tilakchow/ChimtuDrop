// Web mock for mediaLibraryAdapter - avoids crashing when expo-media-library native module is missing on web

export async function requestMediaLibraryPermissions(): Promise<boolean> {
  return true;
}

export async function checkMediaLibraryPermissions(): Promise<boolean> {
  return true;
}

export async function saveToMediaLibrary(_uri: string): Promise<void> {
  // Web fallback: no native gallery available
}

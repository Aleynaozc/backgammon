// Test tools are opt-in locally and always disabled in production builds.
export function isGameDevToolsEnabled() {
  return process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_GAME_DEV_TOOLS === 'true';
}

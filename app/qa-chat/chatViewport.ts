export function calculateChatViewport(
  viewportHeight: number,
  viewportOffsetTop: number,
  windowHeight: number,
  headerHeight: number,
  navHeight: number,
  inputFocused = true,
) {
  const keyboardOpen = inputFocused && windowHeight - viewportHeight > 150;
  return {
    top: viewportOffsetTop + (keyboardOpen ? 0 : headerHeight),
    height: Math.max(0, viewportHeight - (keyboardOpen ? 0 : headerHeight + navHeight)),
    keyboardOpen,
  };
}

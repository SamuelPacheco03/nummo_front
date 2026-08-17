import '@testing-library/jest-dom/vitest'

// jsdom no implementa matchMedia; lo usan el tema y el toaster.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

// jsdom tampoco implementa scrollIntoView; lo usa la paleta de comandos para
// mantener a la vista la opción seleccionada con las flechas.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

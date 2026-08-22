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

// jsdom tampoco implementa IntersectionObserver; lo usan el revelado de las
// secciones de la portada y el conteo de secciones vistas. El doble no dispara
// nunca: lo que estos tests comprueban es el contenido, no el momento en que
// entra en pantalla.
if (!window.IntersectionObserver) {
  class ObservadorFalso {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: readonly number[] = []
  }
  window.IntersectionObserver = ObservadorFalso as unknown as typeof IntersectionObserver
}

// jsdom tampoco implementa scrollIntoView; lo usa la paleta de comandos para
// mantener a la vista la opción seleccionada con las flechas.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

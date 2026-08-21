import { renderToString } from 'react-dom/server'
import { LandingPage } from './landing-page'

/**
 * La portada, renderizada a texto para meterla en `dist/index.html`.
 *
 * **Por qué existe:** sin esto, `dist/index.html` es un `<div>` vacío. Google lo acaba
 * ejecutando, pero WhatsApp, Slack, Twitter y cualquier previsualización de enlace **no
 * ejecutan JavaScript**: verían una página en blanco donde debería estar el titular.
 *
 * Lo que sale de aquí es la portada en su estado inicial —modo claro, precios cargando,
 * nada revelado todavía—, que es exactamente lo que hay que servir a quien no ejecuta
 * nada. En el navegador, `main.tsx` monta encima con `createRoot`.
 *
 * **No se hidrata a propósito.** Hidratar obligaría a que el primer render del cliente
 * coincidiera con este byte a byte, y el primer render del cliente sabe cosas que Node no
 * —si el sistema pide oscuro, sobre todo—. Eso es una discrepancia de hidratación
 * garantizada a cambio de nada: lo que este HTML tiene que hacer es estar ahí para quien
 * lee sin ejecutar, y para eso no hace falta que React lo reutilice.
 */
export function renderizarPortada(): string {
  return renderToString(<LandingPage />)
}

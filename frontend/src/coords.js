// Campos de coordenadas: solo números, signos + y −, punto decimal y espacio (separa RA de Dec).
// Se filtra al escribir y al pegar: cualquier otro carácter se descarta.
// Coma: si sigue a un número que todavía no tiene punto, es la coma decimal (como se escribe en
// español: "133,78" -> "133.78", también al tipear de a una letra); si el número ya tiene punto,
// es un separador ("12.5, -7.2"). Borrarla sin más cambiaría el número sin avisar.
export function cleanCoords(value) {
  const v = value.replace(/[−–]/g, '-')
  let out = ''
  for (const ch of v) {
    if (ch === ',') {
      const current = out.split(/\s+/).pop() // número que se está escribiendo
      out += /\d$/.test(out) && !current.includes('.') ? '.' : ' '
    } else if (/[0-9+\-.\s]/.test(ch)) {
      out += ch
    }
  }
  return out
}

import React from 'react'

/** Props do componente ExportPdfButton. */
interface ExportPdfButtonProps {
  endpoint: string
  label?: string
  className?: string
}

/**
 * Botão que exporta conteúdo como PDF.
 * Busca HTML de um endpoint específico, abre em nova janela e aciona a impressão.
 *
 * @param endpoint - URL do endpoint que retorna o HTML para impressão
 * @param label - Texto exibido no botão (padrão: "Exportar PDF")
 * @param className - Classes CSS do botão (padrão: "btn btn-outline")
 */
export default function ExportPdfButton({ endpoint, label = 'Exportar PDF', className = 'btn btn-outline' }: ExportPdfButtonProps) {
  async function handleClick() {
    const res = await fetch(endpoint, { credentials: 'include' })
    const html = await res.text()
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.onload = () => { w.print() }
    }
  }

  return (
    <button className={className} onClick={handleClick}>{label}</button>
  )
}

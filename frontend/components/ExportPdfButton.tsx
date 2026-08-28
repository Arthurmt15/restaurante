import React from 'react'

interface ExportPdfButtonProps {
  endpoint: string
  label?: string
  className?: string
}

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

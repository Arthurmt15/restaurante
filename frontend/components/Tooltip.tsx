import React from 'react'

/** Props do componente Tooltip. */
interface TooltipProps {
  text: string
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Componente de dica de texto (tooltip) que exibe uma mensagem
 * ao passar o mouse sobre o elemento filho.
 *
 * @param text - Texto da dica exibida no tooltip
 * @param children - Elemento React que terá o tooltip associado
 * @param position - Posição do tooltip em relação ao elemento (padrão: "top")
 */
export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <span className={`tooltip-wrapper tooltip-${position}`}>
      {children}
      <span className="tooltip-content">{text}</span>
    </span>
  )
}

import React from 'react'

interface TooltipProps {
  text: string
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <span className={`tooltip-wrapper tooltip-${position}`}>
      {children}
      <span className="tooltip-content">{text}</span>
    </span>
  )
}

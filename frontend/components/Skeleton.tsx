import React from 'react'

export function SkeletonText({ width = '100%', height = '1rem', style }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return <div className="skeleton skeleton-text" style={{ width, height, ...style }} />
}

export function SkeletonCard() {
  return (
    <div className="card">
      <SkeletonText width="40%" height="1rem" />
      <SkeletonText width="60%" height="2rem" style={{ marginTop: '0.75rem' }} />
      <SkeletonText width="30%" height="0.75rem" style={{ marginTop: '0.5rem' }} />
    </div>
  )
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid #eee' }}>
        <SkeletonText width="20%" height="0.75rem" />
        <SkeletonText width="25%" height="0.75rem" />
        <SkeletonText width="15%" height="0.75rem" />
        <SkeletonText width="20%" height="0.75rem" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid #eee' }}>
          <SkeletonText width="20%" height="0.875rem" />
          <SkeletonText width="25%" height="0.875rem" />
          <SkeletonText width="15%" height="0.875rem" />
          <SkeletonText width="20%" height="0.875rem" />
        </div>
      ))}
    </div>
  )
}

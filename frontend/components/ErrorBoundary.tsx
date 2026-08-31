import React, { Component, ReactNode } from 'react'

/** Props do componente ErrorBoundary. */
interface Props {
  children: ReactNode
  fallback?: ReactNode
}

/** Estado interno do componente ErrorBoundary. */
interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Componente de limite de erro (Error Boundary) do React.
 * Captura erros de renderização de seus filhos e exibe uma UI de fallback amigável.
 * Em ambiente de desenvolvimento, exibe detalhes do erro para facilitar o debug.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<p>Algo deu errado</p>}>
 *   <MeuComponente />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /**
   * Método estático chamado pelo React quando um erro é capturado.
   * Atualiza o estado para exibir a UI de fallback.
   *
   * @param error - Erro capturado durante a renderização
   * @returns Novo estado indicando que ocorreu um erro
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  /**
   * Lifecycle method chamado após um erro ser capturado.
   * Registra o erro e as informações de stack no console.
   *
   * @param error - Erro capturado
   * @param errorInfo - Informações sobre a árvore de componentes que causou o erro
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fcc',
            borderRadius: 12,
            padding: '2rem',
            maxWidth: 480,
            width: '100%',
          }}>
            <h2 style={{ color: '#dc3545', marginBottom: '0.75rem', fontSize: '1.25rem' }}>
              Algo deu errado
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#2d8a4e',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                marginRight: '0.5rem',
              }}
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'transparent',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Recarregar Página
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#f8f8f8',
                borderRadius: 6,
                fontSize: '0.75rem',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 200,
                color: '#666',
              }}>
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

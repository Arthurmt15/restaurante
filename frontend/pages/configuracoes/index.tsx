import { useEffect, useState } from 'react'
import { apiGet, apiPut, type Configuracoes } from '../../lib/api'
import Layout from '../../components/Layout'
import { toast } from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [codigoExclusao, setCodigoExclusao] = useState('')

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  function carregarConfiguracoes() {
    setLoading(true)
    apiGet<Configuracoes>('/configuracoes')
      .then((res) => {
        setCodigoExclusao(res.codigoExclusao)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Erro ao carregar as configurações')
        setLoading(false)
      })
  }

  function salvarConfiguracoes(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoExclusao.trim()) {
      toast.error('O código não pode estar vazio')
      return
    }

    setSalvando(true)
    apiPut<Configuracoes>('/configuracoes', { codigoExclusao })
      .then(() => {
        toast.success('Configurações salvas com sucesso!')
        setSalvando(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Erro ao salvar as configurações')
        setSalvando(false)
      })
  }

  return (
    <div>
      <div className="page-header">
        <h2>Configurações do Sistema</h2>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        {loading ? (
          <div className="empty-state">Carregando configurações...</div>
        ) : (
          <form onSubmit={salvarConfiguracoes}>
            
            <h3 style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Segurança
            </h3>
            
            <div className="cardapio-novo-field" style={{ marginBottom: '1.5rem' }}>
              <label>Código de Exclusão de Itens</label>
              <input 
                type="text" 
                value={codigoExclusao} 
                onChange={(e) => setCodigoExclusao(e.target.value)} 
                placeholder="Ex: 1234 ou SENHA123"
                style={{ width: '100%', maxWidth: '300px' }}
              />
              <small style={{ color: '#666', marginTop: '0.25rem' }}>
                Este código será solicitado ao garçom sempre que ele precisar excluir/estornar um item que já foi enviado para uma comanda.
              </small>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}

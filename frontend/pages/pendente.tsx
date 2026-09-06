import Head from 'next/head'
import { useAuth } from '../contexts/AuthContext'
import styles from '../styles/login.module.css'

export default function PendentePage() {
  const { usuario, logout } = useAuth()

  return (
    <>
      <Head>
        <title>Aguardando Aprovação — Restaurante</title>
      </Head>
      <main className={styles.loginContainer}>
        <section className={styles.loginSide}>
          <div className={styles.loginContent}>
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🍽</div>
              <h1>Restaurante</h1>
              <p>SISTEMA DE GESTÃO</p>
            </div>

            <div className={styles.loginTitle}>
              <h2>Conta Pendente</h2>
              <p>
                Olá, <strong>{usuario?.nome || 'Usuário'}</strong>!
              </p>
              <p style={{ marginTop: '0.75rem' }}>
                Sua conta está aguardando aprovação do administrador.
                Você receberá acesso assim que for vinculada a uma barraca.
              </p>
            </div>

            <div style={{
              background: 'var(--bg-secondary, #f5f5f5)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #666)' }}>
                Status: <strong style={{ color: '#f59e0b' }}>Aguardando aprovação</strong>
              </p>
            </div>

            <button
              type="button"
              className={styles.loginButton}
              onClick={() => logout()}
              style={{ marginTop: '1.5rem', background: '#6b7280' }}
            >
              Sair
            </button>
          </div>
        </section>
      </main>
    </>
  )
}

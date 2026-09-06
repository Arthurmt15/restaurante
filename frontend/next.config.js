/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.API_URL
    if (!apiUrl) {
      console.warn(
        '[next.config.js] AVISO: API_URL não definida. ' +
        'Defina a variável de ambiente API_URL no Vercel para apontar ao backend.'
      )
    }
    const destination = apiUrl
      ? `${apiUrl}/api/:path*`
      : 'http://localhost:3001/api/:path*'
    return {
      beforeFiles: [
        {
          source: '/api/auth/signin',
          destination: '/api/auth/signin',
        },
        {
          source: '/api/auth/signout',
          destination: '/api/auth/signout',
        },
        {
          source: '/api/auth/callback/:provider',
          destination: '/api/auth/callback/:provider',
        },
        {
          source: '/api/auth/session',
          destination: '/api/auth/session',
        },
        {
          source: '/api/auth/csrf',
          destination: '/api/auth/csrf',
        },
        {
          source: '/api/auth/error',
          destination: '/api/auth/error',
        },
        {
          source: '/api/auth/providers',
          destination: '/api/auth/providers',
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination,
        },
      ],
      fallback: [],
    }
  },
}

module.exports = nextConfig

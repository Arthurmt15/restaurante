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
    return [
      {
        source: '/api/:path((?!auth).*)',
        destination,
      },
    ]
  },
}

module.exports = nextConfig

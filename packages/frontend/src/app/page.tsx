import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">EcoLink</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">Login</Link>
          <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Get Started</Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
          <span>🏆</span>
          <span>MyHack 2026 — Cradle Problem Statement</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Ecosystem Linkages,{' '}
          <span className="text-blue-600">Automated by AI</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
          EcoLink replaces manual coordination between programme owners, mentors, companies, partners, and service providers
          with intelligent, AI-powered matching powered by Google Gemini 1.5 Pro.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/register" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
            Join the Ecosystem
          </Link>
          <Link href="/login" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg border border-gray-200 dark:border-gray-700">
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { icon: '🤖', title: 'AI-Powered Matching', desc: 'Gemini 1.5 Pro analyses profiles to suggest optimal mentor-company pairings with detailed compatibility scores.' },
            { icon: '🔗', title: 'Relationship Lifecycle', desc: 'Manage relationships as first-class entities with state machines, engagement logs, and outcome tracking.' },
            { icon: '📊', title: 'Ecosystem Analytics', desc: 'Real-time dashboards with graph visualisation, matching effectiveness metrics, and programme insights.' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-left">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="container mx-auto px-6 py-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>EcoLink — Built for MyHack 2026 · Powered by Google Gemini 1.5 Pro + text-embedding-004 · pgvector · Next.js 14</p>
        <p className="mt-1">Demo credentials: admin@ecolink.app / Admin@123456</p>
      </footer>
    </main>
  );
}

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              AIJobMatch
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-4">Jobs page coming soon</h1>
        <p className="text-gray-400 mb-3">
          We’re still wiring up the live jobs database connection.
        </p>
        <p className="text-gray-500 text-sm">
          You can already upload your resume and get AI-powered matches. The full jobs
          list view will be enabled once the database is stable.
        </p>
      </main>
    </div>
  );
}

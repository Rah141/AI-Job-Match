import { ResumeBuilder } from "@/components/features/ResumeBuilder"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white overflow-hidden selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              AIJobMatch
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <div className="h-4 w-px bg-gray-800" />
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now with GPT-4 Turbo
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
            Let AI find and tailor <br />
            <span className="text-blue-500">your dream job.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Stop manually tweaking resumes. Upload your profile, let our AI agent scrape the web for matches, and auto-generate tailored applications in seconds.
          </p>

          <ResumeBuilder />
        </div>

        {/* How it works */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mt-20">
          {[
            {
              title: "Upload or Create",
              desc: "Upload your existing resume or let our AI build a professional profile from scratch.",
            },
            {
              title: "AI Job Matching",
              desc: "Our agent scrapes thousands of jobs and scores them based on your unique skills.",
            },
            {
              title: "Auto-Tailored Apply",
              desc: "Generate a custom resume and cover letter for every single application instantly.",
            },
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400 font-bold">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

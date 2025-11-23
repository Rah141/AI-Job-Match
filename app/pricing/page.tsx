import Link from "next/link"
import { CheckCircle2, Sparkles, Infinity, Heart } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

export default function PricingPage() {
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
            <Link href="/pricing" className="hover:text-white transition-colors text-white">Pricing</Link>
            <div className="h-4 w-px bg-gray-800" />
            <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/auth/signup" className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              We believe everyone should have an opportunity for a decent life
            </p>
          </div>

          {/* Membership Card */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
            
            <Card className="relative p-8 md:p-12 border-2 border-blue-500/50 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl">
              {/* FREE Badge */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-md opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 rounded-full">
                    <span className="text-3xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-8 h-8" />
                      FREE
                    </span>
                  </div>
                </div>
              </div>

              {/* Membership Title */}
              <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  Unlimited Membership
                </h2>
                <p className="text-xl text-gray-300 mb-6">
                  Forever free, no hidden costs
                </p>
              </div>

              {/* Mission Statement */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Heart className="w-6 h-6 text-blue-400" />
                  <p className="text-lg font-semibold text-blue-300">
                    Our Mission
                  </p>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  We believe everyone should have an opportunity for a decent life. 
                  That's why we're committed to providing unlimited access to job matching 
                  and career tools—completely free, forever.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-10">
                <h3 className="text-xl font-semibold text-white mb-6 text-center">
                  Everything You Need, Always Free
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: Infinity, text: "Unlimited resume uploads and AI generation" },
                    { icon: CheckCircle2, text: "Unlimited job matches and searches" },
                    { icon: CheckCircle2, text: "Unlimited tailored applications" },
                    { icon: CheckCircle2, text: "AI-powered cover letter generation" },
                    { icon: CheckCircle2, text: "Real-time job matching scores" },
                    { icon: CheckCircle2, text: "Priority support" },
                    { icon: CheckCircle2, text: "No credit card required" },
                    { icon: CheckCircle2, text: "No hidden fees, ever" },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <feature.icon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full md:w-auto px-12 py-4 text-lg">
                    Get Started Free
                    <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <p className="text-gray-400 text-sm mt-4">
                  Start matching jobs in seconds
                </p>
              </div>
            </Card>
          </div>

        </div>
      </section>
    </main>
  )
}


import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative">
          <h1 className="text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-violet-600 block mb-2">
            404
          </h1>
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full -z-10 animate-pulse"></div>
        </div>
        
        <h2 className="text-2xl font-semibold text-zinc-100 mt-4 font-['Space_Grotesk']">
          Page not found
        </h2>
        
        <p className="text-zinc-400 font-['Inter']">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The link might be broken or the endpoint has been removed.
        </p>
        
        <div className="pt-8 flex justify-center">
          <Link 
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all active:scale-95 duration-200"
          >
            Go back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

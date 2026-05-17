import LoginForm from './login-form';

export const metadata = { title: 'Sign in — Stride' };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[400px]">

        {/* Brand */}
        <div className="flex items-center gap-2 mb-10">
          <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent translate-y-[-2px]" />
          <span className="font-serif text-[22px] tracking-[-0.015em] text-ink">
            Stride <span className="italic">&amp;</span> Signal
          </span>
        </div>

        <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-1">
          Welcome back.
        </h1>
        <p className="font-sans text-[14px] text-ink-3 mb-8">
          Sign in to your training dashboard.
        </p>

        <LoginForm />

        <p className="font-sans text-[13px] text-ink-4 mt-6 text-center">
          No account?{' '}
          <a href="/register" className="text-ink underline underline-offset-2 hover:text-accent">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

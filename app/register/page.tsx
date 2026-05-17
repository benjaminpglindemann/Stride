import RegisterForm from './register-form';

export const metadata = { title: 'Create account — Stride' };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[480px]">

        {/* Brand */}
        <div className="flex items-center gap-2 mb-10">
          <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent translate-y-[-2px]" />
          <span className="font-serif text-[22px] tracking-[-0.015em] text-ink">
            Stride <span className="italic">&amp;</span> Signal
          </span>
        </div>

        <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-1">
          Set up your profile.
        </h1>
        <p className="font-sans text-[14px] text-ink-3 mb-8 text-pretty">
          The coach uses your goal and training plan as context for every analysis and recommendation.
        </p>

        <RegisterForm />

        <p className="font-sans text-[13px] text-ink-4 mt-6 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-ink underline underline-offset-2 hover:text-accent">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

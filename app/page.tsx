import { MentorWorkspace } from '@/frontend/src/components/MentorWorkspace';
import { getAuthenticatedUser } from '@/lib/authenticated-user';
import Image from 'next/image';
import { headers } from 'next/headers';

/* oxlint-disable next/no-html-link-for-pages -- SIWC sign-in must use a top-level browser navigation. */

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = getAuthenticatedUser(await headers());
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080c13] px-5 text-[#eef3ff]">
        <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[color:rgb(109_141_255_/_24%)] bg-[#080d18] shadow-[0_8px_24px_rgb(109_141_255_/_20%)]">
            <Image
              src="/apexdb-logo.png"
              alt="ApexDB Mentor"
              width={56}
              height={56}
              priority
              unoptimized
              className="h-full w-full object-contain p-1"
            />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--blue-bright)]">
            Team Apex · SQL learning workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Continue to ApexDB Mentor</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-bright)]">
            Your query history, saved SQL, lesson progress, and challenge results stay separate from every other student.
          </p>
          <a
            href="/signin-with-chatgpt?return_to=/"
            target="_top"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--blue),#806dff)] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgb(109_141_255_/_24%)]"
          >
            Sign in with ChatGPT
          </a>
          <p className="mt-4 text-xs text-[var(--muted)]">CollegeDB remains protected. Editable SQL still runs in your browser sandbox.</p>
        </section>
      </main>
    );
  }
  return <MentorWorkspace user={{ email: user.email, name: user.name }} />;
}

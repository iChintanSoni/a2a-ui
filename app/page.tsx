import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white px-16 py-32 sm:items-start dark:bg-black">
        <Image
          className="dark:invert"
          src="/a2a-ui.svg"
          alt="A2A UI logo"
          width={200}
          height={10}
          priority
        />
      </main>
      <Button>Get Started</Button>
    </div>
  );
}

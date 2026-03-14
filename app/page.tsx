import Page from "@/components/page";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function HomePage() {
  return (
    <Page>
      <Image
        className="dark:invert"
        src="/a2a-ui.svg"
        alt="A2A UI logo"
        width={200}
        height={10}
        priority
      />
      <Button>Get Started</Button>
    </Page>
  );
}

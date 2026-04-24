import { PageContentHeader } from "@/components/ui/page-content-header";
import { texts } from "@/lib/texts";

export default function ModulesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.modules.eyebrow}
        title={texts.modules.title}
      />
    </main>
  );
}

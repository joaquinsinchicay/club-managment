import { texts } from "@/lib/texts";

export default function ModulesPage() {
  return (
    <main className="px-3.5 py-6">
      <span className="text-eyebrow uppercase text-muted-foreground">
        {texts.modules.eyebrow}
      </span>
      <h1 className="mt-1 text-h2 font-semibold tracking-tight text-foreground">
        {texts.modules.title}
      </h1>
    </main>
  );
}

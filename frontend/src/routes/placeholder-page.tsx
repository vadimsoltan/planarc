import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Reserved for a future iteration.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-ink/70">
          This route stays in the app navigation because it belongs to the long-term product shape, but the current MVP
          still treats it as a reference placeholder.
        </p>
      </CardContent>
    </Card>
  );
}

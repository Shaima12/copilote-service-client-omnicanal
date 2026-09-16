export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">
          Access denied
        </h1>

        <p className="mt-2 text-muted-foreground">
          You do not have permission to access this workspace.
        </p>
      </div>
    </main>
  );
}
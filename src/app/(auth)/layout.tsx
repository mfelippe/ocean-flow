export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-teal-400">Ocean Flow</h1>
          <p className="text-sm text-slate-400">Kanban self-hosted</p>
        </div>
        {children}
      </div>
    </div>
  );
}

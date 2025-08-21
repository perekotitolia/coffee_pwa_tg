export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Coffee Loyalty</h1>

      <ul className="space-y-2">
        <li>
          <a className="underline" href="/me">Клієнт</a>
        </li>
        <li>
          <a className="underline" href="/seller">Бариста</a>
        </li>
        <li>
          <a className="underline" href="/admin">Адмін</a>
        </li>
      </ul>
    </main>
  );
}

export default async function NotionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const notionUrl = params.url;
  const connectedOnly = params.connected === "true";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">
          {notionUrl ? "\u2705" : "\ud83d\udd17"}
        </div>

        <h1 className="text-2xl font-bold">
          {notionUrl
            ? "Connected & Saved"
            : "Notion Connected"}
        </h1>

        <p className="text-zinc-400">
          {notionUrl
            ? "Your Notion workspace is connected and the analysis has been saved."
            : connectedOnly
              ? "Your Notion workspace is connected. You can now save analyses from Telegram."
              : "Your Notion workspace is connected."}
        </p>

        <div className="space-y-3 pt-2">
          {notionUrl && (
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              Open in Notion
            </a>
          )}

          <a
            href="https://t.me/contextdrop2027bot"
            className="block w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
          >
            Return to Telegram
          </a>
        </div>

        <p className="text-xs text-zinc-600">
          You can close this window.
        </p>
      </div>
    </div>
  );
}

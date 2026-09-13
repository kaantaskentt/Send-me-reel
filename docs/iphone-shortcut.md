# Send an iPhone link to your Mac

The personal iCloud inbox avoids a Telegram server, database, subscription, and public Mac endpoint. You share a link into a small text file; iCloud carries it to the Mac. ContextDrop imports it as **waiting for analysis**. Saving a link does not analyze it or run a computer task.

## One-time setup

1. Use the same Apple Account on iPhone and Mac, with iCloud Drive and Shortcuts sync enabled. Open Phone inbox in the local ContextDrop app. The dedicated folder is **iCloud Drive → Shortcuts → ContextDrop → Inbox**.
2. On this Mac, the signed installer is already available through **Phone inbox → Get iPhone shortcut**. On another Mac, generate its personal installer with `python3 scripts/create-phone-shortcut.py`. Open the resulting private `.contextdrop/Send-to-ContextDrop.shortcut` in Shortcuts and review its six actions before adding it. The generator does not install or run it. Shortcuts sync can then make the shortcut available on your iPhone.
3. On iPhone, open the shortcut's Details and confirm **Show in Share Sheet** is on. It accepts URLs, text, and Safari webpages. Review **Save File**: its relative destination is `ContextDrop/Inbox/link-<random>-<random>.txt` in Shortcuts. If your OS asks for a destination or shows a different one, pick the dedicated Inbox folder once in the action editor and retain the generated filename. Keep **Overwrite If File Exists** off.
4. In Safari or a social app, tap **Share → Send to ContextDrop**. After iCloud syncs, the link should appear in ContextDrop's phone inbox. Choose the received link, then click **Analyze this link** when you want to spend provider usage on it. Verify this with one real iPhone share before relying on the shortcut for daily use.

The generated artifact is **built and signed only when the command succeeds**. Local signing and static recipe checks do not prove installation, iPhone permissions, relative-folder resolution, or cross-device delivery. Those require the real share in step 4. If signing fails, no download should be presented as ready.

## Manual fallback

If the installer is unavailable, build the same shortcut in the iPhone Shortcuts editor:

1. Create **Send to ContextDrop**, enable **Show in Share Sheet**, and accept URLs, Text, and Safari Web Pages. Set the no-input behavior to **Stop and Respond** with “Share a link from another app.” Do not enable a clipboard fallback.
2. Add **Get URLs from Input** using **Shortcut Input**, then **Get Item from List → First Item**, then **Text** containing that item as a Magic Variable. This preserves one plain URL. With a multi-link text selection, only the first URL is used.
3. Add two **Random Number** actions, each from `0` to `2147483647`. Add **Set Name** with the earlier Text as its input and `link-[first random number]-[second random number].txt` as its name. Two random values reduce accidental filename collisions; disabling overwrite protects existing files if one occurs.
4. Add **Save File** using the renamed Text file. Choose **iCloud Drive → Shortcuts → ContextDrop → Inbox**, turn **Ask Where to Save** off after choosing the folder, and keep **Overwrite If File Exists** off. Test by sharing one HTTPS link and checking its arrival in ContextDrop.

## Exact Mac contract

```text
~/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents/ContextDrop/Inbox
```

Files contain one HTTPS URL as UTF-8 plain text, with a `.txt` suffix. The Mac receiver validates each file, keeps its own local ingestion ledger, and leaves the original iCloud file intact. It does not scan other iCloud folders. On this Mac, the actual Shortcuts container exists; `com~apple~CloudDocs/Shortcuts` does not, so those filesystem paths are not interchangeable.

The private signed artifact is always `.contextdrop/Send-to-ContextDrop.shortcut` in the repository. It is never placed in `web/public` or committed: the `people-who-know-me` signature can include the signer's contact identity. Serve it only through the guarded local download route.

## Reliability and limits

- iCloud syncing is asynchronous; this is a durable inbox, not an instant delivery guarantee. The Mac can receive pending files after it reconnects, but cannot analyze or execute while shut down or asleep.
- Both devices need iCloud Drive enabled, the same Apple Account, and available iCloud storage. A folder existing on the Mac does not establish the phone's configuration or prove recent sync.
- In Finder, choosing **Keep Downloaded** for the Inbox folder avoids older files being evicted by Optimize Mac Storage. The receiver should tolerate in-progress writes, unavailable placeholders, duplicate notifications, and restart safely.
- Some apps share a webpage URL; others may share text, an image, or nothing. This shortcut handles links, not media uploads. If it is missing from the share sheet, use the app's system **More/Share** option or copy the link and deliberately share that text. It never reads the clipboard automatically.
- Link delivery does not grant access to private Instagram posts, logged-in video pages, or deleted content. Capture and analysis keep their existing platform limitations and provider cost.

## Verification and sources

`python3 scripts/create-phone-shortcut.py --check` checks the action allowlist, private relative destination, non-overwrite behavior, no clipboard fallback, action-output references, and plist round trip. It does not execute the shortcut.

The generator uses Apple gallery workflow/token serialization and checks action field names against the primary Cherri compiler declarations: [documents.cherri](https://github.com/electrikmilk/cherri/blob/main/actions/documents.cherri), [basic.cherri](https://github.com/electrikmilk/cherri/blob/main/actions/basic.cherri), [web.cherri](https://github.com/electrikmilk/cherri/blob/main/actions/web.cherri), and [parser.go](https://github.com/electrikmilk/cherri/blob/main/parser.go). Only format/parameter facts were used; no third-party compiler was installed or executed. Runtime access to Apple's private action registry is unavailable from this CLI, so it is not claimed as runtime validation.

Apple documents [Share Sheet shortcuts](https://support.apple.com/en-au/guide/shortcuts/apd163eb9f95/ios), [input filtering and no-input behavior](https://support.apple.com/en-gb/guide/shortcuts/apd8195f96d6/ios), [Save File actions](https://support.apple.com/en-ca/guide/shortcuts/apdaf74d75a5/ios), [iCloud Drive setup](https://support.apple.com/en-la/118443), and [Keep Downloaded](https://support.apple.com/en-euro/guide/mac-help/mchl1a02d711/mac). The installed `man shortcuts` specifies that `people-who-know-me` signs locally while `anyone` notarizes through iCloud; this generator uses only local signing. See also [Apple's CLI guide](https://support.apple.com/en-md/guide/shortcuts-mac/-apd455c82f02/mac).

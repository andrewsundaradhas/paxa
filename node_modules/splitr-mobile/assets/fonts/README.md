# Bundled fonts

The paxa premium design uses two families. Drop the `.ttf` files here, then link
them with `npx react-native-asset` (re-run after adding files).
`react-native.config.js` already points at this directory.

| Role | Family name (referenced in `src/theme.ts`) | Files to add |
|---|---|---|
| Display — big balance numbers, headlines, wordmark | `SpaceGrotesk-Bold` / `SpaceGrotesk-SemiBold` | `SpaceGrotesk-Bold.ttf`, `SpaceGrotesk-SemiBold.ttf` |
| Body / UI — everything else | `HankenGrotesk-Regular` / `HankenGrotesk-Medium` / `HankenGrotesk-Bold` | `HankenGrotesk-Regular.ttf`, `HankenGrotesk-Medium.ttf`, `HankenGrotesk-Bold.ttf` |

Sources (all OFL-licensed, free to bundle): Google Fonts — Space Grotesk,
Hanken Grotesk.

Until the files are present the app still renders — React Native falls back to
the system font, so layout is unaffected; only the display character is lost.
Bundle them locally rather than loading from a CDN (mobile apps ship fonts
in-bundle).

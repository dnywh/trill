# Trill

This is a dogfooding experiment for Supabase. It does some naughty things:

- Allows `anon` uploads to a storage bucket named `recordings`
- Allows `anon` additions to a table named `recordings`

This makes it so anyone on the internet can contribute to the Trill project: a crowdsourced song made up of people humming different notes of _When the Saints Go Marching In_.

## Quick start

Clone the repo and run:

```bash
pnpm install
pnpm run dev
```

You’ll need to also copy over `.env.example` to a new `.env` file with values.

## Later

Trill was a quick two day project. There are tonnes more things that could be done to improve it, such as:

- [] Ability for user to just hear their own notes (not the crowdsourced version)
- [] Sound classification to automatically reject duds (silent, wrong note)
- [] Sound classification to add a `quality` float value, to preference higher-quality note recordings
- [] Sound cropping before upload to remove any starting or ending silence

## Colophon

This repo was borne out of the [Pigment CSS - Vite with TypeScript example project](https://github.com/mui/pigment-css/tree/master/examples/pigment-css-vite-ts).

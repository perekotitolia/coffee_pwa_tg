#!/usr/bin/env bash
set -euo pipefail

echo "🔎 Searching route handlers under app/api/…"
mapfile -t FILES < <(git ls-files 'app/api/**/*.ts' | grep '/route\.ts$' || true)

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No route.ts files found under app/api/. Nothing to do."
  exit 0
fi

changed=0

for f in "${FILES[@]}"; do
  orig="$(cat "$f")"

  # 1) Правим сигнатуры: (req: Request, { params }: {...})  ->  (req: Request, ctx: any)
  #    Поддерживаем методы GET/POST/PUT/PATCH/DELETE
  patched="$(perl -0777 -pe '
    s/
      export\s+async\s+function\s+
      (GET|POST|PUT|PATCH|DELETE)   # 1: method
      \s*\(
        \s*req\s*:\s*Request\s*,\s*
        \{\s*params[^)]*            # anything until closing paren
      \)\s*\{
    /export async function \1(req: Request, ctx: any) {\n  const { params } = (ctx ?? {}) as any;\n/xmsg
  ' <<< "$orig")"

  # Если ничего не поменялось — пропускаем
  if [[ "$patched" == "$orig" ]]; then
    continue
  fi

  printf '%s' "$patched" > "$f"
  echo "✔ Patched: $f"
  changed=$((changed+1))
done

if [ "$changed" -eq 0 ]; then
  echo "✅ Nothing to patch. All route handlers already OK for Next 15."
  exit 0
fi

echo
echo "📝 Staging changes…"
git add "${FILES[@]}"

echo "💬 Commit…"
git commit -m "fix(api): Next 15 route handlers — remove typed { params } arg; use ctx + const { params }"

echo "🚀 Push…"
git push

echo
echo "✅ Done. Rerun your Vercel build."

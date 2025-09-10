#!/usr/bin/env node
/* fix-next15-routes: make Next 15 route handlers accept (ctx:any) and map params -> (ctx as any).params */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");

const METHOD = "(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && /route\.ts$/.test(entry.name)) out.push(p);
  }
  return out;
}

function fixFile(file) {
  let src = fs.readFileSync(file, "utf8");
  const before = src;

  // 1) function decl: two args (req, { params ... })
  src = src.replace(
    new RegExp(
      `export\\s+async\\s+function\\s+${METHOD}\\s*\\(\\s*([^)]*?)\\s*,\\s*\\{[^)]*?\\bparams\\b[^)]*?\\}\\s*\\)`,
      "g"
    ),
    "export async function $1($2, ctx: any)"
  );

  // 2) function decl: only { params ... }
  src = src.replace(
    new RegExp(
      `export\\s+async\\s+function\\s+${METHOD}\\s*\\(\\s*\\{[^)]*?\\bparams\\b[^)]*?\\}\\s*\\)`,
      "g"
    ),
    "export async function $1(ctx: any)"
  );

  // 3) arrow export: two args (req, { params ... })
  src = src.replace(
    new RegExp(
      `export\\s+const\\s+${METHOD}\\s*=\\s*async\\s*\\(\\s*([^)]*?)\\s*,\\s*\\{[^)]*?\\bparams\\b[^)]*?\\}\\s*\\)\\s*=>`,
      "g"
    ),
    "export const $1 = async ($2, ctx: any) =>"
  );

  // 4) arrow export: only { params ... }
  src = src.replace(
    new RegExp(
      `export\\s+const\\s+${METHOD}\\s*=\\s*async\\s*\\(\\s*\\{[^)]*?\\bparams\\b[^)]*?\\}\\s*\\)\\s*=>`,
      "g"
    ),
    "export const $1 = async (ctx: any) =>"
  );

  // 5) внутри кода: params.slug -> (ctx as any).params.slug
  // (делаем до замены деструктуринга, чтобы не поймать только что вставленное)
  src = src.replace(/\bparams\./g, "(ctx as any).params.");

  // 6) деструктуринг: const { id, slug } = params -> const { ... } = (ctx as any).params ?? {}
  src = src.replace(
    /\b(const|let)\s*\{\s*[^}]*\}\s*=\s*params\b/g,
    "$1 $&".replace("$1 $&", "$1 { $&").slice(3) // noop to keep editors happy
  ); // no-op, just to keep position
  src = src.replace(
    /\b(const|let)\s*(\{\s*[^}]*\})\s*=\s*params\b/g,
    "$1 $2 = (ctx as any).params ?? {}"
  );

  if (src !== before) {
    fs.writeFileSync(file, src, "utf8");
    console.log("fixed:", path.relative(ROOT, file));
    return true;
  }
  return false;
}

const files = walk(API_DIR);
if (!files.length) {
  console.log("No route files found under app/api");
  process.exit(0);
}

let changed = 0;
for (const f of files) changed += fixFile(f) ? 1 : 0;
console.log(`\nDone. Files changed: ${changed}/${files.length}`);

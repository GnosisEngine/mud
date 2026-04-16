#!/usr/bin/env bash
# extract_logic_functions.sh
# Recursively scans ./bundles for logic.js files and extracts exported function names,
# their absolute paths, and line numbers.

set -euo pipefail

BUNDLES_DIR="${1:-bundles}"

if [[ ! -d "$BUNDLES_DIR" ]]; then
  echo "Error: directory '$BUNDLES_DIR' not found." >&2
  exit 1
fi

# Resolve to absolute path
BUNDLES_ABS="$(cd "$BUNDLES_DIR" && pwd)"



found_any=0

while IFS= read -r -d '' logic_file; do
  abs_path="$(cd "$(dirname "$logic_file")" && pwd)/$(basename "$logic_file")"

  # Match lines of the form:   identifier: (  or   identifier: async (
  # i.e. exported arrow-function properties in a module.exports object
  while IFS=: read -r lineno funcname; do
    # Strip leading/trailing whitespace from function name
    funcname="$(echo "$funcname" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*:.*//')"
    printf "%s %s:%s\n" "$funcname" "$abs_path" "$lineno"
    found_any=1
  done < <(grep -n '^\s\+[a-zA-Z_$][a-zA-Z0-9_$]*\s*:\s*\(async\s\+\)\?(.*=>' "$abs_path" \
           | sed 's/:\s*\(async\s*\)\?(.*$//')

done < <(find "$BUNDLES_ABS" -type f -name "logic.js" -print0 | sort -z)

if [[ $found_any -eq 0 ]]; then
  echo "No exported functions found in any logic.js under '$BUNDLES_DIR'."
fi
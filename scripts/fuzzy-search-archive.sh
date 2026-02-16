#!/bin/bash
# fuzzy-search-archive.sh - Fuzzy search for MEMORY-archive.md entries
#
# Usage: ./fuzzy-search-archive.sh "query" "/path/to/MEMORY-archive.md"
# Returns: Ranked list of matching entry IDs and titles

set -e

# Arguments
QUERY="$1"
ARCHIVE_FILE="$2"

# Validation
if [ -z "$QUERY" ]; then
    echo "Error: Query required" >&2
    echo "Usage: $0 \"query\" \"/path/to/archive.md\"" >&2
    exit 1
fi

if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "Error: Archive file not found: $ARCHIVE_FILE" >&2
    exit 1
fi

# Extract all entry titles with line numbers
# Format: "line_number:### Title"
entries=$(grep -n "^### " "$ARCHIVE_FILE" 2>/dev/null || true)

if [ -z "$entries" ]; then
    echo "No entries found in archive" >&2
    exit 0
fi

# Convert to array format: ID Title
# ID is sequential (1, 2, 3...)
# Line number is preserved for reference
entry_array=()
entry_id=1

while IFS= read -r line; do
    # Extract line number and title
    line_num=$(echo "$line" | cut -d: -f1)
    title=$(echo "$line" | sed 's/^[0-9]*:### //')

    # Store: ID|LINE_NUM|TITLE
    entry_array+=("$entry_id|$line_num|$title")
    entry_id=$((entry_id + 1))
done <<< "$entries"

# Fuzzy matching strategies (in priority order)
exact_matches=()
starts_with=()
contains_all=()
contains_any=()

# Normalize query for matching
query_lower=$(echo "$QUERY" | tr '[:upper:]' '[:lower:]')
query_words=($query_lower)  # Split into words

for entry in "${entry_array[@]}"; do
    entry_id=$(echo "$entry" | cut -d'|' -f1)
    line_num=$(echo "$entry" | cut -d'|' -f2)
    title=$(echo "$entry" | cut -d'|' -f3)
    title_lower=$(echo "$title" | tr '[:upper:]' '[:lower:]')

    # Strategy 1: Exact match (case-insensitive)
    if [ "$title_lower" = "$query_lower" ]; then
        exact_matches+=("$entry_id|$line_num|$title|★★★★")
        continue
    fi

    # Strategy 2: Starts with query
    if [[ "$title_lower" == "$query_lower"* ]]; then
        starts_with+=("$entry_id|$line_num|$title|★★★")
        continue
    fi

    # Strategy 3: Contains all query words (any order)
    all_words_found=true
    for word in "${query_words[@]}"; do
        if [[ ! "$title_lower" =~ $word ]]; then
            all_words_found=false
            break
        fi
    done

    if [ "$all_words_found" = true ] && [ ${#query_words[@]} -gt 0 ]; then
        contains_all+=("$entry_id|$line_num|$title|★★")
        continue
    fi

    # Strategy 4: Contains any query word
    for word in "${query_words[@]}"; do
        if [[ "$title_lower" =~ $word ]]; then
            contains_any+=("$entry_id|$line_num|$title|★")
            break
        fi
    done
done

# Output results (ranked by priority)
# Format: ID|LINE_NUM|TITLE|RANK

output_matches() {
    local matches=("$@")
    for match in "${matches[@]}"; do
        echo "$match"
    done
}

# Combine all results
all_matches=()
all_matches+=("${exact_matches[@]}")
all_matches+=("${starts_with[@]}")
all_matches+=("${contains_all[@]}")
all_matches+=("${contains_any[@]}")

if [ ${#all_matches[@]} -eq 0 ]; then
    echo "No matches found for: $QUERY" >&2
    exit 1
fi

# Output all matches (pipe-delimited)
for match in "${all_matches[@]}"; do
    echo "$match"
done

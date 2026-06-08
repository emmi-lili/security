interface LTMatch {
  offset: number;
  length: number;
  replacements: { value: string }[];
  rule: { issueType: string };
}

interface LTResponse {
  matches: LTMatch[];
}

/**
 * Calls LanguageTool public API to correct spelling and grammar in Spanish.
 * Applies the first suggested replacement for each match, from end to start
 * so that offsets remain valid.
 */
export async function correctSpelling(text: string): Promise<string> {
  try {
    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ language: 'es', text }),
    });

    if (!res.ok) return text;

    const data: LTResponse = await res.json();

    const matches = [...data.matches]
      .filter((m) => m.replacements.length > 0)
      .sort((a, b) => b.offset - a.offset); // apply from end to preserve offsets

    let corrected = text;
    for (const match of matches) {
      corrected =
        corrected.slice(0, match.offset) +
        match.replacements[0].value +
        corrected.slice(match.offset + match.length);
    }

    return corrected;
  } catch {
    return text;
  }
}

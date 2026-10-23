// The API prefixes each note with its outgoing field, including repeated warnings.
export default function outgoingsDetails(details = '') {
  const notes = {};
  let field;

  for (const line of details.split(/\r?\n/)) {
    const match = line.match(/^(outgoings_\w+):\s*(.*)$/);
    if (match) {
      field = match[1];
      notes[field] = [...(notes[field] ?? []), match[2]];
    } else if (field && line.trim()) {
      notes[field].push(line);
    }
  }

  return Object.fromEntries(Object.entries(notes).map(([key, lines]) => [key, lines.join('\n')]));
}

// `local_*@local.gofamint` emails are synthetic placeholders the backend mints
// when a teacher adds a student by name only (see backend routes/teacher.js).
// They're stable keys, never addresses anyone should read — the UI shows the
// person's name and a neutral hint instead.
export function isLocalEmail(e) {
  return typeof e === 'string' && e.toLowerCase().endsWith('@local.gofamint');
}

// Email text safe to render under/next to a name.
export function displayEmail(e) {
  if (!e) return '';
  return isLocalEmail(e) ? 'No email · added by teacher' : e;
}

// A human label for a person: their name, else a real email, else a neutral
// fallback — never a synthetic local_* key.
export function personLabel(name, email, fallback = 'Student') {
  if (name && String(name).trim()) return name;
  return email && !isLocalEmail(email) ? email : fallback;
}

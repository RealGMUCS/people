// Prints the next batch of roster entries for a scheduled routine (see TASKS/AUTOMATION.md), so
// every run picks up where the last one stopped instead of re-checking the same people.
//
// Usage: tsx scripts/next-batch.ts <check|honors|discover> [--from <json>]
//        tsx scripts/next-batch.ts portraits
//        tsx scripts/next-batch.ts former
//
// Entries are ordered by profile slug (the same slug as people/<slug>.html). Each list in
// maintenance/rotation.json stores `next`, the first slug of the next batch; the batch wraps
// around at the end of the list. `--from` overrides the stored cursors with the rotation.json
// contents of an open, not-yet-merged PR (pass the file's JSON text), so a run never repeats it.
// A cursor with `"wrap": false` is a one-time pass: its last batch ends at the end of the list and
// sets `next` to "done", after which it prints nothing to do.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Row = Record<string, string>;
type Cursor = { size: number; next: string; wrap?: boolean };

const root = resolve(import.meta.dirname, '..');
const read = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const faculty: Row[] = read('public/faculty.json');
const students: Row[] = read('public/students.json');
const fullName = (r: Row) => `${r['First Name'] || ''} ${r['Last Name'] || ''}`.trim();

// Same slug rules as scripts/generate-profile-pages.ts (copied: importing that module runs it).
const slugify = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const facultySlugs = new Set(faculty.map(r => slugify(fullName(r))));
const usedStudentSlugs = new Set<string>();
const studentSlug = (r: Row) => {
  let slug = slugify(fullName(r));
  if (facultySlugs.has(slug)) slug = `${slug}-student`;
  else if (usedStudentSlugs.has(slug)) {
    let n = 2;
    while (usedStudentSlugs.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  usedStudentSlugs.add(slug);
  return slug;
};
const lists = {
  faculty: faculty.map(r => ({ slug: slugify(fullName(r)), row: r })),
  students: students.map(r => ({ slug: studentSlug(r), row: r })),
};
// discover walks faculty advisors' lab and student pages, so it rotates over faculty.
const listFor = (name: string) => (name === 'students' ? lists.students : lists.faculty);

function describe(kind: string, row: Row): string {
  if (kind === 'students') {
    return [row['Degree'], row['Advisor'] && `advisor ${row['Advisor']}`, row['Current Job']].filter(Boolean).join(' · ');
  }
  return [row['Rank'], row['Tenure-Track/Teaching/Staff'], row['Dept Role']].filter(Boolean).join(' · ');
}

const key = process.argv[2];
if (key === 'portraits') {
  const missing = lists.faculty.filter(e => !e.row['Picture']);
  const hotlinked = lists.faculty.filter(e => /^https?:\/\//i.test(e.row['Picture'] || ''));
  console.log(`Faculty with no Picture (${missing.length}):`);
  for (const e of missing) console.log(`  ${e.slug}  ${fullName(e.row)}`);
  console.log(`\nFaculty with an external Picture not yet localized (${hotlinked.length}; run npm run fetch:portraits):`);
  for (const e of hotlinked) console.log(`  ${e.slug}  ${e.row['Picture']}`);
  const current = lists.students.filter(e => !e.row['Picture'] && /^(PhD|MS|BS)$/.test((e.row['Degree'] || '').trim()));
  console.log(`\nCurrent students (no graduation year) with no Picture: ${current.length}`);
  for (const e of current.slice(0, 40)) console.log(`  ${e.slug}  ${fullName(e.row)} (${e.row['Degree']}, ${e.row['Advisor']})`);
  process.exit(0);
}

// Former-faculty leads: names the data already points at (students' advisors, award recipients)
// that have no faculty record yet. Each is either a former faculty member to add, a current
// affiliate missing from the roster, someone from another department, or a misspelling.
if (key === 'former') {
  const known = new Set(faculty.map(fullName));
  const skip: Record<string, string> = read('maintenance/rotation.json').former?.skip ?? {};
  const studentNames = new Set(students.map(fullName));
  const leads = new Map<string, string[]>();
  const note = (name: string, why: string) => {
    if (!name || known.has(name) || Object.hasOwn(skip, name) || /^(none|na|n\/a)$/i.test(name)) return;
    leads.set(name, [...(leads.get(name) ?? []), why]);
  };
  for (const s of students) {
    note(s['Advisor'] || '', `advisor of ${fullName(s)}`);
    note(s['Co-Advisor'] || '', `co-advisor of ${fullName(s)}`);
  }
  const awards: Row[] = read('public/awards.json');
  for (const a of awards) if (!studentNames.has(a['Name'] || '')) note(a['Name'] || '', `award: ${a['Award']}`);
  const sorted = [...leads].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  console.log(`Former-faculty leads (${sorted.length}): names in students.json or awards.json with no faculty record`);
  console.log(`  (skipping ${Object.keys(skip).length} settled in maintenance/rotation.json former.skip)`);
  for (const [name, why] of sorted) console.log(`  ${name}  —  ${why.length} reference(s): ${why.slice(0, 3).join('; ')}${why.length > 3 ? '; …' : ''}`);
  process.exit(0);
}

const rotation = read('maintenance/rotation.json');
const fromIdx = process.argv.indexOf('--from');
const override = fromIdx !== -1 ? JSON.parse(process.argv[fromIdx + 1] || '{}') : null;
const config: Record<string, Cursor> | undefined = (override ?? rotation)[key];
if (!config) {
  console.error(`Usage: tsx scripts/next-batch.ts <${Object.keys(rotation).filter(k => !k.startsWith('_')).join('|')}|portraits|former>`);
  process.exit(1);
}

for (const [name, cursor] of Object.entries(config)) {
  if (typeof cursor !== 'object' || cursor === null || !('size' in cursor)) continue;
  const sorted = [...listFor(name)].sort((a, b) => a.slug.localeCompare(b.slug));
  const once = cursor.wrap === false;
  if (once && cursor.next === 'done') {
    console.log(`${key}.${name}: one-time pass complete (next is "done"); nothing to do\n`);
    continue;
  }
  let start = sorted.findIndex(e => e.slug >= (cursor.next || ''));
  if (start === -1) start = 0;
  const size = Math.min(cursor.size, once ? sorted.length - start : sorted.length);
  const batch = Array.from({ length: size }, (_, i) => sorted[(start + i) % sorted.length]!);
  const end = start + batch.length;
  const after = once && end >= sorted.length ? 'done' : sorted[end % sorted.length]!.slug;
  console.log(`${key}.${name}: ${batch.length} of ${sorted.length}, starting at "${batch[0]?.slug}"${once ? ' (one-time pass)' : ''}`);
  for (const e of batch) console.log(`  ${e.slug}  ${fullName(e.row)}  —  ${describe(name === 'students' ? 'students' : 'faculty', e.row)}`);
  console.log(`  → when the whole batch is done, set ${key}.${name}.next to "${after}"\n`);
}

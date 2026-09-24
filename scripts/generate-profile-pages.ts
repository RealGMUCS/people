import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { escapeHtml, formatRosterDate } from '../src/utils.ts';
import {
  LINKEDIN_ICON,
  PERSONAL_SITE_ICON,
  SCHOLAR_ICON,
} from '../src/common.ts';

const siteUrl = 'https://realgmucs.github.io/people';
const root = resolve(import.meta.dirname, '..');
const development = process.argv.includes('--dev');
const output = resolve(root, development ? 'public' : 'dist');
const peopleDir = resolve(output, 'people');
const commit = process.env.VITE_GIT_COMMIT || (() => {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'development';
  }
})();

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clean(v: unknown): string {
  return v ? String(v).trim() : '';
}

function normalizeUrl(v: unknown): string {
  const url = clean(v);
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

// A `picture` is either an external hotlinked URL or a local relative
// path under public/portraits/ (see scripts/fetch-portraits.ts) — resolve the
// latter to an absolute site URL for og:image/JSON-LD and for the profile
// page's <img> src (profile pages live one directory below the site root).
function resolvePictureUrl(picture: string): string {
  return picture.startsWith('http') ? picture : `${siteUrl}/${picture}`;
}

function parseList(v: unknown): string[] {
  return v ? String(v).split(';').map(s => s.trim()).filter(Boolean) : [];
}

function parseInterests(v: unknown): string[] {
  return v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : [];
}

interface FacultyEntry {
  firstName: string;
  lastName: string;
  email: string;
  track: string;
  rank: string;
  type: string;
  category: string;
  role: string;
  website: string;
  linkedin: string;
  scholar: string;
  interests: string[];
  office: string;
  yearStarted: string;
  undergradFrom: string;
  undergradYear: string;
  msFrom: string;
  msYear: string;
  phdFrom: string;
  phdYear: string;
  jdFrom: string;
  jdYear: string;
  postdocFrom: string;
  postdocYear: string;
  lastModified: string;
  lastVerified: string;
  verified: boolean;
  awards: Array<{ category?: string; award: string; year?: string | number }>;
  advisees: Array<{ firstName: string; lastName: string; degree: string; isCoAdvisor?: boolean }>;
  picture: string;
  slug: string;
}

interface StudentEntry {
  firstName: string;
  lastName: string;
  advisor: string;
  coAdvisor: string;
  degree: string;
  dissertationTitle: string;
  location: string;
  currentJob: string;
  firstJob: string;
  internships: string;
  honors: string[];
  topics: string[];
  picture: string;
  website: string;
  linkedin: string;
  scholar: string;
  lastModified: string;
  lastVerified: string;
  verified: boolean;
  slug: string;
}

function renderFacultyProfile(f: FacultyEntry) {
  const fullName = `${f.firstName} ${f.lastName}`.trim();
  const title = `${fullName} — Faculty Profile | GMU Computer Science`;
  const canonicalUrl = `${siteUrl}/people/${f.slug}.html`;
  const ogImage = f.picture ? resolvePictureUrl(f.picture) : `${siteUrl}/default-portrait.svg`;
  const roleParts = [f.category || f.rank, f.role, f.office, 'Department of Computer Science, George Mason University'].filter(Boolean);
  const description = `${fullName} is ${roleParts.join(' · ')}.`;

  const portrait = f.picture
    ? `<img class="portrait" src="${escapeHtml(resolvePictureUrl(f.picture))}" alt="Portrait of ${escapeHtml(fullName)}" width="240" height="240">`
    : `<img class="portrait portrait-placeholder" src="../default-portrait.svg" alt="No portrait on file for ${escapeHtml(fullName)}" width="240" height="240">`;

  const research = f.interests.length
    ? `<section class="man-section"><h2>RESEARCH AREAS</h2><ul>${f.interests.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul></section>`
    : '';

  const eduItems: string[] = [
    f.postdocFrom && `Postdoctoral training: ${[f.postdocFrom, f.postdocYear].filter(Boolean).join(', ')}`,
    f.phdFrom && `PhD: ${[f.phdFrom, f.phdYear].filter(Boolean).join(', ')}`,
    f.jdFrom && `JD: ${[f.jdFrom, f.jdYear].filter(Boolean).join(', ')}`,
    f.msFrom && `MS: ${[f.msFrom, f.msYear].filter(Boolean).join(', ')}`,
    f.undergradFrom && `Undergraduate: ${[f.undergradFrom, f.undergradYear].filter(Boolean).join(', ')}`,
    f.yearStarted && `At George Mason University since ${f.yearStarted}`,
  ].filter(Boolean) as string[];

  const educationSection = eduItems.length
    ? `<section class="man-section"><h2>EDUCATION &amp; APPOINTMENT</h2><ul>${eduItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';

  const honorsSection = f.awards.length
    ? `<section class="man-section"><h2>HONORS &amp; AWARDS</h2><ul>${f.awards.map(a => `<li><strong>${escapeHtml(a.award)}</strong>${a.year ? ` (${escapeHtml(String(a.year))})` : ''}${a.category ? ` · <span class="section-note">${escapeHtml(a.category)}</span>` : ''}</li>`).join('')}</ul></section>`
    : '';

  const adviseesSection = f.advisees.length
    ? `<section class="man-section"><h2>ADVISEES &amp; ALUMNI (${f.advisees.length})</h2><ul>${f.advisees.map(adv => {
        const advName = `${adv.firstName} ${adv.lastName}`.trim();
        const advSlug = slugify(advName);
        return `<li><a href="${advSlug}.html">${escapeHtml(advName)}</a>${adv.degree ? ` (${escapeHtml(adv.degree)})` : ''}</li>`;
      }).join('')}</ul></section>`
    : '';

  const links: Array<{ label: string; href: string; icon: string }> = [
    f.website && { label: 'Personal or Lab Website', href: f.website, icon: PERSONAL_SITE_ICON },
    f.scholar && { label: 'Google Scholar Profile', href: f.scholar, icon: SCHOLAR_ICON },
    f.linkedin && { label: 'LinkedIn Profile', href: f.linkedin, icon: LINKEDIN_ICON },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: string }>;

  const linkSection = links.length
    ? `<section class="man-section"><h2>PROFILES &amp; LINKS</h2><nav class="links" aria-label="External profiles">${links.map(({ label, href, icon }) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${escapeHtml(label)}</a>`).join('')}</nav></section>`
    : '';

  const editUrl = `../submit.html`;
  const rawRecord = escapeHtml(JSON.stringify(f, null, 2));

  const sameAs = [f.website, f.scholar, f.linkedin].filter(Boolean);
  const alumniOf = [
    f.phdFrom && { '@type': 'EducationalOrganization', name: f.phdFrom },
    f.jdFrom && { '@type': 'EducationalOrganization', name: f.jdFrom },
    f.msFrom && { '@type': 'EducationalOrganization', name: f.msFrom },
    f.undergradFrom && { '@type': 'EducationalOrganization', name: f.undergradFrom },
  ].filter(Boolean);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    jobTitle: f.category || f.rank,
    worksFor: {
      '@type': 'EducationalOrganization',
      name: 'George Mason University',
      department: { '@type': 'Organization', name: 'Department of Computer Science' },
    },
    affiliation: {
      '@type': 'EducationalOrganization',
      name: 'George Mason University',
      department: { '@type': 'Organization', name: 'Department of Computer Science' },
    },
    url: canonicalUrl,
    ...(f.picture ? { image: resolvePictureUrl(f.picture) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(alumniOf.length ? { alumniOf } : {}),
    ...(f.interests.length ? { knowsAbout: f.interests } : {}),
  });

  return `<!doctype html>
<!--
          _/\\
         /  \\      GMU CS Directory
        /_/\\_\\     ${escapeHtml(fullName)}
          ||
     view source encouraged · https://github.com/RealGMUCS/people
-->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#15181c" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="GMU CS Directory">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <title>${escapeHtml(title)}</title>
  <script type="application/ld+json">${jsonLd}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
</head>
<body class="subpage">
  <div id="app">
    <main>
      <article class="man-page">
        <p class="man-running-head">
          <span>FACULTY(1)</span>
          <span class="man-running-title">
            <a class="man-running-brand" href="../index.html" aria-label="GMU CS Directory">
              <span class="man-running-label">GMU CS Directory Profile</span>
            </a>
          </span>
          <span>FACULTY(1)</span>
        </p>
        <section class="man-section name-section">
          <h2>NAME</h2>
          <div class="identity">
            ${portrait}
            <div class="identity-details">
              <div class="name-heading">
                <div class="name-title">
                  <h1>${escapeHtml(fullName)}</h1>
                </div>
                <div class="profile-actions" aria-label="Roster actions">
                  <a class="submission-link" href="${escapeHtml(editUrl)}">Suggest an edit</a>
                </div>
              </div>
              <p class="native">${escapeHtml([f.category || f.rank, f.role].filter(Boolean).join(' · '))}</p>
              ${f.email ? `<p class="record-id">${escapeHtml(f.email)}</p>` : ''}
            </div>
          </div>
        </section>
        <section class="man-section">
          <h2>SYNOPSIS</h2>
          <p class="synopsis">${escapeHtml(roleParts.join(' · '))}</p>
          <div class="tags">
            ${f.type ? `<span class="tag tag-track">${escapeHtml(f.type)}</span>` : ''}
            ${f.verified ? '<span class="tag tag-verified">✓ Verified</span>' : ''}
            ${f.interests.map(i => `<a class="tag tag-topic" href="../index.html?q=${encodeURIComponent(i)}">${escapeHtml(i)}</a>`).join('')}
          </div>
        </section>
        ${research}
        ${educationSection}
        ${honorsSection}
        ${adviseesSection}
        ${linkSection}
        <section class="man-section">
          <h2>ROSTER METADATA</h2>
          <dl class="roster-metadata">
            <div><dt>record</dt><dd>${escapeHtml(fullName)}</dd></div>
            <div><dt>status</dt><dd>${f.verified ? 'Verified via direct correspondence' : 'Directory entry'}</dd></div>
            <div><dt>last verified</dt><dd>${escapeHtml(formatRosterDate(f.lastVerified || f.lastModified || ''))}</dd></div>
            <div><dt>build</dt><dd><a href="https://github.com/RealGMUCS/people/commit/${escapeHtml(commit)}">${escapeHtml(commit)}</a></dd></div>
          </dl>
          <details class="raw-record">
            <summary>view raw record</summary>
            <pre><code>${rawRecord}</code></pre>
          </details>
        </section>
      </article>
    </main>
  </div>
</body>
</html>`;
}

function renderStudentProfile(s: StudentEntry, facultyBySlug: Map<string, FacultyEntry>) {
  const fullName = `${s.firstName} ${s.lastName}`.trim();
  const title = `${fullName}${s.degree ? ` (${s.degree})` : ''} — GMU CS Students & Alumni`;
  const canonicalUrl = `${siteUrl}/people/${s.slug}.html`;
  const ogImage = s.picture ? resolvePictureUrl(s.picture) : `${siteUrl}/default-portrait.svg`;
  const roleParts = [s.degree, s.currentJob || s.firstJob, 'Department of Computer Science, George Mason University'].filter(Boolean);
  const description = `${fullName} is ${roleParts.join(' · ')}.`;

  const portrait = s.picture
    ? `<img class="portrait" src="${escapeHtml(resolvePictureUrl(s.picture))}" alt="Portrait of ${escapeHtml(fullName)}" width="240" height="240">`
    : `<img class="portrait portrait-placeholder" src="../default-portrait.svg" alt="No portrait on file for ${escapeHtml(fullName)}" width="240" height="240">`;

  const topics = s.topics.length
    ? `<section class="man-section"><h2>RESEARCH TOPICS</h2><ul>${s.topics.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></section>`
    : '';

  const advisorSlug = s.advisor ? slugify(s.advisor) : '';
  const advisorFaculty = facultyBySlug.get(advisorSlug);
  const advisorHtml = advisorFaculty
    ? `<a href="${advisorSlug}.html">${escapeHtml(s.advisor)}</a>`
    : escapeHtml(s.advisor);

  const coAdvisorSlug = s.coAdvisor ? slugify(s.coAdvisor) : '';
  const coAdvisorFaculty = facultyBySlug.get(coAdvisorSlug);
  const coAdvisorHtml = coAdvisorFaculty
    ? `<a href="${coAdvisorSlug}.html">${escapeHtml(s.coAdvisor)}</a>`
    : escapeHtml(s.coAdvisor);

  const mentorshipItems: string[] = [];
  if (s.advisor) mentorshipItems.push(`Advisor: ${advisorHtml}`);
  if (s.coAdvisor) mentorshipItems.push(`Co-Advisor: ${coAdvisorHtml}`);
  if (s.degree) mentorshipItems.push(`Degree: ${escapeHtml(s.degree)}`);

  const mentorshipSection = mentorshipItems.length
    ? `<section class="man-section"><h2>DEGREE &amp; ADVISOR</h2><ul>${mentorshipItems.map(item => `<li>${item}</li>`).join('')}</ul></section>`
    : '';

  const dissertationSection = s.dissertationTitle
    ? `<section class="man-section"><h2>DISSERTATION</h2><p class="synopsis"><strong>${escapeHtml(s.dissertationTitle)}</strong></p></section>`
    : '';

  const careerItems: string[] = [
    s.currentJob && `Current Job: ${escapeHtml(s.currentJob)}`,
    s.firstJob && `First Placement: ${escapeHtml(s.firstJob)}`,
    s.internships && `Internships: ${escapeHtml(s.internships)}`,
    s.location && (s.currentJob || s.firstJob) && `Placement Location: ${escapeHtml(s.location)}`,
  ].filter(Boolean) as string[];

  const careerSection = careerItems.length
    ? `<section class="man-section"><h2>CAREER &amp; PLACEMENT</h2><ul>${careerItems.map(item => `<li>${item}</li>`).join('')}</ul></section>`
    : '';

  const honorsSection = s.honors.length
    ? `<section class="man-section"><h2>HONORS &amp; AWARDS</h2><ul>${s.honors.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul></section>`
    : '';

  const links: Array<{ label: string; href: string; icon: string }> = [
    s.website && { label: 'Personal or Lab Website', href: s.website, icon: PERSONAL_SITE_ICON },
    s.scholar && { label: 'Google Scholar Profile', href: s.scholar, icon: SCHOLAR_ICON },
    s.linkedin && { label: 'LinkedIn Profile', href: s.linkedin, icon: LINKEDIN_ICON },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: string }>;

  const linkSection = links.length
    ? `<section class="man-section"><h2>PROFILES &amp; LINKS</h2><nav class="links" aria-label="External profiles">${links.map(({ label, href, icon }) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${escapeHtml(label)}</a>`).join('')}</nav></section>`
    : '';

  const editUrl = `../submit.html`;
  const rawRecord = escapeHtml(JSON.stringify(s, null, 2));

  const sameAs = [s.website, s.scholar, s.linkedin].filter(Boolean);
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName,
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: 'George Mason University',
      department: { '@type': 'Organization', name: 'Department of Computer Science' },
    },
    affiliation: {
      '@type': 'EducationalOrganization',
      name: 'George Mason University',
      department: { '@type': 'Organization', name: 'Department of Computer Science' },
    },
    url: canonicalUrl,
    ...(s.currentJob ? { jobTitle: s.currentJob } : {}),
    ...(s.picture ? { image: resolvePictureUrl(s.picture) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(s.topics.length ? { knowsAbout: s.topics } : {}),
  });

  return `<!doctype html>
<!--
          _/\\
         /  \\      GMU CS Directory — Students & Alumni
        /_/\\_\\     ${escapeHtml(fullName)}
          ||
     view source encouraged · https://github.com/RealGMUCS/people
-->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#15181c" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="GMU CS Directory">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <title>${escapeHtml(title)}</title>
  <script type="application/ld+json">${jsonLd}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
</head>
<body class="subpage">
  <div id="app">
    <main>
      <article class="man-page">
        <p class="man-running-head">
          <span>STUDENT(1)</span>
          <span class="man-running-title">
            <a class="man-running-brand" href="../students.html" aria-label="GMU CS Directory">
              <span class="man-running-label">GMU CS Graduate Directory Profile</span>
            </a>
          </span>
          <span>STUDENT(1)</span>
        </p>
        <section class="man-section name-section">
          <h2>NAME</h2>
          <div class="identity">
            ${portrait}
            <div class="identity-details">
              <div class="name-heading">
                <div class="name-title">
                  <h1>${escapeHtml(fullName)}</h1>
                </div>
                <div class="profile-actions" aria-label="Roster actions">
                  <a class="submission-link" href="${escapeHtml(editUrl)}">Suggest an edit</a>
                </div>
              </div>
              <p class="native">${escapeHtml([s.degree, s.currentJob || s.firstJob].filter(Boolean).join(' · '))}</p>
            </div>
          </div>
        </section>
        <section class="man-section">
          <h2>SYNOPSIS</h2>
          <p class="synopsis">${escapeHtml(roleParts.join(' · '))}</p>
          <div class="tags">
            ${s.degree ? `<span class="tag tag-track">${escapeHtml(s.degree)}</span>` : ''}
            ${s.verified ? '<span class="tag tag-verified">✓ Verified</span>' : ''}
            ${s.topics.map(t => `<a class="tag tag-topic" href="../students.html?q=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}
          </div>
        </section>
        ${mentorshipSection}
        ${dissertationSection}
        ${careerSection}
        ${topics}
        ${honorsSection}
        ${linkSection}
        <section class="man-section">
          <h2>ROSTER METADATA</h2>
          <dl class="roster-metadata">
            <div><dt>record</dt><dd>${escapeHtml(fullName)}</dd></div>
            <div><dt>status</dt><dd>${s.verified ? 'Verified via direct correspondence' : 'Directory entry'}</dd></div>
            <div><dt>last verified</dt><dd>${escapeHtml(formatRosterDate(s.lastVerified || s.lastModified || ''))}</dd></div>
            <div><dt>build</dt><dd><a href="https://github.com/RealGMUCS/people/commit/${escapeHtml(commit)}">${escapeHtml(commit)}</a></dd></div>
          </dl>
          <details class="raw-record">
            <summary>view raw record</summary>
            <pre><code>${rawRecord}</code></pre>
          </details>
        </section>
      </article>
    </main>
  </div>
</body>
</html>`;
}

async function main() {
  const [rawFaculty, rawAwards, rawStudents] = await Promise.all([
    readFile(resolve(root, 'public/faculty.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/awards.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'public/students.json'), 'utf8').then(JSON.parse),
  ]);

  const awardsByName = new Map<string, Array<{ category?: string; award: string; year?: string | number }>>();
  rawAwards.forEach((a: any) => {
    const name = clean(a.Name);
    if (!awardsByName.has(name)) awardsByName.set(name, []);
    awardsByName.get(name)!.push({
      category: clean(a.Category),
      award: clean(a.Award),
      year: clean(a.Year),
    });
  });

  const facultyBySlug = new Map<string, FacultyEntry>();
  const facultyList: FacultyEntry[] = rawFaculty.map((row: any) => {
    const firstName = clean(row['First Name']);
    const lastName = clean(row['Last Name']);
    const fullName = `${firstName} ${lastName}`.trim();
    const slug = slugify(fullName);
    const awards = awardsByName.get(fullName) || [];
    return {
      firstName,
      lastName,
      email: clean(row['gmu email/userid']),
      track: clean(row['Tenure-Track/Teaching/Staff']),
      rank: clean(row['Rank']),
      type: clean(row['Tenure-Track/Teaching/Staff']),
      category: clean(row['Rank']),
      role: clean(row['Dept Role']),
      website: normalizeUrl(row['Website']),
      linkedin: normalizeUrl(row['LinkedIn']),
      scholar: normalizeUrl(row['Google Scholar']),
      interests: parseInterests(row['Research interests'] || row['Research Interests']),
      office: clean(row['Office (building and room #)']),
      yearStarted: clean(row['Year started at GMU']),
      undergradFrom: clean(row['Undergrad from']),
      undergradYear: clean(row['Undergrad Year']),
      msFrom: clean(row['MS from']),
      msYear: clean(row['MS Year']),
      phdFrom: clean(row['PhD from']),
      phdYear: clean(row['PhD Year']),
      jdFrom: clean(row['JD from']),
      jdYear: clean(row['JD Year']),
      postdocFrom: clean(row['Postdoc from']),
      postdocYear: clean(row['Postdoc Year']),
      lastModified: clean(row['Last Modified']),
      lastVerified: clean(row['Last Verified']),
      verified: clean(row['Verified']) === 'Yes',
      awards,
      advisees: [],
      picture: clean(row['Picture']),
      slug,
    };
  });

  facultyList.forEach(f => facultyBySlug.set(f.slug, f));

  const facultyByName = new Map(facultyList.map(f => [`${f.firstName} ${f.lastName}`.trim(), f]));

  const usedStudentSlugs = new Set<string>();
  const studentList: StudentEntry[] = rawStudents.map((row: any) => {
    const firstName = clean(row['First Name']);
    const lastName = clean(row['Last Name']);
    const fullName = `${firstName} ${lastName}`.trim();
    let slug = slugify(fullName);
    if (facultyBySlug.has(slug)) {
      slug = `${slug}-student`;
    } else if (usedStudentSlugs.has(slug)) {
      let counter = 2;
      while (usedStudentSlugs.has(`${slug}-${counter}`)) counter++;
      slug = `${slug}-${counter}`;
    }
    usedStudentSlugs.add(slug);

    const advisor = clean(row['Advisor']);
    const coAdvisor = clean(row['Co-Advisor']);
    const degree = clean(row['Degree']);

    if (advisor && facultyByName.has(advisor)) {
      facultyByName.get(advisor)!.advisees.push({ firstName, lastName, degree, isCoAdvisor: false });
    }
    if (coAdvisor && facultyByName.has(coAdvisor)) {
      facultyByName.get(coAdvisor)!.advisees.push({ firstName, lastName, degree, isCoAdvisor: true });
    }

    return {
      firstName,
      lastName,
      advisor,
      coAdvisor,
      degree,
      dissertationTitle: clean(row['Dissertation Title']),
      location: clean(row['Location']),
      currentJob: clean(row['Current Job']),
      firstJob: clean(row['First Job']),
      internships: clean(row['Internships']),
      honors: parseList(row['Honors & Awards']),
      topics: parseInterests(row['Topics']),
      picture: clean(row['Picture']),
      website: normalizeUrl(row['Website']),
      linkedin: normalizeUrl(row['LinkedIn']),
      scholar: normalizeUrl(row['Google Scholar']),
      lastModified: clean(row['Last Modified']),
      lastVerified: clean(row['Last Verified']),
      verified: clean(row['Verified']) === 'Yes',
      slug,
    };
  });

  const [profileCss, customCss] = await Promise.all([
    readFile(resolve(root, 'src/profile.css'), 'utf8'),
    readFile(resolve(root, 'src/style.css'), 'utf8'),
  ]);
  const combinedCss = `${profileCss}\n\n${customCss.replace(/@import\s+['"].\/profile\.css['"];?\s*/g, '')}`;
  await mkdir(output, { recursive: true });
  await writeFile(resolve(root, 'public/style.css'), combinedCss, 'utf8');
  await writeFile(resolve(output, 'style.css'), combinedCss, 'utf8');

  await rm(peopleDir, { recursive: true, force: true });
  await mkdir(peopleDir, { recursive: true });

  await Promise.all([
    ...facultyList.map(async f => {
      const file = resolve(peopleDir, `${f.slug}.html`);
      await writeFile(file, renderFacultyProfile(f), 'utf8');
    }),
    ...studentList.map(async s => {
      const file = resolve(peopleDir, `${s.slug}.html`);
      await writeFile(file, renderStudentProfile(s, facultyBySlug), 'utf8');
    }),
  ]);

  if (!development) {
    const sitemapUrls = [
      ...facultyList.map(f => `  <url>\n    <loc>${siteUrl}/people/${f.slug}.html</loc>\n    <lastmod>${f.lastModified || '2026-09-15'}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
      ...studentList.map(s => `  <url>\n    <loc>${siteUrl}/people/${s.slug}.html</loc>\n    <lastmod>${s.lastModified || '2026-09-15'}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`),
    ];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>${siteUrl}/students.html</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n  <url>\n    <loc>${siteUrl}/submit.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n${sitemapUrls.join('\n')}\n</urlset>\n`;
    await writeFile(resolve(output, 'sitemap.xml'), sitemap, 'utf8');
  }

  console.log(`Generated ${facultyList.length + studentList.length} profile pages (${facultyList.length} faculty, ${studentList.length} students/alumni)${development ? ' for development.' : ' and sitemap.xml.'}`);
}

await main();

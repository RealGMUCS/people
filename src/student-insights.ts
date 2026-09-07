// @ts-nocheck
// Pure analytics helpers for the student directory.
export function isAcademiaJob(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    const roles = ['professor', 'prof.', 'prof ', 'postdoc', 'postdoctoral', 'faculty', 'lecturer', 'instructor', 'tenure'];
    const insts = ['university', 'college', 'univ', 'tu delft', 'eth zurich', 'epfl', 'mit ', 'stanford'];
    if (roles.some(r => t.includes(r))) return true;
    if (insts.some(i => t.includes(i)) && (t.includes('researcher') || t.includes('fellow') || t.includes('scholar'))) return true;
    return false;
}

export function isGovLabJob(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    const keywords = ['nasa', 'jpl', 'oak ridge', 'national lab', 'mitre', 'rand', 'nih', 'dod', 'navy', 'air force', 'army', 'defense', 'department of', 'government'];
    return keywords.some(k => t.includes(k));
}

export function isIndustryJob(text) {
    if (!text) return false;
    return !isAcademiaJob(text) && !isGovLabJob(text);
}

export function isGmuFacultyJob(job) {
    if (!job) return false;
    const j = job.toLowerCase();
    return (j.includes('gmu') || j.includes('george mason')) &&
        (j.includes('professor') || j.includes('prof') || j.includes('faculty') || j.includes('lecturer') || j.includes('instructor'));
}

export function nameKey(first, last) {
    const full = `${first || ''} ${last || ''}`.toLowerCase();
    if (full.includes('samudio')) return 'samudio';
    return full.replace(/[^a-z]/g, '');
}

export function getGmuAlumniFaculty(studentsSubset, allFaculty, allStudents) {
    const list = [];
    const seen = new Set();
    const studentKeys = new Set(studentsSubset.map(s => nameKey(s.firstName, s.lastName)));

    allFaculty.forEach(f => {
        const phd = (f.phdFrom || '').toLowerCase();
        if (phd.includes('gmu') || phd.includes('george mason')) {
            const key = nameKey(f.firstName, f.lastName);
            if (studentKeys.has(key) || studentsSubset.length === allStudents.length) {
                if (!seen.has(key)) {
                    seen.add(key);
                    list.push({
                        name: `${f.firstName || ''} ${f.lastName || ''}`.trim(),
                        role: `${f.rank || f.category || 'Faculty'}, GMU CS`,
                    });
                }
            }
        }
    });

    studentsSubset.forEach(s => {
        const cur = s.currentJob || '';
        const fst = s.firstJob || '';
        if (isGmuFacultyJob(cur) || isGmuFacultyJob(fst)) {
            const key = nameKey(s.firstName, s.lastName);
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                    role: cur || fst,
                });
            }
        }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function extractOrg(text) {
    if (!text) return null;
    let part = text.includes(',') ? text.split(',').slice(1).join(',').trim() : text.trim();
    part = part.replace(/\(.*?\)/g, '').trim();
    return part || null;
}

export function topCounts(items, limit) {
    const counts = new Map();
    items.forEach(item => {
        if (!item) return;
        counts.set(item, (counts.get(item) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .slice(0, limit);
}

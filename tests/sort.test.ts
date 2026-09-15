import test from 'node:test';
import assert from 'node:assert/strict';

interface TestPerson {
    firstName: string;
    lastName: string;
    entryIndex: number;
    lastModified?: string;
}

function sortEntries<T extends TestPerson>(list: T[], order: string): T[] {
    const arr = list.slice();
    switch (order) {
        case 'newest':
        case 'vp-newest':
        case 'recently-added':
            return arr.sort((a, b) => (b.entryIndex ?? 0) - (a.entryIndex ?? 0));
        case 'recent':
            return arr.sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || '') || (b.entryIndex ?? 0) - (a.entryIndex ?? 0) || (a.lastName || '').localeCompare(b.lastName || ''));
        case 'first-name':
            return arr.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || '') || (a.lastName || '').localeCompare(b.lastName || ''));
        case 'name-desc':
            return arr.sort((a, b) => (b.lastName || '').localeCompare(a.lastName || '') || (b.firstName || '').localeCompare(a.firstName || ''));
        case 'name-asc':
        default:
            return arr.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''));
    }
}

test('newest sort order returns most recently added entries first based on entryIndex', () => {
    const items: TestPerson[] = [
        { firstName: 'Alice', lastName: 'Smith', entryIndex: 0, lastModified: '2026-09-01' },
        { firstName: 'Bob', lastName: 'Adams', entryIndex: 1, lastModified: '2026-09-05' },
        { firstName: 'Charlie', lastName: 'Baker', entryIndex: 2, lastModified: '2026-09-02' },
    ];

    const sortedByNewest = sortEntries(items, 'newest');
    assert.deepEqual(
        sortedByNewest.map(i => i.entryIndex),
        [2, 1, 0]
    );
    assert.equal(sortedByNewest[0].firstName, 'Charlie');
});

test('recent sort order returns most recently modified entries first', () => {
    const items: TestPerson[] = [
        { firstName: 'Alice', lastName: 'Smith', entryIndex: 0, lastModified: '2026-09-01' },
        { firstName: 'Bob', lastName: 'Adams', entryIndex: 1, lastModified: '2026-09-05' },
        { firstName: 'Charlie', lastName: 'Baker', entryIndex: 2, lastModified: '2026-09-02' },
    ];

    const sortedByRecent = sortEntries(items, 'recent');
    assert.deepEqual(
        sortedByRecent.map(i => i.firstName),
        ['Bob', 'Charlie', 'Alice']
    );
});

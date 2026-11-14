import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleLines, cecEntries, cvLinks, htmlLines, metaRefresh, MINOR_TRACK, nameKey, nameKeys, scriptSources, TOP_VENUE } from '../scripts/news-watch-lib.ts';

// Link shapes copied from faculty homepages (2026-11-05).
test('cvLinks finds CV links by text, file name, or aria-label, resolved against the page', () => {
    const html = `
        <a href="cv.html">CV (Web)</a> <a target="_blank" href="zeinalipour.pdf">CV (PDF)</a>
        <a href="/uploads/MyCV.pdf" aria-label="cv"><i class="ai ai-cv"></i></a>
        <a href="/~hgomaa/assets/Resume.pdf">Resume</a>
        <a href="http://mason.gmu.edu/~johri/Aditya%20Johri%20-%20Curriculum%20Vitae.pdf">c.v.</a>
        <a href="LL-cv.pdf">Vita</a> <a href="cv/MingruiLiu_CV.pdf"><img src="x.png"></a>
        <a class="dropdown-item" href="/cv/">CV</a> <a href="CV_LishanYang.pdf">Check my CV here</a>`;
    assert.deepEqual(cvLinks(html, 'https://example.github.io/home/').sort(), [
        'http://mason.gmu.edu/~johri/Aditya%20Johri%20-%20Curriculum%20Vitae.pdf',
        'https://example.github.io/cv',
        'https://example.github.io/home/CV_LishanYang.pdf',
        'https://example.github.io/home/LL-cv.pdf',
        'https://example.github.io/home/cv.html',
        'https://example.github.io/home/cv/MingruiLiu_CV.pdf',
        'https://example.github.io/home/zeinalipour.pdf',
        'https://example.github.io/uploads/MyCV.pdf',
        'https://example.github.io/~hgomaa/assets/Resume.pdf',
    ]);
});

test('cvLinks ignores look-alikes, long sentences, and LinkedIn/Scholar', () => {
    const html = `
        <a href="/papers/cvpr24.pdf">CVPR 2024 paper</a> <a href="iccv.html">ICCV</a>
        <a href="/programs/global-commerce-and-policy-curriculum">Global Commerce and Policy Curriculum</a>
        <a href="/news.html">See my CV and recent news in the section below for details</a>
        <a href="https://www.instagram.com/p/CVb2ePqryAJ/">photo</a> <a href="https://www.linkedin.com/in/someone">CV</a> <a href="mailto:x@gmu.edu">CV</a>`;
    assert.deepEqual(cvLinks(html, 'https://example.org/'), []);
});

test('htmlLines drops scripts and markup, splits blocks, and keeps lines of 15+ characters', () => {
    const html = '<script>var x = "ignored text here";</script><ul><li>NSF CAREER Award, 2015</li><li>Home</li></ul><p>Best Paper &amp; Award at ICSE 2024</p>';
    assert.deepEqual(htmlLines(html), ['NSF CAREER Award, 2015', 'Best Paper & Award at ICSE 2024']);
});

// Stub homepages seen on 2026-11-13 (msnyde14, shvetha, torabi.org).
test('metaRefresh follows refresh tags and domain-forwarding framesets', () => {
    assert.equal(metaRefresh('<meta http-equiv="REFRESH" content="0;url=http://www.muddsnyder.com/">', 'https://people.cs.gmu.edu/~msnyde14/'), 'http://www.muddsnyder.com/');
    assert.equal(metaRefresh('<meta http-equiv="refresh" content="0;url= Home.html" />', 'https://people.cs.gmu.edu/~shvetha/'), 'https://people.cs.gmu.edu/~shvetha/Home.html');
    assert.equal(metaRefresh('<frameset><frame name="TopFrame" src="https://satorabi.github.io/"></frameset>', 'http://torabi.org/'), 'https://satorabi.github.io/');
    assert.equal(metaRefresh('<meta name="viewport" content="width=device-width">', 'https://example.org/'), undefined);
});

test('scriptSources keeps same-host scripts; bundleLines keeps prose and drops code', () => {
    const html = '<script type="module" src="/deerlab/assets/index-D4.js"></script><script src="https://cdn.example.com/x.js"></script>';
    assert.deepEqual(scriptSources(html, 'https://deerlab22030.github.io/deerlab/'), ['https://deerlab22030.github.io/deerlab/assets/index-D4.js']);
    const js = 'const a="Our social-pragmatic inference benchmark paper was accepted.",b="md:hidden flex flex-col gap-[4px] p-2",c="function x() { return 1; }",d=`Junjie, Weisen, and Zhicong helped guide the AVATAR project`;';
    assert.deepEqual(bundleLines(js), ['Our social-pragmatic inference benchmark paper was accepted.', 'Junjie, Weisen, and Zhicong helped guide the AVATAR project']);
});

test('nameKeys and nameKey match roster names across nicknames, accents, and middle names', () => {
    assert.deepEqual(nameKeys('Lap-Fai (Craig)', 'Yu').sort(), ['craig yu', 'lap-fai yu']);
    assert.deepEqual(nameKeys('Daniel', 'Menascé'), ['daniel menasce']);
    assert.equal(nameKey('Marcos A. Zampieri'), 'marcos zampieri');
    assert.equal(nameKey('Zampieri, Marcos'), 'marcos zampieri');
    assert.equal(nameKey('Daniel Menasce'), 'daniel menasce');
});

// OpenAlex source names, 2026-11-13.
test('TOP_VENUE and MINOR_TRACK sort OpenAlex venues', () => {
    const top = (venue: string) => TOP_VENUE.test(venue) && !MINOR_TRACK.test(venue);
    assert.ok(top('ACM SIGSAC Conference on Computer and Communications Security (CCS)'));
    assert.ok(top('ACM Annual International Conference on Mobile Computing and Networking (MobiCom)'));
    assert.ok(top('ACM Transactions on Software Engineering and Methodology'));
    assert.ok(top('Proceedings - IEEE International Conference on Robotics and Automation/Proceedings'));
    assert.ok(!top('IEEE European Symposium on Security and Privacy'));
    assert.ok(!top('ACM Asia Conference on Computer and Communications Security (ASIA CCS)'));
    assert.ok(!top('ACM Workshop on Artificial Intelligence and Security (AISec)'));
    assert.ok(!top('IEEE International Conference on Software Maintenance (ICSM)'));
    assert.ok(!top('arXiv (Cornell University)'));
});

// Entry shapes copied from cec.gmu.edu/research/grants (2026-11-13).
test('cecEntries parses the CEC grants list and keeps entries naming roster faculty', () => {
    const html = `<div class="field"><p><span class="intro-text">The following is a list of grants recently awarded.</span></p>
<p><strong>Bob Elder received funding from the Army Contracting Command, Rock Island</strong></p>
<p>Bob Elder received funding from the Army Contracting Command, Rock Island for AFCENT Operational Concepts.</p>
<p>Anticipated funding: $276,165</p>
<p>November 9, 2026</p>
<hr>
<p><strong>Keren Zhou, Xiaokuan Zhang, and Songqing Chen received funding from the National Science Foundation (NSF)</strong></p>
<p>Keren Zhou, Xiaokuan Zhang, and Songqing Chen received funding from the NSF for POSE: Phase I: Tile-Debugger.</p>
<p>Anticipated funding: $300,000</p>
<p>August 24, 2026</p>
<hr>
<p><strong>Alexander Brodsky receives funding from the National Science Foundation (NSF)</strong></p>
<p>Alexander Brodsky received funding from the NSF for I-Corps: Translation potential of a platform.</p>
<p>September 14, 2026</p>
<p>Anticipated funding: $50,000</p>
<hr>
<p><strong>Eric W. Vollmecke receives funding from Air Force Research Laboratory</strong></p>
<p>Eric W. Vollmecke receives funding from Air Force Research Laboratory for NEXTGEN BLOS Study.</p>
<p>Anticipated funding: $333,572</p></div>`;
    const roster = new Map([['keren zhou', 'Keren Zhou'], ['songqing chen', 'Songqing Chen'], ['alexander brodsky', 'Alexander Brodsky'], ['eric vollmecke', 'Eric Vollmecke']]);
    const items = cecEntries(html, key => roster.get(key));
    assert.deepEqual(items.map(({ id, url, headline, ...rest }) => rest), [
        { date: '2026-08-24', funder: 'NSF', title: 'POSE: Phase I: Tile-Debugger', amount: '$300,000', people: ['Keren Zhou', 'Songqing Chen'] },
        { date: '2026-09-14', funder: 'NSF', title: 'I-Corps: Translation potential of a platform', amount: '$50,000', people: ['Alexander Brodsky'] },
        { date: '', funder: 'Air Force Research Laboratory', title: 'NEXTGEN BLOS Study', amount: '$333,572', people: ['Eric Vollmecke'] },
    ]);
    assert.match(items[0].id, /^[\da-f]{8}$/);
});

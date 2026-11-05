import test from 'node:test';
import assert from 'node:assert/strict';
import { cvLinks, htmlLines } from '../scripts/news-watch-lib.ts';

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

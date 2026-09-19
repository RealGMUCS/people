import test from 'node:test';
import assert from 'node:assert/strict';
import { isAcademiaJob, isGovLabJob, isIndustryJob } from '../src/student-insights.ts';

test('job categorization classifies academia, industry, and national labs correctly', () => {
    // Academia
    assert.equal(isAcademiaJob('Assistant Professor, University of Maryland'), true);
    assert.equal(isAcademiaJob('Postdoctoral Fellow, Flatiron Institute'), true);
    assert.equal(isAcademiaJob('Lecturer, Department of Computer Science, George Mason University'), true);

    // National Labs / Government
    assert.equal(isGovLabJob('Computer Scientist, Naval Research Lab'), true);
    assert.equal(isGovLabJob('Lawrence Livermore National Lab'), true);
    assert.equal(isGovLabJob('Health Scientist, NIAID / NIH'), true);
    assert.equal(isGovLabJob('Robotics Technologist, NASA Jet Propulsion Laboratory'), true);
    assert.equal(isGovLabJob('Senior Cyber Security Engineer, MITRE Corporation'), true);

    // Substring false positive guard (e.g. "Rio Grande", "Department of Computer Science")
    assert.equal(isGovLabJob('Assistant Professor, University of Texas Rio Grande Valley'), false);
    assert.equal(isGovLabJob('Associate Professor, Department of Computer Science, Bowling Green State University'), false);

    // Industry
    assert.equal(isIndustryJob('Senior Software Engineer, Google'), true);
    assert.equal(isIndustryJob('Principal Software Development Engineer, Amazon Web Services (AWS)'), true);
    assert.equal(isIndustryJob('Applied & Data Scientist, Microsoft'), true);
    assert.equal(isIndustryJob('Computer Scientist, Naval Research Lab'), false);
    assert.equal(isIndustryJob('Assistant Professor, University of Maryland'), false);
});

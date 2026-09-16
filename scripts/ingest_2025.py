import json

# Load existing datasets
with open('public/students.json', 'r', encoding='utf-8') as f:
    students = json.load(f)

with open('public/awards.json', 'r', encoding='utf-8') as f:
    awards = json.load(f)

with open('public/faculty.json', 'r', encoding='utf-8') as f:
    faculty = json.load(f)

faculty_map = {}
for f in faculty:
    full = f"{f['First Name']} {f['Last Name']}".strip()
    faculty_map[full.lower()] = full
    if 'Brittany Johnson' in full:
        faculty_map['brittany johnson-matthews'] = full
        faculty_map['brittany johnson-matthew'] = full
    if 'Lisa Luo' in full or 'Lannan' in full:
        faculty_map['lisa luo'] = full
        faculty_map['lannan luo'] = full
    if 'Duric' in full or 'Durić' in full:
        faculty_map['zoran duric'] = full
        faculty_map['zoran durić'] = full
    if 'Craig Yu' in full or 'Lap-Fai' in full:
        faculty_map['lap-fai (craig) yu'] = full
        faculty_map['lap fai (craig) yu'] = full

def normalize_advisor(adv):
    if not adv:
        return ''
    clean_adv = adv.replace('Professor', '').replace('Prof.', '').replace('Profesor', '').strip()
    low = clean_adv.lower()
    if low in faculty_map:
        return faculty_map[low]
    for k, v in faculty_map.items():
        if k in low or low in k:
            return v
    return clean_adv

# 1. 2025 Faculty Awards & Recognitions
new_faculty_awards_2025 = [
    {'Name': 'Evgenios Kornaropoulos', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Research Award (Rising Star)', 'Year': '2025', 'Former': ''},
    {'Name': 'Giuseppe Ateniese', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Research Award (Tenured Faculty)', 'Year': '2025', 'Former': ''},
    {'Name': 'Wassim Itani', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Teaching Award (Term Faculty)', 'Year': '2025', 'Former': ''},
    {'Name': 'Lishan Yang', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Teaching Award (Tenure-Line Faculty)', 'Year': '2025', 'Former': ''},
    {'Name': 'Yotam Gingold', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Service Award', 'Year': '2025', 'Former': ''},
    {'Name': 'Kristi Morrow', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Staff Award', 'Year': '2025', 'Former': ''},
    {'Name': 'Thema Monroe-White', 'Category': 'NSF CAREER Awards', 'Award': '"Investigating Undergraduate Student Persistence Intentions for a Diverse Data Science Community"', 'Year': '2024', 'Former': ''},
    {'Name': 'Kevin Andrea', 'Category': 'Mason Awards', 'Award': 'Teaching Excellence Award', 'Year': '2025', 'Former': ''},
    {'Name': 'Kevin Andrea', 'Category': 'Mason Awards', 'Award': 'CEC Dean’s Award for Outstanding Term Assistant Professor', 'Year': '2025', 'Former': ''},
    {'Name': 'Michele Pieper', 'Category': 'Mason Awards', 'Award': 'CEC Dean’s Award for Staff Excellence', 'Year': '2025', 'Former': ''},
    {'Name': 'Mark Snyder', 'Category': 'Mason Awards', 'Award': 'CEC Dean’s Award for Faculty Excellence in Service', 'Year': '2025', 'Former': ''},
    {'Name': 'Xuesu Xiao', 'Category': 'Mason Awards', 'Award': 'CEC Dean’s Award for Faculty Excellence in Research', 'Year': '2025', 'Former': ''},
    {'Name': 'Dov Gordon', 'Category': 'Most Influential Paper, Impact Paper, and Test of Time Paper Awards', 'Award': 'Distinguished Paper Award, ACM CCS 2024', 'Year': '2024', 'Former': ''},
    {'Name': 'Xiaokuan Zhang', 'Category': 'Most Influential Paper, Impact Paper, and Test of Time Paper Awards', 'Award': 'Distinguished Paper Award, ACM CCS 2024', 'Year': '2024', 'Former': ''}
]

added_awards = 0
for na in new_faculty_awards_2025:
    if not any(a['Name'] == na['Name'] and a['Award'] == na['Award'] and a['Year'] == na['Year'] for a in awards):
        awards.append(na)
        added_awards += 1

print(f"Added {added_awards} 2025 faculty awards.")

# 2. 2025 PhD Graduates Data
phd_2025 = [
    {
        'first': 'Abdulrahman', 'last': 'Alshammari', 'advisor': 'Wing Lam', 'coadvisor': '',
        'dissertation': 'Detecting Test Flakiness Without Rerunning Tests',
        'honor': ''
    },
    {
        'first': 'Angeela', 'last': 'Acharya', 'advisor': 'Sanmay Das', 'coadvisor': '',
        'dissertation': 'Data-Driven Strategies For Improved Healthcare Decision Making: From Knowledge Discovery To Risk Stratification',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Changyang', 'last': 'Li', 'advisor': 'Craig Yu', 'coadvisor': '',
        'dissertation': 'Enhancing Extended Reality Experiences by Understanding The Environments',
        'honor': 'Outstanding Academic Achievement (PhD); Outstanding PhD Dissertation Award (2025)'
    },
    {
        'first': 'Md Mahfuz Ibn', 'last': 'Alam', 'advisor': 'Antonios Anastasopoulos', 'coadvisor': '',
        'dissertation': 'Enhancing Translation Systems for Low-resourced Settings',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Sahar', 'last': 'Mehrpour', 'advisor': 'Thomas LaToza', 'coadvisor': '',
        'dissertation': 'Helping Developers Work with Design Decisions',
        'honor': 'Distinguished Academic Achievement (PhD); Outstanding PhD Student Award (2025)'
    },
    {
        'first': 'Nan', 'last': 'Wu', 'advisor': 'Bo Han', 'coadvisor': '',
        'dissertation': 'Advancing Mobile Immersive Computing: Systems and User Experience Perspectives',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Chuan', 'last': 'Yan', 'advisor': 'Yotam Gingold', 'coadvisor': '',
        'dissertation': 'Visual Thinking: A Study of Human-Centered and AI-Based Digital Painting',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Maryam', 'last': 'Arab', 'advisor': 'Thomas LaToza', 'coadvisor': '',
        'dissertation': 'Explicit Programming Strategies',
        'honor': ''
    },
    {
        'first': 'Daniel', 'last': 'McVicker', 'advisor': 'Dov Gordon', 'coadvisor': '',
        'dissertation': 'Scalable Secure Multiparty Computation',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Yoon', 'last': 'Chae', 'advisor': 'Parth Pathak', 'coadvisor': '',
        'dissertation': 'Toward High-speed and Reliable Next-generation IoT',
        'honor': ''
    },
    {
        'first': 'Tasfia', 'last': 'Mashiat', 'advisor': 'Sanmay Das', 'coadvisor': '',
        'dissertation': 'Simulation to Practice: Data-driven Characterization of Fairness in Societal Resource Allocation',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Yong', 'last': 'Xue', 'advisor': 'Alex Brodsky', 'coadvisor': '',
        'dissertation': 'A Synthesis - Based Approach to Optimal Virtual Network Provisioning and Dynamic Optimization in Multi - AS Environment',
        'honor': ''
    },
    {
        'first': 'Jonathan Patricio', 'last': 'Vasquez Verdugo', 'advisor': 'Huzefa Rangwala', 'coadvisor': '',
        'dissertation': 'Audit and Assessment of Disparity Risks in Machine Learning Pipeline',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Ajay Krishna', 'last': 'Vajjala', 'advisor': 'David Rosenblum', 'coadvisor': '',
        'dissertation': 'Enhancing Cross-Domain Recommendation Through Domain Similarity',
        'honor': ''
    },
    {
        'first': 'Junzhe', 'last': 'Wang', 'advisor': 'Lannan (Lisa) Luo', 'coadvisor': '',
        'dissertation': 'Retargeted-Architecture Binary Code Analysis',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Na', 'last': 'Wang', 'advisor': 'Songqing Chen', 'coadvisor': '',
        'dissertation': 'Improving the Quality of Experiences in Augmented Reality and Virtual Reality',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Navid', 'last': 'Rajabi', 'advisor': 'Jana Košecká', 'coadvisor': '',
        'dissertation': 'Fine-Grained Understanding in Vision and Language Models',
        'honor': ''
    },
    {
        'first': 'Negar', 'last': 'Nejatishahidin', 'advisor': 'Jana Košecká', 'coadvisor': '',
        'dissertation': 'Multi-modal Scene Understanding',
        'honor': ''
    },
    {
        'first': 'Pooya', 'last': 'Fayyazsanavi', 'advisor': 'Jana Košecká', 'coadvisor': '',
        'dissertation': 'Sign Language Translation from Videos',
        'honor': 'Outstanding Academic Achievement (PhD)'
    }
]

def add_honor(existing_honors, new_honor):
    if not new_honor:
        return existing_honors or ''
    if not existing_honors:
        return new_honor
    parts = [p.strip() for p in existing_honors.split(';') if p.strip()]
    for item in new_honor.split(';'):
        item_clean = item.strip()
        if item_clean and item_clean not in parts:
            parts.append(item_clean)
    return '; '.join(parts)

def find_student(first, last):
    f_low, l_low = first.lower().strip(), last.lower().strip()
    for s in students:
        s_first = s['First Name'].lower().strip()
        s_last = s['Last Name'].lower().strip()
        if (s_first == f_low and s_last == l_low) or (f_low in s_first and s_last == l_low) or (s_first == f_low and l_low in s_last):
            return s
        if 'tasfia' in f_low and 'mashiat' in l_low and ('mashiat' in s_last or 'mashiat' in s_first):
            return s
        if 'jonathan' in f_low and 'verdugo' in l_low and ('verdugo' in s_last or 'vasquez' in s_last):
            return s
    return None

updated_phds_2025 = 0
for pg in phd_2025:
    s = find_student(pg['first'], pg['last'])
    if s:
        s['Advisor'] = normalize_advisor(pg['advisor']) or s['Advisor']
        if pg['coadvisor']:
            s['Co-Advisor'] = normalize_advisor(pg['coadvisor']) or s['Co-Advisor']
        if not s['Degree'] or s['Degree'] == 'PhD' or "26" not in s['Degree']:
            s['Degree'] = "PhD '25"
        if pg['dissertation'] and not s['Dissertation Title']:
            s['Dissertation Title'] = pg['dissertation']
        s['Honors & Awards'] = add_honor(s['Honors & Awards'], pg['honor'])
        s['Last Modified'] = "2026-09-14"
        s['Last Verified'] = "2026-09-14"
        updated_phds_2025 += 1
    else:
        new_s = {
            'First Name': pg['first'],
            'Last Name': pg['last'],
            'Advisor': normalize_advisor(pg['advisor']),
            'Co-Advisor': normalize_advisor(pg['coadvisor']),
            'Degree': "PhD '25",
            'Dissertation Title': pg['dissertation'],
            'Current Job': '',
            'First Job': '',
            'Location': '',
            'Internships': '',
            'Honors & Awards': pg['honor'],
            'Topics': '',
            'Picture': '',
            'Website': '',
            'LinkedIn': '',
            'Google Scholar': '',
            'Last Modified': '2026-09-14',
            'Last Verified': '2026-09-14',
            'Verified': ''
        }
        students.append(new_s)
        updated_phds_2025 += 1

print(f"Processed {updated_phds_2025} 2025 PhD graduates.")

# 3. 2025 Student Special Awards
special_student_awards_2025 = [
    ('Prabin', 'Bhandari', 'Outstanding PhD Student Award (2025)'),
    ('Tyler', 'Wyatt', "Outstanding Master's Student Award (2025)"),
    ('Hafssa', 'Abid', 'Outstanding Undergraduate Student Award (2025)'),
    ('Douglas', 'Imhoff', 'Outstanding BAM Student Award (2025)'),
    ('Iman Ayman', 'el-Ghazali', 'Distinguished Undergraduate Teaching Assistant Award (2025)'),
    ('Min Cheol', 'Chang', 'Distinguished Undergraduate Teaching Assistant Award (2025)'),
    ('Tyler', 'Meyers', 'Distinguished Undergraduate Teaching Assistant Award (2025)'),
    ('Andy', 'Duong', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Maya', 'Elgodamy', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Yen', 'Lai', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Ali A', 'Madi', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Sienna', 'Manny', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Ngoc Minh Huy', 'Truong', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Vicente', 'Santos-Linares', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Jack', 'Wallace', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Daphne', 'Ziegenfelder', 'Outstanding Undergraduate Teaching Assistant Award (2025)'),
    ('Chutong', 'Meng', 'Distinguished Graduate Teaching Assistant Award (2025)'),
    ('Benjamin', 'Wall', 'Distinguished Graduate Teaching Assistant Award (2025)'),
    ('Trent', 'Zakielarz', 'Distinguished Graduate Teaching Assistant Award (2025)'),
    ('Andrew', 'Hartman', 'Outstanding Graduate Teaching Assistant Award (2025)'),
    ('Linhan', 'Li', 'Outstanding Graduate Teaching Assistant Award (2025)'),
    ('Keerthi', 'Ramireddy', 'Outstanding Graduate Teaching Assistant Award (2025)'),
    ('Saurabh', 'Srivastava', 'Outstanding Graduate Teaching Assistant Award (2025)'),
    ('Ruochen', 'Wang', 'Outstanding Graduate Teaching Assistant Award (2025)')
]

for first, last, award_str in special_student_awards_2025:
    s = find_student(first, last)
    if s:
        s['Honors & Awards'] = add_honor(s['Honors & Awards'], award_str)
        s['Last Modified'] = '2026-09-14'
    else:
        deg = "PhD" if "PhD" in award_str else ("MS" if "Master" in award_str or "Graduate" in award_str else "BS")
        students.append({
            'First Name': first,
            'Last Name': last,
            'Advisor': '',
            'Co-Advisor': '',
            'Degree': deg,
            'Dissertation Title': '',
            'Current Job': '',
            'First Job': '',
            'Location': '',
            'Internships': '',
            'Honors & Awards': award_str,
            'Topics': '',
            'Picture': '',
            'Website': '',
            'LinkedIn': '',
            'Google Scholar': '',
            'Last Modified': '2026-09-14',
            'Last Verified': '2026-09-14',
            'Verified': ''
        })

print(f"Processed {len(special_student_awards_2025)} 2025 student special awards.")

# Save updated files
with open('public/students.json', 'w', encoding='utf-8') as f:
    json.dump(students, f, indent=2, ensure_ascii=False)

with open('public/awards.json', 'w', encoding='utf-8') as f:
    json.dump(awards, f, indent=2, ensure_ascii=False)

print(f"Saved datasets: students count={len(students)}, awards count={len(awards)}")

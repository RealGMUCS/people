import json
import re

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
    # Handle aliases
    if 'Brittany Johnson' in full:
        faculty_map['brittany johnson-matthews'] = full
        faculty_map['brittany johnson-matthew'] = full
    if 'Lisa Luo' in full or 'Lannan' in full:
        faculty_map['lisa luo'] = full
        faculty_map['lannan luo'] = full
    if 'Duric' in full or 'Durić' in full:
        faculty_map['zoran duric'] = full
        faculty_map['zoran durić'] = full

def normalize_advisor(adv):
    if not adv:
        return ''
    clean_adv = adv.replace('Professor', '').replace('Prof.', '').strip()
    low = clean_adv.lower()
    if low in faculty_map:
        return faculty_map[low]
    for k, v in faculty_map.items():
        if k in low or low in k:
            return v
    return clean_adv

# 1. Update/Add Faculty Awards
new_faculty_awards = [
    {'Name': 'Joshua Fletcher', 'Category': 'Mason Awards', 'Award': 'CEC Excellence Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Bo Han', 'Category': 'Mason Awards', 'Award': "President's Award for Research Excellence", 'Year': '2026', 'Former': ''},
    {'Name': 'Bo Han', 'Category': 'Mason Awards', 'Award': 'Presidential Award for Faculty Excellence', 'Year': '2026', 'Former': ''},
    {'Name': 'Robert Pettit', 'Category': 'Mason Awards', 'Award': 'CEC Excellence Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Evgenios Kornaropoulos', 'Category': 'Mason Awards', 'Award': 'CEC Excellence Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Xuesu Xiao', 'Category': 'Virginia Awards', 'Award': 'State Council of Higher Education for Virginia (SCHEV) Outstanding Faculty Award (Rising Star)', 'Year': '2026', 'Former': ''},
    {'Name': 'Ziyu Yao', 'Category': 'Industrial Awards', 'Award': 'Foresight Institute Award (Agentic Mechanistic Interpretation of Language Models)', 'Year': '2026', 'Former': ''},
    {'Name': 'Keren Zhou', 'Category': 'Industrial Awards', 'Award': 'NVIDIA Academic Grant Award (DGX B200)', 'Year': '2026', 'Former': ''},
    {'Name': 'Zhicong Lu', 'Category': 'Mason Awards', 'Award': 'Department Research Rising Star Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Ziwei Zhu', 'Category': 'Mason Awards', 'Award': 'Department Research Rising Star Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Ping Deng', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Teaching Award', 'Year': '2026', 'Former': ''},
    {'Name': 'ThanhVu (Vu) Nguyen', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Service Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Craig Yu', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Service Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Alyssa Tsukamoto', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Staff Award', 'Year': '2026', 'Former': ''},
    {'Name': 'Vernell Wilks', 'Category': 'Mason Awards', 'Award': 'Department Outstanding Staff Award', 'Year': '2026', 'Former': ''}
]

added_awards = 0
for na in new_faculty_awards:
    if not any(a['Name'] == na['Name'] and a['Award'] == na['Award'] and a['Year'] == na['Year'] for a in awards):
        awards.append(na)
        added_awards += 1

print(f"Added {added_awards} faculty awards.")

# 2. PhD Graduates Data
phd_graduates = [
    {
        'first': 'Bikram', 'last': 'Adhikari', 'advisor': 'Zoran Durić', 'coadvisor': '',
        'dissertation': 'Focus-Enhanced Advanced Driver Assistive System',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Milind', 'last': 'Agarwal', 'advisor': 'Antonios Anastasopoulos', 'coadvisor': '',
        'dissertation': 'Improving Resource Creation for Low-Resource Languages using NLP Methods',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Raihan Islam', 'last': 'Arnob', 'advisor': 'Gregory Stein', 'coadvisor': '',
        'dissertation': 'Effective Long - Horizon Planning Under Uncertainty for Indoor Mobile Robots',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Hoang-Dung', 'last': 'Bui', 'advisor': 'Gregory Stein', 'coadvisor': '',
        'dissertation': 'Scalable Motion Planning and Decision-Making for Heterogeneous Robot Teams under Uncertainty',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Sean', 'last': 'Cannan', 'advisor': 'Sanjeev Setia', 'coadvisor': 'Robert Simon',
        'dissertation': 'Efficient Forwarding Architectures for Named Data Networking',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Benjamin Richard', 'last': 'Carver', 'advisor': 'Yue Cheng', 'coadvisor': '',
        'dissertation': 'Towards Elastic, High-Performance, Stateful Serverless Systems',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Ruizhi', 'last': 'Cheng', 'advisor': 'Bo Han', 'coadvisor': '',
        'dissertation': 'Designing Real - Time Immersive Communication Systems for Human – Human and Human–GenAI Interaction',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Michael', 'last': 'Crawshaw', 'advisor': 'Mingrui Liu', 'coadvisor': '',
        'dissertation': 'Towards a Faithful Theory of Distributed Optimization for Machine Learning',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Manpriya', 'last': 'Dua', 'advisor': 'Amarda Shehu', 'coadvisor': '',
        'dissertation': 'Machine Learning-Enabled Unraveling, Organizing, and Enriching of AI Strategies',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Fahim', 'last': 'Faisal', 'advisor': 'Antonios Anastasopoulos', 'coadvisor': '',
        'dissertation': 'Multilingual Model Adaptation for Under-Served Languages',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Taylor', 'last': 'Henderson', 'advisor': 'Hakan Aydin', 'coadvisor': '',
        'dissertation': 'Time Series Analysis for Malicious Communications',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Toki Tahmid', 'last': 'Inan', 'advisor': 'Amarda Shehu', 'coadvisor': '',
        'dissertation': 'Rethinking Optimization for Deep Learning Under the Umbrella of Evolutionary Computation',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Anowarul', 'last': 'Kabir', 'advisor': 'Amarda Shehu', 'coadvisor': '',
        'dissertation': 'Foundation Models Meet Life Sciences: Advancing Knowledge - Rich Multimodal AI in Molecular Biology',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Abhish', 'last': 'Khanal', 'advisor': 'Gregory Stein', 'coadvisor': '',
        'dissertation': 'Multi-Robot Coordinated Planning Under Uncertainty',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Arun Krishna', 'last': 'Vajjala', 'advisor': 'Brittany Johnson-Matthew', 'coadvisor': 'Kevin Moran',
        'dissertation': 'Beyond The Pixel: AI-Augmented Programming Tools For The Design, Testing, And Generation Of User Interfaces',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'James Matthew', 'last': 'Kukucka', 'advisor': 'Wing Lam', 'coadvisor': '',
        'dissertation': 'Evaluating and Improving Fuzzer Mutation Strategies',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Xiaoyue', 'last': 'Ma', 'advisor': 'Lannan (Lisa) Luo', 'coadvisor': '',
        'dissertation': 'Hub-Based Vulnerability Discovery for Internet of Things Firmware',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Jonathan Mbuya', 'last': 'Kabala', 'advisor': 'Antonios Anastasopoulos', 'coadvisor': 'Dieter Pfoser',
        'dissertation': 'Leveraging Language Modeling Techniques on Mobility Data',
        'honor': 'Outstanding Academic Achievement (PhD)'
    },
    {
        'first': 'Abhishek', 'last': 'Paudel', 'advisor': 'Gregory Stein', 'coadvisor': '',
        'dissertation': 'Robots that Introspect: Improving Deployment- Time Performance for Long-Horizon Planning under Uncertainty',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Chuxiong', 'last': 'Wu', 'advisor': 'Qiang Zeng', 'coadvisor': '',
        'dissertation': 'Smart Sensing Enabled Bilateral Authentication',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Xue', 'last': 'Yu', 'advisor': 'Yotam Gingold', 'coadvisor': '',
        'dissertation': 'Product Design Sketching in 3D: From Scaffolds to Surfaces',
        'honor': 'Distinguished Academic Achievement (PhD)'
    },
    {
        'first': 'Yongqi', 'last': 'Zhang', 'advisor': 'Craig Yu', 'coadvisor': '',
        'dissertation': 'Improving Human Performance and Workflows Through Computational Design',
        'honor': 'Distinguished Academic Achievement (PhD)'
    }
]

def add_honor(existing_honors, new_honor):
    if not existing_honors:
        return new_honor
    parts = [p.strip() for p in existing_honors.split(';') if p.strip()]
    if new_honor not in parts:
        parts.append(new_honor)
    return '; '.join(parts)

def find_student(first, last):
    f_low, l_low = first.lower().strip(), last.lower().strip()
    for s in students:
        s_first = s['First Name'].lower().strip()
        s_last = s['Last Name'].lower().strip()
        if (s_first == f_low and s_last == l_low) or (f_low in s_first and s_last == l_low) or (s_first == f_low and l_low in s_last):
            return s
        # Special alias handling
        if f_low == 'toki tahmid' and s_last in ['inan', 'tinan']:
            return s
        if 'jonathan' in f_low and 'mbuya' in l_low and ('mbuya' in s_last or 'mbuya' in s_first):
            return s
        if 'hoang' in f_low and 'bui' in l_low and 'bui' in s_last:
            return s
    return None

updated_phds = 0
for pg in phd_graduates:
    s = find_student(pg['first'], pg['last'])
    if s:
        s['Advisor'] = normalize_advisor(pg['advisor']) or s['Advisor']
        if pg['coadvisor']:
            s['Co-Advisor'] = normalize_advisor(pg['coadvisor']) or s['Co-Advisor']
        s['Degree'] = "PhD '26"
        s['Dissertation Title'] = pg['dissertation']
        s['Honors & Awards'] = add_honor(s['Honors & Awards'], pg['honor'])
        if s['Last Name'] == 'Tinan':
            s['Last Name'] = 'Inan'
        s['Last Modified'] = "2026-09-14"
        s['Last Verified'] = "2026-09-14"
        updated_phds += 1
    else:
        # Create new student entry
        new_s = {
            'First Name': pg['first'],
            'Last Name': pg['last'],
            'Advisor': normalize_advisor(pg['advisor']),
            'Co-Advisor': normalize_advisor(pg['coadvisor']),
            'Degree': "PhD '26",
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
        updated_phds += 1

print(f"Processed {updated_phds} PhD graduates.")

# 3. Student Awards & Honors Updates
student_awards = [
    ('Prabin', 'Bhandari', 'Distinguished Academic Achievement (PhD)'),
    ('Mahbubul Alam', 'Palash', 'Outstanding Academic Achievement (PhD)'),
    ('Ted', 'Chao', 'Outstanding PhD Student Award (2026)'),
    ('Aniket', 'Datar', 'Outstanding PhD Student Award (2026)'),
    ('Hai', 'Duong', 'Outstanding PhD Student Award (2026)'),
    ('Alexandyr', 'Card', "Outstanding Master's Student Award (2026)"),
    ('Madison', 'Sellers', 'Outstanding Undergraduate Student Award (2026)'),
    ('Bella', 'Chung', 'Outstanding Undergraduate Research Award (2026)'),
    ('Fairuz Nawer', 'Meem', 'Distinguished Graduate Teaching Assistant Award (2026)'),
    ('Alex Habeen', 'Chang', 'Distinguished Graduate Teaching Assistant Award (2026)'),
    ('Umama', 'Dewan', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Farina', 'Faiz', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Saad', 'Ghani', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Anthony', 'Givans', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Fahim', 'Nafis', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Chahat', 'Raj', 'Outstanding Graduate Teaching Assistant Award (2026)'),
    ('Alex', 'Acetrinei', 'Distinguished Undergraduate Teaching Assistant Award (2026)'),
    ('Mitchell', 'Davis', 'Distinguished Undergraduate Teaching Assistant Award (2026)'),
    ('Sara', 'Johnson', 'Outstanding Undergraduate Teaching Assistant Award (2026)'),
    ('Cecilia', 'Li', 'Outstanding Undergraduate Teaching Assistant Award (2026)'),
    ('Rimika', 'Shrestha', 'Outstanding Undergraduate Teaching Assistant Award (2026)'),
    ('Yisak', 'Tolla', 'Outstanding Undergraduate Teaching Assistant Award (2026)'),
    ('Georgi', 'Zahariev', 'Outstanding Undergraduate Teaching Assistant Award (2026)'),
    ('Rohan', 'Payyavula', 'Outstanding Undergraduate Student Teacher Award (2026)'),
    ('Troy', 'Acuff', 'Distinguished Grader Award (2026)'),
    ('Sandy', 'Somchay', 'Outstanding Grader Award (2026)'),
    ('Vyakhya', 'Verma', 'Outstanding Grader Award (2026)'),
]

for first, last, award_str in student_awards:
    s = find_student(first, last)
    if s:
        s['Honors & Awards'] = add_honor(s['Honors & Awards'], award_str)
        s['Last Modified'] = '2026-09-14'
    else:
        # Determine degree type based on award
        deg = "PhD" if "PhD" in award_str else ("MS" if "Master" in award_str or "Graduate" in award_str or "Grader" in award_str else "BS")
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

print(f"Processed {len(student_awards)} student awards.")

# 4. Master of Science & Bachelor of Science Distinguished Graduates
ms_cs_names = [
    ('Poorvi', 'Acharya'), ('Mohamed', 'Aghzal'), ('Pavan Sai Gopinadh Reddy', 'Arimanda'),
    ('Brett', 'Burcher'), ('Jacob', 'Carryer'), ('Sampath Sai Charan', 'Chettipalli'),
    ('Sai Sri Harsha', 'Chunduri'), ('Iman', 'El-Ghazali'), ('Philip', 'Fan'),
    ('Joseph', 'Fernandez'), ('Aishwarya', 'Gaddam'), ('Prasoona', 'Ganaparthi'),
    ('Mehrdad', 'Ghyabi'), ('Sehaj', 'Gill'), ('Mainul', 'Hossain'), ('Jialin', 'Huang'),
    ('Na', 'Huynh'), ('Doug', 'Imhoff'), ('Anubhav', 'Kamath'), ('Sai Sanjana', 'Kambalapally'),
    ('Ekrem', 'Kaya'), ('Yangzhe', 'Kong'), ('Saranya Chakravarthy', 'Korrapati'),
    ('Sravya', 'Kotwal'), ('Varshini', 'Krishna Mohan'), ('Prashanth', 'Krishnan'),
    ('Saumil', 'Kulkarni'), ('Daehyun', 'Lee'), ('Pranav Manish Reddi', 'Madduri'),
    ('Phillip', 'Miavelstuck'), ('Chris', 'Mostert'), ('Anjishnu', 'Mukherjee'),
    ('Dheeraj Krishna', 'Nagula'), ('Praneeth', 'Naidu'), ('Amisha', 'Patel'),
    ('Leanna', 'Persaud'), ('Lam', 'Phan'), ('Rayan', 'Raiszadeh'), ('Koushik', 'Rama'),
    ('Abhisekh', 'Rana'), ('Karina Farheen', 'Shareef'), ('Akshitha', 'Theretupally'),
    ('Michael', 'Tran'), ('Aditya Samir', 'Vaidya'), ('Puqi', 'Zhou'), ('Fatema Tuz', 'Zohra')
]

ms_swe_names = [
    ('Amir', 'Ahmed'), ('Bala Naga Tirumala Kiran', 'Annadata'), ('Michael', 'Choi'),
    ('Anusha', 'Gurram'), ('Woon', 'Hong'), ('Alec', 'Kasulaitis'), ('Joseph', 'Sepich'),
    ('Chase', 'Walters')
]

bs_cs_names = [
    ('Nathaniel', 'Abando'), ('Mustaffa', 'Adnan'), ('Min Cheol', 'Chang'),
    ('Andrew', 'Crist'), ('Mitchell', 'Davis'), ('Joseph', 'Demchak'),
    ('Maya', 'Elgodamy'), ('Aymenv', 'Esmael'), ('Jennifer', 'Fieffer'),
    ('Joseph', 'Gery'), ('Mary', 'Graft'), ('Cody', 'Halstead'),
    ('Muhammad', 'Idrees'), ('Sivalee', 'Intachit'), ('Dhanush Reddy', 'Kandukuri'),
    ('Woei', 'Kuo'), ('Jack', 'Lam'), ('Rahul', 'Mathew'), ('Chris', 'Mostert'),
    ('Thai-Hoa', 'Nguyen'), ('Vu', 'Nguyen'), ('Minh', 'Phan'),
    ('Stefania', 'Piciorea'), ('Isabella', 'Pureza'), ('Sashank', 'Ravipati'),
    ('Cooper', 'Roger'), ('Om', 'Roy'), ('Matt Gerard', 'Rungduen'),
    ('Shreen', 'Sadek'), ('Sami', 'Saifudin'), ('Rimika', 'Shrestha'),
    ('Anne', 'Silio'), ('Siddhant', 'Sood'), ('Rafi', 'Talukdar'),
    ('Ming', 'Tang'), ('Veronica', 'Thach'), ('Ellis', 'Tran'),
    ('Justin', 'Vu'), ('Ethan', 'Woerner'), ('Jung', 'Yang'),
    ('Aiden', 'Young'), ('Georgi', 'Zahariev'), ('Eric', 'Zhang'),
    ('Matthew', 'Zurbach')
]

bs_acs_names = [
    ('Abdullah', 'Ali'), ('Garrett', 'Cook')
]

def ingest_grad_list(items, degree_str, honor_str):
    added = 0
    for first, last in items:
        s = find_student(first, last)
        if s:
            if not s['Degree'] or s['Degree'] == 'MS' or s['Degree'] == 'BS' or s['Degree'] == 'Undergrad':
                s['Degree'] = degree_str
            s['Honors & Awards'] = add_honor(s['Honors & Awards'], honor_str)
            s['Last Modified'] = '2026-09-14'
        else:
            students.append({
                'First Name': first,
                'Last Name': last,
                'Advisor': '',
                'Co-Advisor': '',
                'Degree': degree_str,
                'Dissertation Title': '',
                'Current Job': '',
                'First Job': '',
                'Location': '',
                'Internships': '',
                'Honors & Awards': honor_str,
                'Topics': '',
                'Picture': '',
                'Website': '',
                'LinkedIn': '',
                'Google Scholar': '',
                'Last Modified': '2026-09-14',
                'Last Verified': '2026-09-14',
                'Verified': ''
            })
            added += 1
    return added

added_mscs = ingest_grad_list(ms_cs_names, "MS '26", "Distinguished Academic Achievement (MS CS)")
added_msswe = ingest_grad_list(ms_swe_names, "MS '26", "Distinguished Academic Achievement (MS SWE)")
added_bscs = ingest_grad_list(bs_cs_names, "BS '26", "Distinguished Academic Achievement (BS CS)")
added_bsacs = ingest_grad_list(bs_acs_names, "BS '26", "Distinguished Academic Achievement (BS ACS)")

print(f"Added new graduates: MS CS={added_mscs}, MS SWE={added_msswe}, BS CS={added_bscs}, BS ACS={added_bsacs}")

# Save updated files
with open('public/students.json', 'w', encoding='utf-8') as f:
    json.dump(students, f, indent=2, ensure_ascii=False)

with open('public/awards.json', 'w', encoding='utf-8') as f:
    json.dump(awards, f, indent=2, ensure_ascii=False)

print(f"Saved datasets: students count={len(students)}, awards count={len(awards)}")

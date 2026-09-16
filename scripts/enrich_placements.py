import json

with open('public/students.json', 'r', encoding='utf-8') as f:
    students = json.load(f)

enrichment_data = [
    {
        'first': 'Milind', 'last': 'Agarwal',
        'job': 'Senior Forward Deployed Engineer, LILT AI',
        'website': 'https://milindagarwal.github.io/',
        'location': 'Washington, DC'
    },
    {
        'first': 'Fahim', 'last': 'Faisal',
        'job': 'Postdoctoral Researcher, Oak Ridge National Laboratory',
        'website': 'https://fahimfaisal.info',
        'location': 'Oak Ridge, TN'
    },
    {
        'first': 'Michael', 'last': 'Crawshaw',
        'job': 'Postdoctoral Fellow, Flatiron Institute',
        'website': 'https://mcrawshaw.github.io/',
        'location': 'New York, NY'
    },
    {
        'first': 'Anowarul', 'last': 'Kabir',
        'job': 'Assistant Professor, Bellini College of AI, Cybersecurity and Computing, University of South Florida',
        'location': 'Tampa, FL'
    },
    {
        'first': 'Chuxiong', 'last': 'Wu',
        'job': 'Assistant Professor, School of Computing, Southern Illinois University',
        'location': 'Carbondale, IL'
    },
    {
        'first': 'Tasfia', 'last': 'Mashiat',
        'job': 'Assistant Professor of Instruction, Department of Computer Science, University of Iowa',
        'website': 'https://tasfiamashiat.github.io/',
        'location': 'Iowa City, IA'
    },
    {
        'first': 'Ajay Krishna', 'last': 'Vajjala',
        'job': 'Machine Learning Software Engineer, Google',
        'linkedin': 'https://www.linkedin.com/in/ajay-kv',
        'website': 'https://ajaykv.com',
        'location': 'Sunnyvale, CA'
    },
    {
        'first': 'Arun Krishna', 'last': 'Vajjala',
        'job': 'Machine Learning Research Engineer, Apple',
        'location': 'Cupertino, CA'
    },
    {
        'first': 'Hoang-Dung', 'last': 'Bui',
        'linkedin': 'https://www.linkedin.com/in/hoang-dung-bui',
        'website': 'https://dzungbui.github.io/'
    },
    {
        'first': 'Raihan Islam', 'last': 'Arnob',
        'linkedin': 'https://www.linkedin.com/in/raihan-islam-arnob'
    },
    {
        'first': 'Ruizhi', 'last': 'Cheng',
        'job': 'Applied Scientist, Amazon',
        'location': 'Seattle, WA'
    },
    {
        'first': 'Xue', 'last': 'Yu',
        'website': 'https://xue-yu.github.io/',
        'internships': 'Adobe Research'
    },
    {
        'first': 'Navid', 'last': 'Rajabi',
        'website': 'https://navidnr.com/'
    },
    {
        'first': 'Sahar', 'last': 'Mehrpour',
        'website': 'https://mason.gmu.edu/~smehrpou/'
    },
    {
        'first': 'Daniel', 'last': 'McVicker',
        'job': 'Senior Research Scientist (Cryptography), Verisign',
        'location': 'Reston, VA'
    },
    {
        'first': 'Mingyu', 'last': 'Liang',
        'job': 'Software Engineer, Snapchat'
    },
    {
        'first': 'Phi Hung', 'last': 'Le',
        'job': 'Software Engineer, Google'
    },
    {
        'first': 'Manpriya', 'last': 'Dua',
        'job': 'Postdoctoral Research Fellow, George Mason University',
        'location': 'Fairfax, VA'
    }
]

def find_student(first, last):
    f_low, l_low = first.lower().strip(), last.lower().strip()
    for s in students:
        s_first = s['First Name'].lower().strip()
        s_last = s['Last Name'].lower().strip()
        if (s_first == f_low and s_last == l_low) or (f_low in s_first and s_last == l_low) or (s_first == f_low and l_low in s_last):
            return s
        if 'tasfia' in f_low and 'mashiat' in l_low and 'mashiat' in (s_first + ' ' + s_last):
            return s
        if 'hoang' in f_low and 'bui' in l_low and 'bui' in s_last:
            return s
    return None

updated_count = 0
for item in enrichment_data:
    s = find_student(item['first'], item['last'])
    if s:
        if 'job' in item and item['job']:
            s['Current Job'] = item['job']
        if 'website' in item and item['website'] and not s['Website']:
            s['Website'] = item['website']
        if 'linkedin' in item and item['linkedin'] and not s['LinkedIn']:
            s['LinkedIn'] = item['linkedin']
        if 'location' in item and item['location'] and not s['Location']:
            s['Location'] = item['location']
        if 'internships' in item and item['internships'] and not s['Internships']:
            s['Internships'] = item['internships']
        s['Last Modified'] = '2026-09-14'
        updated_count += 1
        print(f"Enriched: {s['First Name']} {s['Last Name']} -> {s['Current Job']}")

with open('public/students.json', 'w', encoding='utf-8') as f:
    json.dump(students, f, indent=2, ensure_ascii=False)

print(f"Enriched {updated_count} students successfully.")

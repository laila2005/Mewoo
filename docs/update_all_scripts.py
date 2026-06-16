
import docx
import glob

replacements = {
    '(Slides 0 - 2)': '(Slides 1 - 2)',
    '(Slide 13) - Competitors & Go-To-Market': '(Slides 13 - 15) - Community, Business & Competitors',
    '(Slide 13.5) - Financials (LTV vs CAC)': '(Slide 16) - Financial Viability',
    '(Slides 13.8 - 14) - The Architecture Team & Close': '(Slide 17) - The Architecture Team & Close'
}

for filepath in glob.glob('E:/Mewoo/docs/presentation_script*.docx'):
    try:
        doc = docx.Document(filepath)
        for p in doc.paragraphs:
            for old_text, new_text in replacements.items():
                if old_text in p.text:
                    p.text = p.text.replace(old_text, new_text)
        doc.save(filepath)
        print(f'Updated {filepath}')
    except Exception as e:
        print(f'Failed {filepath}: {e}')


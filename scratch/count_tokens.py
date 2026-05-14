content = open('c:/Users/HP/Downloads/HRMS/frontend/app/payroll/payslips/page.tsx', 'r').read()

def count_tokens(s):
    div_open = s.count('<div')
    div_close = s.count('</div>')
    brace_open = s.count('{')
    brace_close = s.count('}')
    paren_open = s.count('(')
    paren_close = s.count(')')
    
    print(f"Div Open: {div_open}, Div Close: {div_close}")
    print(f"Brace Open: {brace_open}, Brace Close: {brace_close}")
    print(f"Paren Open: {paren_open}, Paren Close: {paren_close}")

count_tokens(content)

"""Build the dedicated Owner manual from its authoritative Markdown. No app/config writes."""
from pathlib import Path
import re, html, json
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'docs/user-manual/owner-settings-complete.md'
OUT=ROOT/'output/pdf/EasyGas-Owner-Settings-Configuration-Manual.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
FONTS=Path('/System/Library/Fonts/Supplemental')
for name,file in [('Body','Arial.ttf'),('BodyBold','Arial Bold.ttf'),('BodyItalic','Arial Italic.ttf')]:pdfmetrics.registerFont(TTFont(name,str(FONTS/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='BodyItalic',boldItalic='BodyBold')
green=colors.HexColor('#005b36');ink=colors.HexColor('#183c30');muted=colors.HexColor('#596b63');lime=colors.HexColor('#d3f48a');line=colors.HexColor('#d8e4dc')
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=9.3,leading=13.5,spaceAfter=7,textColor=ink,splitLongWords=True),
 'h2':ParagraphStyle('h2',fontName='BodyBold',fontSize=18,leading=23,spaceBefore=15,spaceAfter=11,textColor=green,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='BodyBold',fontSize=11.2,leading=15,spaceBefore=11,spaceAfter=6,textColor=green,keepWithNext=True),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=8.3,leading=11.4,textColor=ink,splitLongWords=True),
 'th':ParagraphStyle('th',fontName='BodyBold',fontSize=8.4,leading=11.5,textColor=colors.white),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8,leading=11,textColor=muted,spaceAfter=8),
 'bullet':ParagraphStyle('bullet',fontName='Body',fontSize=9.3,leading=13.5,leftIndent=14,firstLineIndent=-12,spaceAfter=6,textColor=ink),
}
def inline(t):
 t=html.escape(t)
 t=re.sub(r'`([^`]+)`',lambda m:'<font name="BodyBold">'+m.group(1)+'</font>',t)
 t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t)
 t=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:('<link href="'+m.group(2)+'" color="#006f42">'+m.group(1)+'</link>') if m.group(2).startswith('https://') else '<font color="#006f42">'+m.group(1)+'</font>',t)
 return t
class Manual(BaseDocTemplate):
 def afterFlowable(self,f):
  if isinstance(f,Paragraph) and f.style.name=='h2' and f.getPlainText()!='Contents':
   title=f.getPlainText();key='section-'+re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')
   self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,0,False);self.notify('TOCEntry',(0,title,self.page,key))
def decorate(c,d):
 w,h=A4
 if d.page==1:
  c.setFillColor(green);c.rect(0,0,w,h,fill=1,stroke=0)
  c.setFillColor(colors.HexColor('#ff8700'));c.roundRect(44,h-95,26,6,3,fill=1,stroke=0)
  c.setFillColor(lime);c.setFont('BodyBold',13);c.drawString(82,h-96,'EASYGAS  /  OWNER OPERATIONS')
  c.setFillColor(colors.HexColor('#004d2e'));c.circle(w+40,80,230,fill=1,stroke=0)
  return
 c.setStrokeColor(line);c.line(44,h-40,w-44,h-40);c.line(44,39,w-44,39)
 c.setFont('Body',8);c.setFillColor(muted);c.drawString(44,h-29,'EasyGas | Owner Settings & End-to-End Setup')
 c.drawString(44,25,'24 November 2026  |  Configuration guide - commercial release NO-GO retained')
 c.drawRightString(w-44,25,str(d.page))
doc=Manual(str(OUT),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=54,bottomMargin=52,title='EasyGas Owner Settings and End-to-End Setup Manual',author='EasyGas',subject='Full settings inventory, safe configuration, operational dependencies and acceptance')
doc.addPageTemplates(PageTemplate(id='all',frames=Frame(44,52,A4[0]-88,A4[1]-106,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),onPage=decorate))
cover=ParagraphStyle('cover',fontName='BodyBold',fontSize=34,leading=40,textColor=colors.white,spaceAfter=26)
sub=ParagraphStyle('sub',fontName='Body',fontSize=14,leading=21,textColor=colors.HexColor('#e2f3e4'),spaceAfter=18)
coverSmall=ParagraphStyle('coverSmall',fontName='Body',fontSize=10,leading=15,textColor=colors.white)
story=[Spacer(1,120),Paragraph('Owner settings.<br/>A connected setup<br/>from start to finish.',cover),Paragraph('A practical configuration manual for the people running EasyGas.',sub),Spacer(1,20),Paragraph('9 categories  /  77 retained setting keys<br/>Safe approvals  /  Dispatch and services<br/>Payments, reconciliation and technical hand-off',sub),Spacer(1,50),Paragraph('Edition 1 - 24 November 2026<br/>Source baseline: ad0400c<br/>Read-only audit; no business settings activated.',coverSmall),Spacer(1,20),Paragraph('Commercial production remains NO-GO.<br/>Sandbox and software evidence do not certify real goods, funds, qualifications or release readiness.',coverSmall),PageBreak(),Paragraph('Contents',styles['h2'])]
toc=TableOfContents();toc.levelStyles=[ParagraphStyle('toc',fontName='Body',fontSize=9.5,leading=14,textColor=ink,leftIndent=0,firstLineIndent=0,spaceBefore=2)];story += [toc,Spacer(1,14),Paragraph('Use the setup sequence first, then the category reference. Appendix A retains every setting; Appendix B records open product findings.',styles['small']),PageBreak()]
lines=SOURCE.read_text().splitlines();i=0;first=True
newpage={'2. Configure in dependency order','3. Navigate, edit, approve and recover','4. Business & Website','7. Delivery & Dispatch','9. Payments & Wallet','13. Configure staff, stock, equipment and Dispatch outside Settings','16. Technical administrator hand-off','17. Acceptance checklist and sign-off','Appendix A. Complete setting register','Appendix B. Audit findings and improvements still open','Appendix C. Source and companion references'}
while i<len(lines):
 s=lines[i].strip()
 if not s or s.startswith('# '):i+=1;continue
 if s.startswith('Edition 1 -'):story.append(Paragraph(inline(s),styles['small']));i+=1;continue
 if s.startswith('## '):
  t=s[3:]
  if t in newpage:story.append(PageBreak())
  story.append(Paragraph(inline(t),styles['h2']));i+=1;continue
 if s.startswith('### '):story.append(Paragraph(inline(s[4:]),styles['h3']));i+=1;continue
 if s.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].strip().startswith('|'):
   row=[x.strip() for x in lines[i].strip().strip('|').split('|')]
   if not all(re.fullmatch(r':?-+:?',x) for x in row):rows.append(row)
   i+=1
  n=len(rows[0]);width=A4[0]-88
  if rows[0][0]=='Setting and key':ratios=[.43,.43,.14]
  elif rows[0][0]=='ID':ratios=[.12,.22,.66]
  elif n==4:ratios=[.16,.19,.36,.29]
  elif n==3:ratios=[.23,.48,.29]
  elif n==2:ratios=[.29,.71]
  else:ratios=[1/n]*n
  table=Table([[Paragraph(inline(c),styles['th' if r==0 else 'cell']) for c in row] for r,row in enumerate(rows)],colWidths=[width*x for x in ratios],repeatRows=1,hAlign='LEFT')
  padding=5 if rows[0][0]=='Symptom' else 7
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),green),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),padding),('BOTTOMPADDING',(0,0),(-1,-1),padding),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f1f6f1')]),('LINEBELOW',(0,0),(-1,0),.6,green),('LINEBELOW',(0,1),(-1,-1),.3,line)]))
  story += [table,Spacer(1,10)];continue
 if re.match(r'^\d+\. ',s):story.append(Paragraph(inline(s),styles['bullet']));i+=1;continue
 if s.startswith('- '):story.append(Paragraph('&#8226; '+inline(s[2:]),styles['bullet']));i+=1;continue
 para=[s];i+=1
 while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||\d+\. |\- )',lines[i].strip()):para.append(lines[i].strip());i+=1
 story.append(Paragraph(inline(' '.join(para)),styles['body']))
doc.multiBuild(story)
print(str(OUT))

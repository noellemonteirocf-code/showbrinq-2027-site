"""Gera o catálogo sem rasterizar, redimensionar ou sobrepor as pranchas oficiais.
Requer PyMuPDF (fitz). Execute da raiz do projeto.
"""
from pathlib import Path
import fitz
from pypdf import PdfReader, PdfWriter
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/assets'
OUT=ASSETS/'stand-models/catalogo-estandes-showbrinq-2027.pdf'
W,H=792,612
INK=(.06,.15,.27);PINK=(.91,0,.44);BLUE=(0,.65,.82);YELLOW=(1,.8,.18);CREAM=(1,.98,.95)
CONFIGS=['Prateleiras superiores somente no primeiro módulo.','Prateleiras superiores nos três módulos.','Prateleiras superiores no primeiro módulo e inferiores.','Prateleiras superiores e inferiores nos três módulos.']
doc=fitz.open()
def text(p,rect,t,size=14,color=INK,bold=False):
 result=p.insert_textbox(fitz.Rect(rect[0],rect[1],rect[2],rect[3]+8),t,fontsize=size,lineheight=1.15,fontname='hebo' if bold else 'helv',color=color)
 if result<0: raise ValueError(f'Texto não cabe: {t}')
def base(label):
 p=doc.new_page(width=W,height=H);p.draw_rect(p.rect,color=None,fill=CREAM)
 p.insert_image(fitz.Rect(44,27,163,88),filename=str(ASSETS/'showbrinq-logo-oficial.png'),keep_proportion=True)
 text(p,(435,42,748,70),label,11,PINK,True)
 p.draw_line((44,103),(748,103),color=YELLOW,width=3)
 return p
p=base('PROJETOS OFICIAIS | CIRCUITO 2027')
text(p,(44,134,748,272),'Catálogo de Estandes\nShowbrinq 2027',38,INK,True)
text(p,(47,275,650,325),'Quatro modelos para planejar a apresentação da sua linha de produtos.',18)
for i,c in enumerate([PINK,YELLOW,BLUE]):p.draw_rect(fitz.Rect(0,510+i*27,W,540+i*27),color=None,fill=c)
text(p,(47,363,690,414),'Compare as configurações e consulte as pranchas originais completas, com seus desenhos, cotas e créditos preservados.',16)
text(p,(47,444,690,488),'Material de consulta. Condições comerciais de 2027 a confirmar com a organização.',12)
p=base('COMPARE OS QUATRO MODELOS')
text(p,(44,121,748,155),'Configurações nos projetos oficiais',25,INK,True)
for i,conf in enumerate(CONFIGS):
 x=44+(i%2)*360;y=167+(i//2)*147
 p.draw_rect(fitz.Rect(x,y,x+344,y+135),color=(.95,.81,.87),fill=(1,1,1),width=.7)
 with fitz.open(ASSETS/f'stand-models/modelo-{i+1}.pdf') as source: p.show_pdf_page(fitz.Rect(x+8,y+8,x+151,y+104),source,0,keep_proportion=True)
 text(p,(x+163,y+17,x+333,y+45),f'Modelo {i+1}',19,PINK,True)
 text(p,(x+163,y+51,x+331,y+104),conf,13)
 text(p,(x+12,y+113,x+333,y+130),f'Prancha original completa: página {i+3}',10)
text(p,(44,456,748,480),'COTAS EM DESTAQUE | Nos desenhos originais',13,PINK,True)
for j,(label,value) in enumerate([('ALTURA TOTAL','2,70'),('PAINEL','2,20'),('MÓDULO','0,96')]):
 x=44+j*240
 p.draw_rect(fitz.Rect(x,485,x+224,548),color=None,fill=(.94,.97,.99))
 text(p,(x+12,491,x+212,510),label,10,INK,True)
 text(p,(x+12,510,x+212,545),value,25,PINK,True)
text(p,(44,555,748,597),'Cotas transcritas das pranchas. A unidade não está indicada no material original. Não representam área ou dimensões contratadas; confirme medidas finais e condições na proposta. Projeto: Tomé Eventos. Móveis meramente ilustrativos.',10)
for i in range(1,5):
 with fitz.open(ASSETS/f'stand-models/modelo-{i}.pdf') as original:doc.insert_pdf(original)
p=base('PRÓXIMOS PASSOS | CONSULTA DE EXPOSIÇÃO')
text(p,(44,126,748,168),'Da configuração à proposta comercial',27,INK,True)
text(p,(44,186,728,265),'Metragens contratadas, itens incluídos, valores, serviços e disponibilidade para 2027 devem ser confirmados na proposta comercial.',18)
items=[('01  Escolha as edições de interesse.','Avalie as cidades e datas do circuito para sua empresa.'),('02  Indique o modelo que deseja consultar.','Use os desenhos oficiais como referência para conversar sobre a estrutura.'),('03  Confirme as condições com a organização.','Alinhe contratação, montagem, equipe e logística antes de planejar sua presença.')]
for j,(a,b) in enumerate(items):
 y=284+j*62;text(p,(44,y,748,y+24),a,16,PINK,True);text(p,(44,y+25,748,y+51),b,13)
text(p,(44,491,748,546),'No site da Showbrinq, acesse Expositores e selecione “Tenho interesse neste modelo”. Na prévia local, o registro ainda não é enviado automaticamente à equipe e não representa reserva.',13)
text(p,(44,558,748,591),'Projetos originais: Tomé Eventos. Créditos e cotas preservados nas páginas 3 a 6.',11)
doc.set_metadata({'title':'Catálogo de Estandes | Showbrinq 2027','author':'Showbrinq | Projetos: Tomé Eventos','subject':'Quatro projetos oficiais de estandes e condições a confirmar'})
doc.set_toc([[1,'Catálogo de Estandes | Showbrinq 2027',1],[1,'Comparativo dos quatro modelos',2]]+[[1,f'Modelo {i} - prancha original',i+2] for i in range(1,5)]+[[1,'Condições e consulta de exposição',7]])
draft=doc.tobytes(garbage=4,deflate=True)
from io import BytesIO
reader=PdfReader(BytesIO(draft));writer=PdfWriter()
for i in [0,1]:writer.add_page(reader.pages[i])
for i in range(1,5):
 original=PdfReader(ASSETS/f'stand-models/modelo-{i}.pdf');writer.add_page(original.pages[0])
writer.add_page(reader.pages[6])
writer.add_metadata({'/Title':'Catálogo de Estandes | Showbrinq 2027','/Author':'Showbrinq | Projetos: Tomé Eventos'})
for title,idx in [('Capa',0),('Comparativo',1)]+[(f'Modelo {i}',i+1) for i in range(1,5)]+[('Condições e consulta',6)]:writer.add_outline_item(title,idx)
with OUT.open('wb') as stream:writer.write(stream)
print(OUT)

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import HexColor
import os

OUT = 'output/pdf/product-configurator-submission.pdf'
NAVY = HexColor('#17365D')
BLUE = HexColor('#2F75B5')
PALE = HexColor('#EEF3F8')
TEXT = HexColor('#1F2937')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='SubmissionTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=31, alignment=TA_CENTER, textColor=colors.black, spaceAfter=12))
styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=11, leading=15, alignment=TA_CENTER, textColor=HexColor('#4B5563'), spaceAfter=24))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=15, leading=18, textColor=colors.black, spaceBefore=12, spaceAfter=7))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=colors.black, spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=13, textColor=TEXT, spaceAfter=6))
styles.add(ParagraphStyle(name='Linkx', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=13, textColor=BLUE, spaceAfter=2))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=11, textColor=HexColor('#4B5563')))
styles.add(ParagraphStyle(name='TableHeader', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white))

def P(text, style='Bodyx'):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(HexColor('#D9D9D9'))
    canvas.line(doc.leftMargin, .54*inch, letter[0]-doc.rightMargin, .54*inch)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(HexColor('#6B7280'))
    canvas.drawCentredString(letter[0]/2, .36*inch, 'Interactive Product Configurator Submission')
    canvas.drawRightString(letter[0]-doc.rightMargin, .36*inch, f'Page {doc.page}')
    canvas.restoreState()

os.makedirs(os.path.dirname(OUT), exist_ok=True)
doc = SimpleDocTemplate(OUT, pagesize=letter, leftMargin=.78*inch, rightMargin=.78*inch, topMargin=.72*inch, bottomMargin=.74*inch)
story=[]

story += [P('Interactive Product Configurator Submission', 'SubmissionTitle'),
          P('Custom Logo Canopy Tent  |  React TypeScript  |  2D and 3D Configuration', 'Subtitle')]

story += [P('Project Summary', 'H1x'),
          P('This submission demonstrates a reusable product configurator for a custom canopy tent. Customers choose a product variant, customize independently printable surfaces with colors, text, and uploaded logos, preview the result in 2D and 3D, receive an API-shaped dynamic quote, and export a production-ready configuration summary.')]

story += [P('Live Deliverables', 'H1x')]
deliverables = [
    [P('<b>Live demo</b>', 'Bodyx'), P('<link href="https://vertical3dtech.vercel.app/">https://vertical3dtech.vercel.app/</link>', 'Linkx')],
    [P('<b>Shopify iframe embed demo</b>', 'Bodyx'), P('<link href="https://vertical3dtech.vercel.app/embed-example.html">https://vertical3dtech.vercel.app/embed-example.html</link>', 'Linkx')],
    [P('<b>GitHub repository</b>', 'Bodyx'), P('<link href="https://github.com/LokeshPrudhvi/vertical3dtech">https://github.com/LokeshPrudhvi/vertical3dtech</link>', 'Linkx')],
]
t=Table(deliverables, colWidths=[2.05*inch,4.75*inch], hAlign='LEFT')
t.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1),PALE),('GRID',(0,0),(-1,-1),.5,HexColor('#D9D9D9')),
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
]))
story += [t, Spacer(1,10), PageBreak()]

story += [P('Architecture and Technical Approach', 'H1x')]
rows = [[P('Area','TableHeader'), P('Approach','TableHeader')],
 [P('Reusable architecture','Bodyx'), P('The configurator receives a generic ProductDefinition. Tent-specific options, print zones, GLB model assets, prices, and Shopify variant mappings are kept in a data definition rather than embedded throughout the UI.','Bodyx')],
 [P('Structured configuration','Bodyx'), P('A ProductConfiguration stores selected variants plus per-zone state. Each layer contains its type, content, normalized position, scale, rotation, color, and z-index.','Bodyx')],
 [P('2D and 3D synchronization','Bodyx'), P('Zustand is the single source of truth. The 2D editor and the 3D texture renderer independently derive their output from the same zone and layer state.','Bodyx')],
 [P('3D rendering','Bodyx'), P('React Three Fiber loads the selected GLB, clones the fabric material, regenerates a canvas texture atlas from all configured zones, and updates the GPU texture.','Bodyx')],
 [P('Pricing','Bodyx'), P('A debounced asynchronous pricing service returns line items, subtotal, GST, total, and a configuration hash. Components display the quote rather than owning business rules.','Bodyx')],
 [P('Shopify readiness','Bodyx'), P('The integration resolves Shopify variants, serializes configuration detail into line-item properties, and models dynamic customization fees as a server-side integration concern.','Bodyx')],
 [P('Production output','Bodyx'), P('The PDF summary includes selections, customization detail, pricing, Shopify references, and available artwork previews for fulfillment handoff.','Bodyx')]]
arch=Table(rows, colWidths=[1.72*inch,5.08*inch], repeatRows=1, hAlign='LEFT')
arch.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),
    ('GRID',(0,0),(-1,-1),.5,HexColor('#D9D9D9')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
]))
story += [arch]

story += [PageBreak(), P('How to Review the Demo', 'H1x')]
steps = [
('1  Select a size', 'Choose a tent size. The configuration changes the selected variant, price input, and the GLB model shown in the 3D viewer.'),
('2  Open the customization studio', 'Use the customization call to action to access the unfolded 2D layout, surface selection, layer tools, and live price summary.'),
('3  Customize artwork', 'Apply a surface color, add text or upload a logo, and change its position, scale, rotation, and layer ordering. Each surface remains independently configurable.'),
('4  Verify synchronized output', 'Switch to or rotate the 3D preview. The updated configuration is composed into the tent fabric texture atlas and applied to the model.'),
('5  Review price and handoff', 'Observe the asynchronous quote, download the production PDF, and use the mocked Shopify cart action. The iframe sample demonstrates host-page communication through postMessage.'),
]
for head, body in steps:
    story += [P(head,'H2x'), P(body)]

story += [P('Engineering Decisions', 'H1x'),
          P('<b>Configuration is data, not just a canvas image.</b> Saving structured values makes the result reproducible for 2D editing, 3D visualization, pricing, Shopify line items, and production output.', 'Bodyx'),
          P('<b>Integration boundaries are explicit.</b> Pricing, Shopify cart behavior, and PDF generation are isolated in services. The present implementations are mockable, while the calling UI remains ready for real services.', 'Bodyx'),
          P('<b>Different product geometry needs an adapter.</b> The generic schema, store, pricing boundary, cart boundary, and PDF workflow can be reused. A physically different product, such as a pipe, would add its own GLB asset, 2D layout, and UV texture-rendering adapter.', 'Bodyx')]

story += [P('Scope and Next Steps', 'H1x'),
          P('The project prioritizes the architecture and integration seams expected in the time-boxed assessment. With additional production time, the next priorities would be server-side quote validation, secure asset storage, print DPI validation, GLB compression and code splitting, persistent saved configurations, automated tests, and a Shopify Cart Transform or Function for dynamic customization fees.')]

story += [Spacer(1,14), P('Thank you for reviewing the submission.', 'H2x')]
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)

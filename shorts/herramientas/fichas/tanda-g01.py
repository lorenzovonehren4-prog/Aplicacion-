T=lambda t,y=560,size=110,en=.3,col='#ffd23a':{'texto':{'t':t,'y':y,'size':size,'en':en,'col':col}}
EM=lambda *l:{'emoji':[dict(e=a[0],x=a[1],y=a[2],size=a[3],**(a[4] if len(a)>4 else {})) for a in l]}
def M(*ds):
    r={}
    for d in ds: r.update(d)
    return r
EPIS={
'g01-bohemian-grove':dict(pre='g01',titulo=['¿SABÍAS QUE...?','EL SECRETO DEL BOSQUE'],final=['BOHEMIAN GROVE','¿TÚ QUÉ OPINAS?','150px'],tono='la',acorde=[0.4,0.55,0.8],
 hot='verano|poderosos|mundo|secreto|búho|gigante|piedra|bohemian|grove|bosque|privado|mil|hectáreas|california|vigilado|prensa|prohibida|siglo|presidentes|banqueros|magnates|semanas|julio|club|arte|ritual|nocturno|lago|cremación|preocupación|túnicas|antorchas|teorías|documentado|1942|reunión|proyecto|manhattan|lema|arañas|tejedoras|rumbo',
 fechas=[[7,7,'1942']],golpes=[5,7],
 fondos={'bosque':'giant redwood forest at night, huge tree trunks, a distant orange campfire glow between the trees, deep blue darkness, mysterious mood',
  'buho':'a huge stone owl statue standing at the edge of a dark lake at night in a redwood forest, lit from below by orange fire, reflections on the water',
  'mapa':'antique illustrated map of the coast of northern California with forests and a small marked spot, sepia parchment, compass rose, no letters',
  'entrada':'closed private road with a wooden gate and a small security booth inside a dark redwood forest at night, cold lamp light',
  'cabana':'luxurious rustic wooden cabin interior at night with a long table, world maps, whiskey glasses, a fireplace, warm dim light',
  'lago':'dark lake at night surrounded by giant redwoods, many torches reflected on the water, a stone altar with fire, smoke'},
 esc=[("¿Sabías que cada verano algunos de los hombres más poderosos del mundo se reúnen en secreto… frente a un búho gigante de piedra?",'bosque','sigue',[],EM(('🔥',540,1250,150))),
  ("Ocurre en Bohemian Grove, un bosque privado de más de mil hectáreas en California.",'mapa','lejos',[],M(T('BOHEMIAN GROVE',620,110),EM(('📍',600,1050,180,{'en':.4})))),
  ("Está fuertemente vigilado, y la prensa tiene prohibida la entrada.",'entrada','whip',["guardia 330 e","guardia 760 L e"],M(T('ACCESO PROHIBIDO',600,96,.4,'#ff4a4a'),EM(('📷',540,1000,170,{'en':.6}),('🚫',540,1000,240,{'en':.75})))),
  ("Desde hace más de un siglo, presidentes de Estados Unidos, banqueros y magnates pasan allí unas dos semanas cada julio.",'cabana','orbit',["presidente 240 s s1.3","empresario 540 g habla s1.3","empresario2 840 L m s1.3"],T('PRESIDENTES • MAGNATES • BANQUEROS',600,56)),
  ("Sus miembros dicen que es solo un club de arte y descanso.",'cabana','detalle',["empresario 400 s habla s1.6"],EM(('🎭',820,1000,190),('🎻',820,1300,170,{'en':.4}))),
  ("Pero cada año lo inauguran con un ritual nocturno junto al lago: «La Cremación de la Preocupación».",'buho','sube',["encapuchado 250 n s1.2","encapuchado2 540 n s1.1","encapuchado 830 L n s1.2"],M(T('LA CREMACIÓN DE LA PREOCUPACIÓN',600,62,.55),EM(('🔥',540,1450,200,{'en':.2})))),
  ("Túnicas, antorchas y un secreto absoluto alimentaron todo tipo de teorías.",'lago','crash',["encapuchado2 300 n","encapuchado 760 L n"],T('¿CLUB… O RITUAL DE PODER?',600,72,.5)),
  ("Lo que sí está documentado: en 1942 se celebró allí una reunión de planificación del Proyecto Manhattan.",'cabana','in',["cientifico 330 m pensar s1.4","empresario2 760 L o s1.4"],M(T('PROYECTO MANHATTAN',700,84,.5),EM(('⚛️',540,980,200,{'en':.6})))),
  ("Y su lema oficial dice: «Las arañas tejedoras no entran aquí». ¿Es solo un club social… o el lugar donde se decide el rumbo del mundo?",'buho','out',[],M(T('«WEAVING SPIDERS COME NOT HERE»',600,58,.15),EM(('🦉',540,1050,260),('🕸️',540,1350,170,{'en':.3}))))],
 fuentes=['Britannica: Bohemian Grove','The Guardian / informes de prensa sobre el retiro anual (julio)','Wikipedia: Bohemian Grove (reunión de planificación del Proyecto Manhattan, septiembre de 1942; lema del club; Cremation of Care)']),
}

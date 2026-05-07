# EXAMEN — Reto F12

Control de acceso al PDF según rol e identidad del creador. Aquí van mis respuestas a las cinco preguntas. Cito archivo y línea sobre el código tal y como queda ya en esta rama, con la restricción aplicada.

---

## 1. Qué pasa si un guest de la misma compañía que no creó el albarán llama a GET /api/deliverynote/pdf/:id

Antes del cambio, en src/controllers/deliverynote.controller.js:114 el findOne filtraba solo por _id y company. No miraba ni el rol ni el creador. O sea, si el guest pertenece a la misma compañía, el filtro lo deja pasar y se le devuelve el PDF con 200, aunque ese guest no haya tenido nada que ver con la creación de ese albarán.

A mí me parece claro que eso es una fuga de información. Cualquier compañero podía descargar documentos ajenos sin ningún tipo de aviso. La verdad es que es de los típicos fallos en los que tu cabeza se queda en la regla "es de mi empresa, vale" y se te olvida que dentro de una empresa no todos los usuarios son iguales.

Lo correcto es devolver 403 Forbidden. La autenticación es válida porque tiene un token bueno, así que un 401 no me cuadra, ver src/middleware/auth.middleware.js:11. Y un 404 tampoco lo veo bien, porque el albarán existe y devolver 404 sería mentir sobre el estado del recurso solo para esconderlo. El 403 es el que toca: "te identifico, pero no puedes con esto".

Con el cambio que apliqué en src/controllers/deliverynote.controller.js:121 ese mismo guest recibe ahora 403 con el code FORBIDDEN_PDF, que sale de AppError.forbidden, definido en src/utils/AppError.js:24.

---

## 2. Qué campo distingue admin de guest, cuál se compara con note.user, riesgo de tipo

El authenticate me deja en req.user el documento Mongoose entero del usuario, ver src/middleware/auth.middleware.js:21. Hace User.findById con el id que saca del token y lo deja ahí.

Para el rol uso req.user.role. En el modelo está como enum con valores admin y guest, ver src/models/User.js:26. Para el creador uso req.user._id contra note.user. Ojo que en src/controllers/deliverynote.controller.js:115 el endpoint hace populate de user, así que note.user no es ya un id pelado, es un documento poblado, y el id real está en note.user._id. Por seguridad por si en algún momento dejara de poblar use note.user?._id ?? note.user. Así si quita el populate sigue funcionando, y si lo mantengo también.

Y sí, hay un riesgo de tipo gordo. Tanto req.user._id como note.user._id son instancias de ObjectId, no strings. Si los comparas con triple igual estás comparando referencias en memoria, no el valor del id en hex. Dos ObjectId con el mismo valor pueden devolver false. Por eso convierto los dos lados a string con el método toString antes de comparar, en src/controllers/deliverynote.controller.js:121. De hecho, yo ya hago eso mismo en src/controllers/deliverynote.controller.js:30 cuando comparo el cliente del proyecto con el cliente del body, así que es coherente con el resto del controlador.

---

## 3. Puede un guest acceder a un soft deleted de otra persona

No, no llega. Te trazo el flujo desde que entra la petición.

Primero pasa por authenticate, que verifica el JWT y carga req.user, src/middleware/auth.middleware.js:11. Luego requireCompany comprueba que el usuario tiene una empresa asignada, src/middleware/auth.middleware.js:46. Después validate del id por params, src/middleware/validate.js:8. Y entra al controlador en src/controllers/deliverynote.controller.js:111 con su DeliveryNote.findOne filtrando por _id y company.

Aquí actúa el plugin de soft delete. El pre hook de src/plugins/softDelete.plugin.js:14 mira si en el filtro hay algo en la clave deleted. Como yo no la pongo, el plugin me inyecta deleted false automáticamente. Resultado: si el albarán está archivado, el findOne devuelve null sin más, el controlador entra en el if !note y responde 404 vía AppError.notFound.

Por eso el guest, archivado, ni siquiera roza la nueva comprobación de rol. La regla del soft delete se aplica antes y le corta el paso. La nueva regla del rol solo entra en juego cuando el documento existe y está activo. Que es lo que tiene que pasar, en mi opinión: un albarán archivado debería ser invisible aunque seas el creador, salvo que entres por un endpoint específico de archivados como el de listArchived.

Si en el futuro hiciera falta dar acceso al admin a los archivados desde este endpoint tendría que cambiar la query a findWithDeleted, src/plugins/softDelete.plugin.js:44. Pero hoy no es lo que toca.

---

## 4. Implementarlo como middleware en routes en lugar de en el controlador

Lo he pensado y lo cuento sin maquillar.

A favor del middleware. La autorización vive en un solo sitio, el controlador queda más fino y solo se ocupa de generar el PDF. Si mañana añado otro endpoint sobre el mismo recurso con la misma regla, una vista previa por ejemplo, lo aplico con un import. Además queda al lado del authenticate y requireCompany del router, src/routes/deliverynote.routes.js:21, así que la cadena de chequeos quedaría toda alineada.

En contra. El middleware no tiene el albarán en la mano todavía, así que para saber si soy el creador necesito leer el documento de BD. Después el controlador lo vuelve a leer, esta vez con populate, para generar el PDF. Son dos lecturas en lugar de una. Se puede mitigar dejando el documento en req.note y reutilizando esa referencia en el controlador, pero eso te ata al middleware y al controlador con un contrato implícito. Si alguien refactoriza uno y se olvida del otro queda un bug silencioso difícil de cazar.

Cómo accedería desde el middleware. Una query mínima sin populate, solo con el campo user, basta. Algo así sería suficiente:

```js
const note = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company }, 'user');
if (!note) return next(AppError.notFound('Albarán no encontrado'));
if (req.user.role === 'guest' && note.user.toString() !== req.user._id.toString()) {
  return next(AppError.forbidden('No tienes permiso para descargar este albarán', 'FORBIDDEN_PDF'));
}
next();
```

Mi conclusión es que para un solo endpoint con una sola regla no compensa. Cabe en el controlador, no acopla nada y no tengo que duplicar lecturas. Si mañana aparecen dos o tres endpoints más con la misma lógica entonces sí lo extraigo a middleware, no antes. La de "no abstraer hasta que duela" es mejor regla de la que parece.

---

## 5. Por qué deleteDeliveryNote sí verifica signed y downloadDeliveryNotePdf no verificaba rol. Sensibilidad del PDF firmado

Te lo cuento como pasó.

La rúbrica decía con esas palabras que un albarán firmado no se puede borrar. Esa frase la traduje literal a código, en src/controllers/deliverynote.controller.js:208, con un AppError.forbidden si note.signed. La descarga del PDF, en cambio, decía solo que tenía que filtrar por compañía. Yo lo apliqué tal cual y ahí me quedé, ver el findOne original en src/controllers/deliverynote.controller.js:114. No vi la implicación de "y dentro de la compañía, quién puede ver qué". Es un fallo mío de lectura entre líneas. La rúbrica no usaba la palabra creador, así que no la metí.

Sobre la sensibilidad. Yo creo que el PDF de un albarán firmado es claramente más sensible que el de uno no firmado. El firmado lleva la imagen de la firma manuscrita, ver src/controllers/deliverynote.controller.js:147 y la siguiente, donde la subo a Cloudinary, y representa un compromiso ya cerrado. Si se filtra fuera del autor o del cliente lo que se filtra no es solo información, es algo con valor probatorio. Por eso la nueva comprobación se hace antes de devolver pdfUrl en el caso firmado y antes de generar el binario en el no firmado, ambos pasan por src/controllers/deliverynote.controller.js:121. Cubre los dos caminos.

Aprendizaje rápido para mí. Las reglas que la rúbrica enuncia palabra por palabra acaban en código sin problema. Las implícitas, que se deducen del dominio pero no se escriben, son las que se escapan. Para la próxima me obligaré a pasar todos los endpoints que devuelven datos compartidos preguntándome quién los creó y si eso debería restringir la lectura, no solo la escritura.

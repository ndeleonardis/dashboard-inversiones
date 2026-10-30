# Levantar una copia de LemonHouse

Cada grupo usa su propia copia de LemonHouse. Una copia tiene su propio proyecto de Supabase, con la base y el login, su propio cliente de Google y su propio sitio. Esta guía arma una copia desde cero, hasta que la primera persona entra.

El repositorio no trae datos de nadie. Las personas, las cuentas y las categorías nuevas se cargan después, desde la app.

En esta guía, el sitio es `https://lemonhouse.example.com` y el ref del proyecto de Supabase es `TU-PROYECTO`. Cambialos por los tuyos en cada paso.

## Qué hace falta

- Node.js 22.12 o más nuevo, y git.
- Una cuenta de Supabase. El plan Free alcanza.
- Una cuenta de Google, para crear el cliente de login en Google Cloud.
- Un servidor con Nginx, un subdominio que apunte a él y acceso por SSH con una clave.

## 1. Bajar el código

```
git clone <dirección del repositorio>
cd dashboard-inversiones
npm install
```

## 2. Crear el proyecto de Supabase

1. En [supabase.com](https://supabase.com), creá un proyecto nuevo. Elegí la región más cercana (para Argentina, São Paulo).
2. Elegí una contraseña para la base y guardala. La vas a necesitar en el paso 3.
   - En Security, dejá tildados "Enable Data API" y "Automatically expose new tables", y destildado "Enable automatic RLS". La app usa la Data API. Los permisos y el RLS de cada tabla los ponen las migraciones, y los tests los prueban con estas opciones.
3. Anotá tres datos del proyecto:
   - **El ref.** Es lo que va después de `/project/` en la dirección del panel.
   - **La URL.** Es `https://TU-PROYECTO.supabase.co`.
   - **La key publicable.** Está en Project Settings, API Keys, y empieza con `sb_publishable_`. La secreta (`sb_secret_`) no se usa nunca.
4. Creá un token personal para la CLI de Supabase, en Account, Access Tokens. Se ve una sola vez, así que copialo directo al archivo del paso 3.

## 3. Completar `.env.production`

Copiá `.env.example` con el nombre `.env.production` y completá cada variable.

| Variable | Qué va |
|---|---|
| `VITE_SUPABASE_URL` | La URL del proyecto |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La key publicable |
| `SUPABASE_PROJECT_ID` | El ref del proyecto |
| `SUPABASE_DB_PASSWORD` | La contraseña de la base |
| `SUPABASE_ACCESS_TOKEN` | El token personal de la CLI |
| `PUBLICAR_DESTINO` | El servidor y la carpeta del sitio, como `usuario@servidor:/var/www/lemonhouse`. Si entrás con un alias de SSH (paso 8), `alias:/var/www/lemonhouse` |

`.env.production` no se versiona, porque `.gitignore` lo deja afuera. No lo compartas ni lo pegues en ningún chat.

## 4. Subir la base

```
npm run db:subir:produccion -- --dry-run
npm run db:subir:produccion
```

El primero muestra qué va a subir, sin tocar nada. El segundo crea las tablas, las reglas y las categorías de gastos e ingresos.

Al proyecto real van solo las migraciones. Los datos de ejemplo del repositorio van solo al proyecto de desarrollo.

## 5. Login con Google

### En Google Cloud

1. En [console.cloud.google.com](https://console.cloud.google.com), creá un proyecto. Si ya tenés otro para desarrollar, ponele un nombre que los distinga, como "LemonHouse PRD". El nombre lo ves solo vos y se cambia en IAM & Admin, Settings. Para saber en cuál proyecto estás, fijate el ID en la dirección, después de `project=`.
2. Entrá a Google Auth Platform y apretá "Get started". El asistente pide el nombre de la app (LemonHouse), tu email de asistencia, el público y un email de contacto. El público es External, porque con una cuenta de Gmail no existe Internal.
3. Completá cada sección del menú de la izquierda. Cada una se guarda con Save.
   - **Branding.** Dejá el logo vacío, porque con logo Google exige verificar la app antes de publicarla. Página principal `https://lemonhouse.example.com` y política de privacidad `https://lemonhouse.example.com/privacidad`. En los dominios autorizados, el dominio de tu sitio sin el subdominio (`example.com`) y el de Supabase (`TU-PROYECTO.supabase.co`).
   - **Data Access.** En "Add or remove scopes", tildá `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`. No hace falta ninguno más. Update cierra el panel pero no guarda, así que después apretá Save abajo de la página. Los tres tienen que quedar en "Your non-sensitive scopes".
   - **Audience.** Queda en "Testing" y External. En Test users, cargá la cuenta de Google de cada persona del grupo. Google dice que en "Testing" solo entran esas cuentas, pero con los permisos básicos que pide LemonHouse no siempre lo aplica. Quién entra lo decide la invitación de los pasos 6 y 7, no esta lista (en el paso 10 está el porqué).
   - **Clients.** Creá un cliente de tipo "Web application". En los orígenes autorizados de JavaScript va `https://lemonhouse.example.com`, sin barra al final. En los URIs de redireccionamiento autorizados va `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
4. Antes de apretar Create en Clients, abrí Supabase en otra pestaña, en el lugar del paso siguiente. Google muestra el secreto del cliente **una sola vez**. Copialo con el botón de copiar y pegalo directo en Supabase, sin descargar el archivo. El ID del cliente queda siempre a la vista.
   - **Si el secreto se pierde**, en la pantalla del cliente apretá "Add secret" y usá el nuevo. Después deshabilitá el viejo con Disable y borralo.

### En Supabase

1. En Authentication, Sign In / Providers, entrá a Google, prendé "Enable Sign in with Google" y pegá el ID y el secreto del cliente. "Callback URL (for OAuth)" tiene que ser igual al URI de redireccionamiento del cliente de Google.
   - **Ojo con el autocompletado del navegador.** Si guardaste una contraseña para supabase.com, el navegador puede llenar Client IDs con el usuario y el secreto con esa contraseña. Antes de guardar, revisá el ID y, con Reveal, que el secreto empiece con `GOCSPX-`. Si el navegador ofrece guardar la contraseña, elegí "Nunca".
2. En la lista de proveedores, entrá a Email y apagá "Enable Email provider". En LemonHouse se entra solo con Google.
3. Arriba, en User Signups, dejá prendido "Allow new users to sign up". Quién entra lo decide el hook del paso 6, no esta opción.
4. En Authentication, URL Configuration, poné `https://lemonhouse.example.com` como Site URL y sumalo a las Redirect URLs, sin barra al final. Que no quede `localhost` en ninguno de los dos.

## 6. Activar el hook de invitación

En Authentication, Hooks, agregá el hook "Before User Created". Elegí el tipo Postgres, el esquema `public` y la función `antes_de_crear_usuario`.

El hook deja crear el usuario solo si su email está invitado. Sin el hook, cualquiera con una cuenta de Google podría crear su usuario. No vería ningún dato, porque la base exige estar invitado, pero su usuario quedaría creado.

## 7. Invitar a las personas

La invitación es el email de una persona. Desde la app no se puede escribir, a propósito: lo carga solo quien administra la copia, desde el panel de Supabase.

- **Para invitar a alguien.** En Table Editor, tabla `persona`, cargá una fila con su nombre y el email de su cuenta de Google. Si la persona ya existe porque se creó desde la app, editá su fila y completá el email. Las mayúsculas no importan.
- **La primera persona.** Antes de entrar por primera vez, tiene que haber al menos una persona invitada: la tuya.
- **Para sacarle el acceso a alguien.** Primero borrá el email de su persona y dejá la celda vacía. Desde ese momento la base no le muestra nada, y la app la saca la próxima vez que la abre. Después borrá su usuario en Authentication, Users. La persona sigue en la base con sus cuentas y movimientos, y solo pierde el acceso.

## 8. Preparar el servidor

Estos comandos son para un servidor Debian o Ubuntu. Salvo el alias, se corren en el servidor, después de entrar con `ssh servidor`. Antes de pegar cada uno, fijate que el prompt sea el del servidor y no el de tu computadora.

1. **El acceso por SSH.** `npm run publicar` llama a `scp` y `ssh` sin opciones, así que no sabe qué clave usar. Si entrás al servidor con `ssh -i <clave> usuario@servidor`, armá un alias en `~/.ssh/config` (en Windows, `C:\Users\<tu usuario>\.ssh\config`):

   ```
   Host servidor
       HostName <IP del servidor>
       User <usuario>
       IdentityFile <ruta de la clave>
       IdentitiesOnly yes
   ```

   Probalo con `ssh servidor`. En `.env.production` va `PUBLICAR_DESTINO=servidor:/var/www/lemonhouse`.

2. **La carpeta del sitio**, a nombre del usuario con el que vas a publicar:

   ```
   sudo mkdir -p /var/www/lemonhouse
   sudo chown $USER /var/www/lemonhouse
   ```

3. **El certificado HTTPS.** Si el subdominio todavía no tiene uno, sacalo con Certbot:

   ```
   sudo certbot certonly --nginx -d lemonhouse.example.com
   ```

4. **La configuración de Nginx.** Copiá `docs/nginx-ejemplo.conf` al servidor como `/etc/nginx/sites-available/lemonhouse`. Cambiá `lemonhouse.example.com` y `TU-PROYECTO` por los tuyos, y activala:

   ```
   sudo ln -s /etc/nginx/sites-available/lemonhouse /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   Si `TU-PROYECTO` queda sin cambiar, la página abre pero no puede hablar con Supabase, y no se puede entrar.

## 9. Publicar

Desde tu computadora:

```
npm run verificar
npm run publicar
```

`verificar` corre los tests, el chequeo de tipos y el build. `publicar` arma el sitio con `.env.production` y lo sube con `scp` al destino de `PUBLICAR_DESTINO`. `index.html` va al final, con otro nombre, y se renombra en el servidor con `ssh`: si la conexión se corta, el sitio sigue con la versión anterior. Si el servidor pide la contraseña en cada paso, o no encuentra la clave, revisá el alias del paso 8.

**Para publicar una versión nueva**, primero subí la base si hay migraciones nuevas, con `npm run db:subir:produccion`. Después corré `verificar` y `publicar`. Los archivos viejos de `assets/` quedan en el servidor y no molestan.

## 10. Probar

1. Abrí `https://lemonhouse.example.com`. Tiene que verse la pantalla de entrar, con el enlace a la privacidad.
2. Entrá con una cuenta invitada. Tenés que llegar al resumen.
3. Probá con una cuenta de Google no invitada. No hace falta cargarla como usuario de prueba. Tiene que aparecer "Este email no tiene acceso a LemonHouse", y en Authentication, Users no tiene que aparecer ningún usuario nuevo.
   - **Por qué alcanza con la invitación.** Pensalo como un edificio con dos porteros. El de la puerta de calle es Google, que en "Testing" dice que solo deja pasar a los usuarios de prueba. El de la puerta del departamento es LemonHouse, con el hook del paso 6, que deja pasar solo a los emails invitados. En la prueba de esta guía, el portero de la calle dejó pasar una cuenta que no estaba en su lista, y la frenó el del departamento. Los datos los protege el del departamento, así que la lista de Google no es lo que cuida a LemonHouse.
   - **Si Google muestra su propio error de acceso bloqueado**, es porque el portero de la calle sí pidió la lista. Cargá esa cuenta en Test users y probá de nuevo.
4. En un celular Android, abrí el sitio en Chrome, tocá el menú ⋮ de arriba a la derecha y elegí "Instalar app" (o "Agregar a la pantalla principal" y después "Instalar"). La app queda entre las aplicaciones del celular. Abre sin la barra del navegador y se entra con Google sin salir de ella.
   - **Samsung Internet no la instala.** Muestra una flecha en la barra de direcciones que pregunta "Add this website to the Apps screen?", pero la app no aparece entre las aplicaciones del celular, solo como acceso en la página de inicio del navegador. Lo más probable es que sea porque LemonHouse no tiene service worker, a propósito: uno que guarde la app puede dejar a alguien con una versión vieja después de publicar. En un Samsung, instalala con Chrome.

## 11. Publicar la app de Google

Google dice que, mientras la app esté en "Testing", solo entran las cuentas cargadas como usuarios de prueba, aunque con permisos básicos no siempre lo aplica (paso 10). Con el sitio y la página de privacidad ya publicados, pasala a producción en Google Auth Platform, Audience, "Publish app". Así, para que una persona nueva entre alcanza con invitarla como en el paso 7, sin depender de que Google aplique o no su lista.

LemonHouse pide solo el email y el perfil, que para Google son permisos básicos. Si Google pide verificar la marca, lo hace desde su Centro de verificación con la página principal y la de privacidad de la sección Branding.

## Para tener en cuenta

- **Supabase Free pausa el proyecto** después de una semana sin uso. Los datos quedan, y se reactiva desde el panel.
- **La v1 no arma backups** de la base. Queda pendiente como un cambio aparte (sección 10 del plan de la v1). Hasta que exista, no tires el registro que usabas antes.
- **Para desarrollar**, se repite todo con otro proyecto de Supabase y `.env.development`. En ese proyecto, `npm run db:subir` también carga los datos de ejemplo, y `npm run dev` levanta la app en `http://localhost:5173`, que va como Site URL.

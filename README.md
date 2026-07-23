# LALIGA Fantasy Analyzer

Aplicación web no oficial para consultar ligas, clasificaciones, plantillas,
cláusulas y el mercado de LALIGA Fantasy durante la temporada 2026/27.

## Estado actual

- Compatible con la API 2026/27 y la competición de Primera División (`1`).
- Ligas, clasificación, plantilla propia, plantillas rivales y mercado en modo
  lectura.
- Panel de jornada con alineación actual o histórica, aviso de once incompleto,
  calendario, resultados, clasificación semanal y evolución acumulada.
- Fichas individuales con estado, valor, puntuación y desglose por jornada
  cuando la API lo proporciona.
- Interfaz completa en castellano e inglés, con castellano por defecto y
  preferencia persistente en el navegador.
- Tendencia reciente de valor en Mercado y Oportunidades mediante instantáneas
  diarias locales de los valores actuales de la API.
- Radar read-only de actividad, presupuesto, inversión y balance reciente por
  mánager.
- Validación runtime de las respuestas remotas antes de entregarlas a React.
- Sesión mediante cookie `HttpOnly`, sin guardar el bearer token en
  `localStorage`, y comprobación del usuario upstream desde la barra de
  navegación.
- Publicación masiva de la plantilla al valor de mercado, renovando anuncios
  existentes con confirmación previa y resultado por jugador.
- Pujas, ofertas, cláusulas y otras mutaciones permanecen desactivadas.
- El endpoint histórico anterior permanece desactivado porque devuelve datos
  congelados de la temporada 2025/26; la tendencia local empieza a calcularse
  después de disponer de instantáneas de al menos dos días distintos.

La API utilizada es privada y no está documentada públicamente. Puede cambiar
sin previo aviso al comenzar una temporada.

## Requisitos

- Node.js `>=22.13.0` (se recomienda Node 24).
- Corepack, incluido con las distribuciones compatibles de Node.

El proyecto fija `pnpm@11.16.0` para que las instalaciones sean reproducibles.

## Instalación

```bash
git clone https://github.com/sergioalmela/la-liga-fantasy-analyzer.git
cd la-liga-fantasy-analyzer
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

La aplicación estará disponible en <http://localhost:3000>.

Para usar otra competición se puede definir antes del build:

```bash
NEXT_PUBLIC_FANTASY_COMPETITION_ID=1 pnpm build
```

Solo se ha verificado la competición `1`.

## Comandos

```bash
pnpm dev       # servidor de desarrollo
pnpm check     # Biome, TypeScript y tests
pnpm lint      # comprobación de Biome, sin modificar ficheros
pnpm lint:fix  # correcciones seguras de Biome
pnpm format    # formatear el proyecto
pnpm test      # tests de contratos y sesión
pnpm build     # build de producción
pnpm start     # servir el build
pnpm audit     # auditoría de dependencias
```

## Autenticación y privacidad

El login de email y contraseña usa el flujo ROPC de Azure B2C empleado por la
aplicación oficial. Es un flujo legacy y solo funciona con cuentas locales; no
produce una sesión Fantasy para cuentas de Google, Apple o Facebook.

La contraseña se envía por HTTPS al backend Next de esta aplicación, se reenvía
una vez al proveedor de LALIGA y no se persiste. El access token resultante se
guarda en una cookie `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
Los datos Fantasy atraviesan el proxy Next, pero no se almacenan en una base de
datos del proyecto. El histórico de valor procede del endpoint oficial de la
temporada actual y se conserva únicamente en memoria durante seis horas para
evitar peticiones repetidas. El navegador persiste solo el idioma elegido;
nunca guarda credenciales ni tokens accesibles desde JavaScript.

Consulta [docs/authentication.md](docs/authentication.md) antes de desplegar la
aplicación públicamente.

## Arquitectura

```text
src/app/                 rutas y páginas de Next.js
src/app/api/auth/        BFF de login y sesión
src/app/api/fantasy/     proxy allowlisted hacia la API Fantasy
src/services/            cliente, servicios y adaptadores runtime
src/entities/            modelos usados por la interfaz
src/components/          componentes React
tests/                   tests de contratos y seguridad de sesión
src/proxy.ts             CSP con nonce y cabeceras de seguridad
```

El catálogo de endpoints verificados y las limitaciones están en
[docs/api-2026-27.md](docs/api-2026-27.md).

## Seguridad de despliegue

- Servir siempre mediante HTTPS.
- Aplicar rate limiting externo a `/api/auth/login`.
- No registrar cookies, cabeceras `Authorization`, passwords ni respuestas del
  proveedor de identidad.
- Ejecutar `pnpm check`, `pnpm build` y `pnpm audit` antes de desplegar.
- Rotar cualquier token o contraseña que se haya compartido fuera de la
  aplicación.

## Aviso

Este proyecto es una herramienta no oficial y no está afiliado con LALIGA ni
con LALIGA Fantasy. Respeta sus condiciones de uso y evita automatizaciones
agresivas o acciones de mercado sin confirmación explícita.

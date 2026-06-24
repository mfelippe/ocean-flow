// Página pública de documentação interativa da API, renderizada com Scalar
// (carregado via CDN). Aponta para a spec em /api/openapi.json. Permite
// explorar as rotas e testá-las colando um token de API (botão "Authorize").
//
// Nota: o renderer vem do CDN (precisa de internet ao abrir a página). Para um
// ambiente 100% offline, troque o <script> por um bundle local.
const HTML = `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ocean Flow — API</title>
    <link rel="icon" href="data:," />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: '/api/openapi.json',
        theme: 'default',
        metaData: { title: 'Ocean Flow — API' },
      });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

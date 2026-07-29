const apiUrl = process.env.API_URL;
const webUrl = process.env.WEB_URL;

if (!apiUrl || !webUrl) {
  console.error('Informe API_URL e WEB_URL para validar o deploy.');
  console.error('Exemplo: API_URL=https://api.onrender.com WEB_URL=https://app.vercel.app npm run smoke:deploy');
  process.exit(1);
}

async function check(name, url, validate) {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) throw new Error(`${name} respondeu HTTP ${response.status}`);
  validate(body, response);
  console.log(`OK ${name}: ${url}`);
}

try {
  await check('API health', `${apiUrl.replace(/\/$/, '')}/health`, body => {
    const payload = JSON.parse(body);
    if (payload.status !== 'ok') throw new Error('API health nao retornou status ok');
  });

  await check('Web app', webUrl, body => {
    if (!body.includes('<div id="root">')) throw new Error('HTML do frontend nao parece ser o app Vite');
  });

  console.log('Deploy validado com sucesso.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao validar deploy.');
  process.exit(1);
}

import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { createDatabase } from './database.js';

let app: ReturnType<typeof buildApp>;
afterEach(async () => app?.close());

async function register(email = 'tester@unifor.br') {
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Pessoa Teste', email, password: 'senha-segura' } });
  expect(response.statusCode).toBe(201);
  return response.json() as { token: string; user: { id: string } };
}

describe('listings API', () => {
  it('creates, filters and deletes a listing', async () => {
    app = buildApp(createDatabase(':memory:'));
    const session = await register();
    const created = await app.inject({ method: 'POST', url: '/listings', payload: {
      title: 'Livro de algoritmos', description: 'Conservado e sem marcações.',
      category: 'Livros', price: 30, isDonation: false, imageUrl: 'https://example.com/book.jpg'
    }, headers: { authorization: `Bearer ${session.token}` }});
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const list = await app.inject({ method: 'GET', url: `/listings?userId=${session.user.id}` });
    expect(list.json()).toHaveLength(1);
    expect((await app.inject({ method: 'DELETE', url: `/listings/${id}`, headers: { authorization: `Bearer ${session.token}` } })).statusCode).toBe(204);
  });

  it('rejects an invalid sale without price', async () => {
    app = buildApp(createDatabase(':memory:'));
    const session = await register();
    const response = await app.inject({ method: 'POST', url: '/listings', payload: {
      title: 'Item válido', description: 'Descrição suficientemente longa.',
      category: 'Outros', price: null, isDonation: false, imageUrl: 'https://example.com/item.jpg'
    }, headers: { authorization: `Bearer ${session.token}` }});
    expect(response.statusCode).toBe(400);
  });

  it('requires authentication to create a listing', async () => {
    app = buildApp(createDatabase(':memory:'));
    const response = await app.inject({ method: 'POST', url: '/listings', payload: {
      title: 'Item protegido', description: 'Descrição suficientemente longa.', category: 'Outros', price: 10, isDonation: false, imageUrl: 'https://example.com/item.jpg'
    }});
    expect(response.statusCode).toBe(401);
  });

  it('prevents another user from deleting a listing', async () => {
    app = buildApp(createDatabase(':memory:'));
    const owner = await register('owner@unifor.br');
    const stranger = await register('stranger@unifor.br');
    const created = await app.inject({ method: 'POST', url: '/listings', headers: { authorization: `Bearer ${owner.token}` }, payload: {
      title: 'Item do proprietário', description: 'Descrição suficientemente longa.', category: 'Outros', price: 10, isDonation: false, imageUrl: 'https://example.com/item.jpg'
    }});
    const response = await app.inject({ method: 'DELETE', url: `/listings/${created.json().id}`, headers: { authorization: `Bearer ${stranger.token}` } });
    expect(response.statusCode).toBe(403);
  });
});

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { compare, hash } from 'bcryptjs';
import Fastify, { type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createDatabase, type ListingRepository } from './database.js';

const listingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(['Livros', 'Computação', 'Engenharia', 'Saúde', 'Outros']),
  price: z.number().nonnegative().nullable(),
  isDonation: z.boolean(),
  imageUrl: z.url()
}).refine(data => data.isDonation ? data.price === null : data.price !== null, {
  message: 'Doações não possuem preço; vendas precisam informar um preço.', path: ['price']
});

const credentialsSchema = z.object({
  email: z.email().transform(value => value.toLowerCase()),
  password: z.string().min(8).max(72)
});

const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(80) });
type AuthUser = { id: string; name: string; email: string };

export function buildApp(repository: ListingRepository = createDatabase()) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(cors, { origin: true });
  app.register(jwt, { secret: process.env.JWT_SECRET ?? 'repassa-local-development-secret' });
  const authenticate = (request: FastifyRequest) => request.jwtVerify<{ sub: string; name: string; email: string }>();
  const session = (user: AuthUser) => ({ token: app.jwt.sign({ name: user.name, email: user.email }, { sub: user.id, expiresIn: '7d' }), user });

  app.post('/auth/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    if (repository.findUserByEmail(input.email)) return reply.code(409).send({ error: 'Este e-mail já está cadastrado.' });
    const created = repository.createUser({ ...input, passwordHash: await hash(input.password, 12) });
    return reply.code(201).send(session({ id: created.id, name: created.name, email: created.email }));
  });
  app.post('/auth/login', async (request, reply) => {
    const input = credentialsSchema.parse(request.body);
    const user = repository.findUserByEmail(input.email);
    if (!user || !await compare(input.password, user.passwordHash)) return reply.code(401).send({ error: 'E-mail ou senha inválidos.' });
    return session({ id: user.id, name: user.name, email: user.email });
  });
  app.get('/auth/me', async (request, reply) => {
    try { const payload = await authenticate(request); return { user: { id: payload.sub, name: payload.name, email: payload.email } }; }
    catch { return reply.code(401).send({ error: 'Sessão inválida ou expirada.' }); }
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/listings', async request => {
    const query = z.object({ category: z.string().optional(), userId: z.string().optional(), search: z.string().optional() }).parse(request.query);
    return repository.list(query);
  });
  app.get('/listings/:id', async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    return repository.get(id) ?? reply.code(404).send({ error: 'Anúncio não encontrado.' });
  });
  app.post('/listings', async (request, reply) => {
    try { const user = await authenticate(request); return reply.code(201).send(repository.create({ ...listingSchema.parse(request.body), userId: user.sub })); }
    catch (error) { if (!(error instanceof z.ZodError)) return reply.code(401).send({ error: 'Autenticação necessária.' }); throw error; }
  });
  app.put('/listings/:id', async (request, reply) => {
    let user; try { user = await authenticate(request); } catch { return reply.code(401).send({ error: 'Autenticação necessária.' }); }
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const current = repository.get(id);
    if (!current) return reply.code(404).send({ error: 'Anúncio não encontrado.' });
    if (current.userId !== user.sub) return reply.code(403).send({ error: 'Você não pode alterar este anúncio.' });
    const result = repository.update(id, listingSchema.parse(request.body));
    return result ?? reply.code(404).send({ error: 'Anúncio não encontrado.' });
  });
  app.delete('/listings/:id', async (request, reply) => {
    let user; try { user = await authenticate(request); } catch { return reply.code(401).send({ error: 'Autenticação necessária.' }); }
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
    const current = repository.get(id);
    if (!current) return reply.code(404).send({ error: 'Anúncio não encontrado.' });
    if (current.userId !== user.sub) return reply.code(403).send({ error: 'Você não pode excluir este anúncio.' });
    return repository.remove(id) ? reply.code(204).send() : reply.code(404).send({ error: 'Anúncio não encontrado.' });
  });
  app.get('/stats', async () => repository.stats());
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Dados inválidos.', details: z.flattenError(error) });
    app.log.error(error);
    return reply.code(500).send({ error: 'Erro interno do servidor.' });
  });
  app.addHook('onClose', () => repository.raw.close());
  return app;
}

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export type Listing = {
  id: number;
  userId: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  isDonation: boolean;
  imageUrl: string;
  createdAt: string;
};

type ListingRow = Omit<Listing, 'isDonation'> & { isDonation: number };

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export function createDatabase(filename = process.env.DATABASE_PATH ?? './data/repassa.db') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL,
      isDonation INTEGER NOT NULL DEFAULT 0,
      imageUrl TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
    CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(userId);
  `);

  if ((db.prepare('SELECT COUNT(*) AS total FROM listings').get() as { total: number }).total === 0) {
    const insert = db.prepare(`INSERT INTO listings
      (userId, title, description, category, price, isDonation, imageUrl)
      VALUES (@userId, @title, @description, @category, @price, @isDonation, @imageUrl)`);
    const samples = [
      ['ana', 'Cálculo Vol. 1', 'Livro em ótimo estado, com poucas marcações.', 'Livros', 45, 0, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900'],
      ['leo', 'Kit Arduino Uno', 'Placa, protoboard e componentes para projetos.', 'Computação', 80, 0, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=900'],
      ['maria', 'Jaleco tamanho M', 'Doação para quem está começando as aulas práticas.', 'Saúde', null, 1, 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=900']
    ];
    const seed = db.transaction(() => samples.forEach(([userId, title, description, category, price, isDonation, imageUrl]) => insert.run({ userId, title, description, category, price, isDonation, imageUrl })));
    seed();
  }

  const map = (row: ListingRow): Listing => ({ ...row, isDonation: Boolean(row.isDonation) });
  return {
    raw: db,
    findUserByEmail(email: string) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User | undefined;
    },
    createUser(input: { name: string; email: string; passwordHash: string }) {
      const user = { id: randomUUID(), name: input.name, email: input.email.toLowerCase(), passwordHash: input.passwordHash };
      db.prepare('INSERT INTO users (id,name,email,passwordHash) VALUES (@id,@name,@email,@passwordHash)').run(user);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as User;
    },
    list(filters: { category?: string; userId?: string; search?: string }) {
      const where: string[] = [];
      const params: Record<string, string> = {};
      if (filters.category) { where.push('category = @category'); params.category = filters.category; }
      if (filters.userId) { where.push('userId = @userId'); params.userId = filters.userId; }
      if (filters.search) { where.push('(title LIKE @search OR description LIKE @search)'); params.search = `%${filters.search}%`; }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return (db.prepare(`SELECT * FROM listings ${clause} ORDER BY datetime(createdAt) DESC, id DESC`).all(params) as ListingRow[]).map(map);
    },
    get(id: number) {
      const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as ListingRow | undefined;
      return row ? map(row) : undefined;
    },
    create(input: Omit<Listing, 'id' | 'createdAt'>) {
      const result = db.prepare(`INSERT INTO listings (userId,title,description,category,price,isDonation,imageUrl)
        VALUES (@userId,@title,@description,@category,@price,@isDonation,@imageUrl)`).run({ ...input, isDonation: Number(input.isDonation) });
      return this.get(Number(result.lastInsertRowid))!;
    },
    update(id: number, input: Partial<Omit<Listing, 'id' | 'createdAt' | 'userId'>>) {
      const current = this.get(id);
      if (!current) return undefined;
      const next = { ...current, ...input, isDonation: Number(input.isDonation ?? current.isDonation) };
      db.prepare(`UPDATE listings SET title=@title,description=@description,category=@category,
        price=@price,isDonation=@isDonation,imageUrl=@imageUrl WHERE id=@id`).run(next);
      return this.get(id);
    },
    remove(id: number) { return db.prepare('DELETE FROM listings WHERE id = ?').run(id).changes > 0; },
    stats() {
      const result = db.prepare(`SELECT COUNT(*) total, SUM(isDonation) donations, COUNT(DISTINCT userId) users FROM listings`).get() as Record<string, number>;
      return { totalListings: result.total, donations: result.donations ?? 0, activeUsers: result.users };
    }
  };
}

export type ListingRepository = ReturnType<typeof createDatabase>;

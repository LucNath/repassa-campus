import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, type Listing } from './api';

vi.mock('./api', () => ({
  api: {
    listings: vi.fn(),
    stats: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    getSession: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

const listings: Listing[] = [
  { id: 1, userId: 'ana', title: 'Livro de Cálculo', description: 'Livro conservado para o primeiro semestre.', category: 'Livros', price: 40, isDonation: false, imageUrl: 'https://example.com/livro.jpg', createdAt: '2026-07-20' },
  { id: 2, userId: 'estudante-demo', title: 'Teclado mecânico', description: 'Teclado funcionando e com cabo USB.', category: 'Computação', price: 90, isDonation: false, imageUrl: 'https://example.com/teclado.jpg', createdAt: '2026-07-21' },
  { id: 3, userId: 'bia', title: 'Jaleco tamanho M', description: 'Jaleco disponível para doação no campus.', category: 'Saúde', price: null, isDonation: true, imageUrl: 'https://example.com/jaleco.jpg', createdAt: '2026-07-22' }
];

const initialStats = { totalListings: 3, donations: 1, activeUsers: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listings).mockResolvedValue(listings);
  vi.mocked(api.stats).mockResolvedValue(initialStats);
  vi.mocked(api.remove).mockResolvedValue();
  vi.mocked(api.getSession).mockReturnValue({ token: 'token-test', user: { id: 'estudante-demo', name: 'Estudante', email: 'estudante@unifor.br' } });
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('Repassa Campus', () => {
  it('carrega anúncios e estatísticas retornados pela API', async () => {
    render(<App />);

    expect(await screen.findByText('Livro de Cálculo')).toBeInTheDocument();
    expect(screen.getByText('Teclado mecânico')).toBeInTheDocument();
    expect(screen.getByText('itens circulando').parentElement).toHaveTextContent('3+');
    expect(screen.getByText('doações feitas').parentElement).toHaveTextContent('1');
  });

  it('filtra anúncios pela busca e pela categoria', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Livro de Cálculo');

    await user.type(screen.getByRole('searchbox'), 'jaleco');
    expect(screen.getByText('Jaleco tamanho M')).toBeInTheDocument();
    expect(screen.queryByText('Livro de Cálculo')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Computação' }));
    expect(screen.getByText('Teclado mecânico')).toBeInTheDocument();
    expect(screen.queryByText('Jaleco tamanho M')).not.toBeInTheDocument();
  });

  it('mostra somente os anúncios do usuário na aba Meus anúncios', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Livro de Cálculo');

    await user.click(screen.getByRole('button', { name: 'Meus anúncios' }));
    expect(screen.getByText('Teclado mecânico')).toBeInTheDocument();
    expect(screen.queryByText('Livro de Cálculo')).not.toBeInTheDocument();
    expect(screen.queryByText('Jaleco tamanho M')).not.toBeInTheDocument();
  });

  it('publica uma venda, limpa o formulário e atualiza as estatísticas', async () => {
    const user = userEvent.setup();
    const created: Listing = { id: 4, userId: 'estudante-demo', title: 'Calculadora científica', description: 'Calculadora em excelente estado de conservação.', category: 'Engenharia', price: 55, isDonation: false, imageUrl: 'https://example.com/calculadora.jpg', createdAt: '2026-07-22' };
    vi.mocked(api.create).mockResolvedValue(created);
    vi.mocked(api.stats).mockResolvedValueOnce(initialStats).mockResolvedValueOnce({ totalListings: 4, donations: 1, activeUsers: 3 });
    render(<App />);
    await screen.findByText('Livro de Cálculo');

    await user.type(screen.getByLabelText('Título'), created.title);
    await user.type(screen.getByLabelText('Descrição'), created.description);
    await user.selectOptions(screen.getByLabelText('Categoria'), created.category);
    await user.type(screen.getByLabelText('URL da imagem'), created.imageUrl);
    await user.type(screen.getByLabelText('Preço (R$)'), '55');
    await user.click(screen.getByRole('button', { name: 'Publicar anúncio' }));

    expect(await screen.findByText('Anúncio publicado!')).toBeInTheDocument();
    expect(screen.getByText(created.title)).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ price: 55, isDonation: false }));
    expect(api.create).toHaveBeenCalledWith(expect.not.objectContaining({ userId: expect.anything() }));
    await waitFor(() => expect(within(screen.getByLabelText('Estatísticas')).getByText('4+')).toBeInTheDocument());
  });

  it('publica uma doação sem enviar preço', async () => {
    const user = userEvent.setup();
    const donation: Listing = { id: 5, userId: 'estudante-demo', title: 'Caderno novo', description: 'Caderno sem uso disponível para retirada.', category: 'Outros', price: null, isDonation: true, imageUrl: 'https://example.com/caderno.jpg', createdAt: '2026-07-22' };
    vi.mocked(api.create).mockResolvedValue(donation);
    render(<App />);
    await screen.findByText('Livro de Cálculo');

    await user.type(screen.getByLabelText('Título'), donation.title);
    await user.type(screen.getByLabelText('Descrição'), donation.description);
    await user.selectOptions(screen.getByLabelText('Categoria'), donation.category);
    await user.type(screen.getByLabelText('URL da imagem'), donation.imageUrl);
    await user.click(screen.getByLabelText('Quero doar este item'));
    expect(screen.queryByLabelText('Preço (R$)')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publicar anúncio' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ price: null, isDonation: true })));
  });

  it('exclui um anúncio próprio e atualiza as estatísticas', async () => {
    const user = userEvent.setup();
    vi.mocked(api.stats).mockResolvedValueOnce(initialStats).mockResolvedValueOnce({ totalListings: 2, donations: 1, activeUsers: 2 });
    render(<App />);
    await screen.findByText('Livro de Cálculo');
    await user.click(screen.getByRole('button', { name: 'Meus anúncios' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(confirm).toHaveBeenCalledWith('Excluir este anúncio?');
    expect(api.remove).toHaveBeenCalledWith(2);
    expect(await screen.findByText('Anúncio excluído.')).toBeInTheDocument();
    expect(screen.queryByText('Teclado mecânico')).not.toBeInTheDocument();
  });

  it('informa quando a API está indisponível', async () => {
    vi.mocked(api.listings).mockRejectedValue(new Error('offline'));
    render(<App />);

    expect(await screen.findByText('A API está indisponível. Inicie o backend e tente novamente.')).toBeInTheDocument();
  });

  it('mantém o anúncio e mostra o erro quando a exclusão falha', async () => {
    const user = userEvent.setup();
    vi.mocked(api.remove).mockRejectedValue(new Error('Falha ao excluir.'));
    render(<App />);
    await screen.findByText('Livro de Cálculo');
    await user.click(screen.getByRole('button', { name: 'Meus anúncios' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Falha ao excluir.')).toBeInTheDocument();
    expect(screen.getByText('Teclado mecânico')).toBeInTheDocument();
  });

  it('permite entrar e libera o formulário de anúncio', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getSession).mockReturnValue(null);
    vi.mocked(api.login).mockResolvedValue({ token: 'novo-token', user: { id: 'estudante-demo', name: 'Lucas', email: 'lucas@unifor.br' } });
    render(<App />);
    await screen.findByText('Livro de Cálculo');
    expect(screen.getByText('Entre para anunciar.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Entrar$/ }));
    await user.type(screen.getByLabelText('E-mail'), 'lucas@unifor.br');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(api.login).toHaveBeenCalledWith({ email: 'lucas@unifor.br', password: 'senha-segura' }));
    expect(await screen.findByText('O que você quer repassar?')).toBeInTheDocument();
    expect(screen.getByText('Olá, Lucas')).toBeInTheDocument();
  });
});

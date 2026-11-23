function urlApi(caminho) {
    return 'https://ppw-1-tads.vercel.app' + caminho;
}

function chaveArmazenamento(nome) {
    const chaves = {
        carrinho: 'carrinho_mdg',
        produtos: 'produtos_api_mdg',
        usuario: 'usuarioLogado',
        pedidos: 'pedidos_mdg',
        enderecos: 'enderecos_mdg',
        favoritos: 'favoritos_mdg'
    };
    return chaves[nome];
}

function lerArmazenamento(nome, padrao) {
    try {
        const valor = localStorage.getItem(chaveArmazenamento(nome));
        return valor === null ? padrao : JSON.parse(valor);
    } catch (erro) {
        return padrao;
    }
}

function gravarArmazenamento(nome, valor) {
    localStorage.setItem(chaveArmazenamento(nome), JSON.stringify(valor));
}

function removerArmazenamento(nome) {
    localStorage.removeItem(chaveArmazenamento(nome));
}

function compor(...funcoes) {
    return entrada => funcoes.reduceRight((acumulado, funcao) => funcao(acumulado), entrada);
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function arredondar(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function escaparHtml(texto) {
    const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(texto ?? '').replace(/[&<>"']/g, caractere => mapa[caractere]);
}

function somenteDigitos(texto) {
    return String(texto || '').replace(/\D/g, '');
}

function aplicarMascaraCep(campo) {
    const digitos = somenteDigitos(campo.value).slice(0, 8);
    campo.value = digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

function formatarData(iso) {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function primeiroNome(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
}

function capitalizar(texto) {
    const valor = String(texto || '');
    return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function urlImagem(imagem) {
    if (!imagem) return 'img/logo.png';
    return /^https?:\/\//i.test(imagem) ? imagem : new URL(imagem, urlApi('/')).href;
}

function nomeMetodoPagamento(metodo) {
    const nomes = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão' };
    return nomes[metodo] || capitalizar(metodo);
}

function criarElemento(tag, propriedades = {}, filhos = []) {
    const elemento = document.createElement(tag);
    Object.entries(propriedades).forEach(([chave, valor]) => {
        if (valor === false || valor === null || valor === undefined) return;
        if (chave === 'classe') elemento.className = valor;
        else if (chave === 'texto') elemento.textContent = valor;
        else if (chave.startsWith('on')) elemento.addEventListener(chave.slice(2).toLowerCase(), valor);
        else elemento.setAttribute(chave, valor === true ? '' : valor);
    });
    [].concat(filhos).forEach(filho => elemento.append(filho));
    return elemento;
}

function mostrarAlerta(mensagem, tipo = 'danger', idContainer = 'alertas') {
    const container = document.getElementById(idContainer);
    if (!container) return;
    const icones = {
        danger: 'bi-exclamation-octagon-fill',
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    container.replaceChildren(
        criarElemento('div', { classe: `alert alert-${tipo} d-flex align-items-start gap-2 mb-3`, role: 'alert' }, [
            criarElemento('i', { classe: `bi ${icones[tipo]} flex-shrink-0`, 'aria-hidden': 'true' }),
            criarElemento('div', { texto: mensagem })
        ])
    );
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function limparAlerta(idContainer = 'alertas') {
    const container = document.getElementById(idContainer);
    if (container) container.replaceChildren();
}

function mostrarToast(mensagem, tipo = 'success') {
    let area = document.getElementById('area-toasts');
    if (!area) {
        area = criarElemento('div', { id: 'area-toasts', classe: 'toast-container position-fixed bottom-0 end-0 p-3' });
        document.body.append(area);
    }
    const toast = criarElemento('div', {
        classe: `toast align-items-center text-bg-${tipo} border-0`,
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
    }, [
        criarElemento('div', { classe: 'd-flex' }, [
            criarElemento('div', { classe: 'toast-body', texto: mensagem }),
            criarElemento('button', {
                type: 'button',
                classe: 'btn-close btn-close-white me-2 m-auto',
                'data-bs-dismiss': 'toast',
                'aria-label': 'Fechar'
            })
        ])
    ]);
    area.append(toast);
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
    bootstrap.Toast.getOrCreateInstance(toast, { delay: 3000 }).show();
}

async function executarComBotao(botao, funcao) {
    const original = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Aguarde...';
    try {
        return await funcao();
    } finally {
        botao.disabled = false;
        botao.innerHTML = original;
    }
}

async function requisitarApi(caminho, opcoes = {}) {
    const configuracao = { ...opcoes };
    if (configuracao.body) {
        configuracao.headers = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
    }
    try {
        const resposta = await fetch(urlApi(caminho), configuracao);
        let dados = {};
        try {
            dados = (await resposta.json()) || {};
        } catch (erro) {
            dados = {};
        }
        return { ok: resposta.ok, status: resposta.status, dados, erroRede: false };
    } catch (erro) {
        return { ok: false, status: 0, dados: {}, erroRede: true };
    }
}

function textoErro(resposta, regras = {}) {
    if (resposta.erroRede) {
        return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }
    const regra = regras[resposta.status] || {};
    const detalhe = resposta.dados.mensagem || regra.padrao || `Erro inesperado (status ${resposta.status}).`;
    return [detalhe, regra.complemento].filter(Boolean).join(' ');
}

function obterUsuario() {
    const usuario = lerArmazenamento('usuario', null);
    return usuario && typeof usuario === 'object' && usuario.email ? usuario : null;
}

function exigirLogin() {
    const usuario = obterUsuario();
    if (!usuario) {
        window.location.replace('login.html');
        return null;
    }
    return usuario;
}

function fazerLogout() {
    removerArmazenamento('usuario');
    window.location.href = 'index.html';
}

function obterCarrinho() {
    return lerArmazenamento('carrinho', []);
}

function contarItensCarrinho() {
    return obterCarrinho().reduce((total, item) => total + Number(item.quantidade || 0), 0);
}

function adicionarAoCarrinho(id, quantidade = 1) {
    const carrinho = obterCarrinho();
    const existente = carrinho.find(item => String(item.id) === String(id));
    if (existente) existente.quantidade = Number(existente.quantidade) + quantidade;
    else carrinho.push({ id: Number(id), quantidade });
    gravarArmazenamento('carrinho', carrinho);
    atualizarBadgeCarrinho();
}

function atualizarBadgeCarrinho() {
    const badge = document.getElementById('badge-carrinho');
    const icone = document.getElementById('icone-carrinho');
    if (!badge || !icone) return;
    const total = contarItensCarrinho();
    badge.textContent = total;
    badge.hidden = total === 0;
    icone.className = total > 0 ? 'bi bi-cart-check-fill' : 'bi bi-cart3';
}

function salvarProdutosEmCache(produtos) {
    const mapa = new Map(lerArmazenamento('produtos', []).map(produto => [String(produto.id), produto]));
    produtos.forEach(produto => mapa.set(String(produto.id), produto));
    gravarArmazenamento('produtos', Array.from(mapa.values()));
}

function obterFavoritos() {
    return lerArmazenamento('favoritos', []);
}

function ehFavorito(id) {
    return obterFavoritos().some(favorito => String(favorito) === String(id));
}

function alternarFavorito(id) {
    const favoritos = obterFavoritos();
    const jaFavorito = ehFavorito(id);
    const atualizados = jaFavorito
        ? favoritos.filter(favorito => String(favorito) !== String(id))
        : [...favoritos, Number(id)];
    gravarArmazenamento('favoritos', atualizados);
    return !jaFavorito;
}

function obterEnderecos() {
    return lerArmazenamento('enderecos', []);
}

function obterPedidos() {
    return lerArmazenamento('pedidos', []);
}

function descreverEndereco(endereco) {
    return `${endereco.rua}, ${endereco.numero} - ${endereco.cidadeEstado} - CEP ${endereco.cep}`;
}

function montarCabecalho() {
    const alvo = document.getElementById('cabecalho');
    if (!alvo) return;
    const pagina = document.body.dataset.pagina;
    const usuario = obterUsuario();

    const itemMenu = (arquivo, rotulo, identificador) => {
        const ativo = pagina === identificador;
        return `<li class="nav-item"><a class="nav-link${ativo ? ' active' : ''}" href="${arquivo}"${ativo ? ' aria-current="page"' : ''}>${rotulo}</a></li>`;
    };

    const opcoesUsuario = usuario
        ? `<li><a class="dropdown-item" href="dados_pessoais.html"><i class="bi bi-person-lines-fill me-2"></i>Meus Dados</a></li>
           <li><a class="dropdown-item" href="meus_pedidos.html"><i class="bi bi-bag-check me-2"></i>Meus Pedidos</a></li>
           <li><hr class="dropdown-divider"></li>
           <li><button type="button" class="dropdown-item text-danger" id="botao-sair"><i class="bi bi-box-arrow-right me-2"></i>Sair</button></li>`
        : `<li><a class="dropdown-item" href="login.html"><i class="bi bi-box-arrow-in-right me-2"></i>Entrar</a></li>
           <li><a class="dropdown-item" href="novo_usuario.html"><i class="bi bi-person-plus me-2"></i>Cadastrar</a></li>`;

    const rotuloAvatar = usuario
        ? `<span class="d-none d-md-inline ms-2">${escaparHtml(primeiroNome(usuario.nome) || 'Minha conta')}</span>`
        : '';

    alvo.innerHTML = `
        <nav class="navbar navbar-expand-lg barra-topo">
            <div class="container">
                <a class="navbar-brand" href="index.html">
                    <img src="img/logo.png" alt="Instituto Federal de Goiás, Câmpus Formosa" height="52">
                </a>
                <div class="d-flex align-items-center gap-2 order-lg-2">
                    <div class="dropdown">
                        <button class="btn avatar-botao" type="button" id="avatar-menu" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu da conta">
                            <i class="bi bi-person-circle"></i>${rotuloAvatar}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="avatar-menu">
                            ${opcoesUsuario}
                        </ul>
                    </div>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu-principal" aria-controls="menu-principal" aria-expanded="false" aria-label="Abrir menu">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                </div>
                <div class="collapse navbar-collapse" id="menu-principal">
                    <ul class="navbar-nav ms-lg-auto align-items-lg-center gap-lg-2">
                        ${itemMenu('index.html', 'Página Inicial', 'index')}
                        ${itemMenu('produtos.html', 'Produtos', 'produtos')}
                        ${itemMenu('contato.html', 'Contato', 'contato')}
                        <li class="nav-item">
                            <a class="nav-link carrinho-link${pagina === 'carrinho' ? ' active' : ''}" id="link-carrinho" href="carrinho.html" title="Solte um produto aqui para adicioná-lo ao carrinho">
                                <i class="bi bi-cart3" id="icone-carrinho"></i>
                                <span>Carrinho</span>
                                <span class="badge rounded-pill badge-carrinho" id="badge-carrinho" hidden>0</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>`;

    const botaoSair = document.getElementById('botao-sair');
    if (botaoSair) botaoSair.addEventListener('click', fazerLogout);
    configurarAreaDeSoltarCarrinho();
    atualizarBadgeCarrinho();
}

function montarRodape() {
    const alvo = document.getElementById('rodape');
    if (!alvo) return;
    alvo.innerHTML = `
        <div class="container d-flex flex-column flex-md-row justify-content-between gap-2">
            <span>&copy; 2026 MDG Informatica</span>
            <span>Instituto Federal de Goiás - Câmpus Formosa</span>
        </div>`;
}

function configurarAreaDeSoltarCarrinho() {
    const alvo = document.getElementById('link-carrinho');
    if (!alvo) return;
    alvo.addEventListener('dragover', evento => {
        if (!evento.dataTransfer.types.includes('application/x-produto-mdg')) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = 'copy';
        alvo.classList.add('carrinho-alvo');
    });
    alvo.addEventListener('dragleave', () => alvo.classList.remove('carrinho-alvo'));
    alvo.addEventListener('drop', evento => {
        evento.preventDefault();
        alvo.classList.remove('carrinho-alvo');
        const id = evento.dataTransfer.getData('application/x-produto-mdg');
        if (!id) return;
        adicionarAoCarrinho(id);
        alvo.classList.add('carrinho-adicionado');
        setTimeout(() => alvo.classList.remove('carrinho-adicionado'), 600);
        mostrarToast('Produto adicionado ao carrinho.');
    });
}

function iniciarPagina() {
    montarCabecalho();
    montarRodape();
    const inicializadores = {
        produtos: iniciarProdutos,
        novo_usuario: iniciarCadastro,
        login: iniciarLogin,
        carrinho: iniciarCarrinho,
        sucesso_pedido: iniciarSucessoPedido,
        sucesso_contato: iniciarSucessoContato,
        meus_pedidos: iniciarMeusPedidos,
        pedido: iniciarPedido,
        dados_pessoais: iniciarDadosPessoais,
        enderecos: iniciarEnderecos
    };
    const inicializar = inicializadores[document.body.dataset.pagina];
    if (inicializar) inicializar();
}

function iniciarProdutos() {
    // Sem debounce: atualiza a busca a cada alteração no campo.
    document.getElementById('busca-produtos').addEventListener('input', carregarProdutos);
    document.getElementById('categoria-produtos').addEventListener('change', carregarProdutos);
    document.getElementById('formulario-filtros').addEventListener('submit', evento => {
        evento.preventDefault();
        carregarProdutos();
    });
    carregarProdutos();
}

async function carregarProdutos() {
    carregarProdutos.ultima = (carregarProdutos.ultima || 0) + 1;
    const numeroRequisicao = carregarProdutos.ultima;
    const busca = document.getElementById('busca-produtos').value.trim();
    const categoria = document.getElementById('categoria-produtos').value;
    const parametros = new URLSearchParams();
    if (busca) parametros.set('search', busca);
    if (categoria) parametros.set('category', categoria);
    const consulta = parametros.toString();
    const mensagem = document.getElementById('mensagem-produtos');
    const lista = document.getElementById('lista-produtos');

    mensagem.textContent = 'Carregando produtos...';
    const resposta = await requisitarApi(`/api/products${consulta ? `?${consulta}` : ''}`);
    if (numeroRequisicao !== carregarProdutos.ultima) return;
    lista.replaceChildren();

    if (resposta.erroRede) {
        mensagem.textContent = 'Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.';
        return;
    }
    if (resposta.status === 404) {
        mensagem.textContent = 'Nenhum produto encontrado para esse filtro.';
        return;
    }
    if (!resposta.ok) {
        mensagem.textContent = textoErro(resposta);
        return;
    }

    const produtos = Array.isArray(resposta.dados.products) ? resposta.dados.products : [];
    salvarProdutosEmCache(produtos);
    produtos.forEach(produto => lista.append(criarCardProduto(produto)));
    mensagem.textContent = produtos.length
        ? `${produtos.length} ${produtos.length === 1 ? 'produto encontrado' : 'produtos encontrados'}.`
        : 'Nenhum produto encontrado para esse filtro.';
}

function criarCardProduto(produto) {
    const esgotado = Number(produto.stock) <= 0;
    const favorito = ehFavorito(produto.id);

    const imagem = criarElemento('img', {
        classe: 'card-produto-imagem',
        src: urlImagem(produto.image),
        alt: produto.name || 'Produto',
        loading: 'lazy',
        draggable: esgotado ? 'false' : 'true'
    });
    if (!esgotado) {
        imagem.addEventListener('dragstart', evento => {
            const id = evento.target.closest('.card-produto').querySelector('.produto-id').value;
            evento.dataTransfer.setData('application/x-produto-mdg', id);
            evento.dataTransfer.effectAllowed = 'copy';
            evento.target.classList.add('arrastando');
        });
        imagem.addEventListener('dragend', evento => evento.target.classList.remove('arrastando'));
    }

    const botaoFavorito = criarElemento('button', {
        type: 'button',
        classe: 'botao-favorito',
        'aria-pressed': String(favorito),
        'aria-label': favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        title: favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
    }, [criarElemento('i', { classe: `bi ${favorito ? 'bi-heart-fill' : 'bi-heart'}`, 'aria-hidden': 'true' })]);
    botaoFavorito.addEventListener('click', () => aoClicarFavorito(botaoFavorito));

    const botaoAdicionar = criarElemento('button', {
        type: 'button',
        classe: 'btn btn-mdg w-100 mt-auto',
        disabled: esgotado
    }, [
        criarElemento('i', { classe: `bi ${esgotado ? 'bi-slash-circle' : 'bi-cart-plus'} me-2`, 'aria-hidden': 'true' }),
        esgotado ? 'Indisponível' : 'Adicionar ao carrinho'
    ]);
    botaoAdicionar.addEventListener('click', () => aoClicarAdicionar(botaoAdicionar));

    return criarElemento('article', { classe: `card-produto${esgotado ? ' card-esgotado' : ''}` }, [
        criarElemento('div', { classe: 'card-produto-midia' }, [
            imagem,
            botaoFavorito,
            esgotado ? criarElemento('span', { classe: 'selo-esgotado', texto: 'Esgotado' }) : null
        ].filter(Boolean)),
        criarElemento('div', { classe: 'card-produto-corpo' }, [
            criarElemento('span', { classe: 'categoria-produto', texto: produto.category || '' }),
            criarElemento('h3', { classe: 'nome-produto', texto: produto.name || 'Produto sem nome' }),
            criarElemento('p', { classe: 'descricao-produto', texto: produto.description || '' }),
            criarElemento('span', { classe: 'preco-produto', texto: formatarMoeda(produto.price) }),
            criarElemento('span', {
                classe: esgotado ? 'estoque-produto estoque-zerado' : 'estoque-produto',
                texto: esgotado ? 'Produto esgotado' : `Em estoque: ${produto.stock}`
            }),
            criarElemento('input', { type: 'hidden', classe: 'produto-id', value: produto.id }),
            botaoAdicionar
        ])
    ]);
}

function aoClicarAdicionar(botao) {
    const id = botao.closest('.card-produto').querySelector('.produto-id').value;
    adicionarAoCarrinho(id);
    mostrarToast('Produto adicionado ao carrinho.');
}

function aoClicarFavorito(botao) {
    const id = botao.closest('.card-produto').querySelector('.produto-id').value;
    const favorito = alternarFavorito(id);
    botao.setAttribute('aria-pressed', String(favorito));
    botao.setAttribute('aria-label', favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    botao.setAttribute('title', favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    botao.querySelector('i').className = `bi ${favorito ? 'bi-heart-fill' : 'bi-heart'}`;
}

function iniciarCadastro() {
    document.getElementById('formulario-cadastro').addEventListener('submit', enviarCadastro);
}

async function enviarCadastro(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const botao = formulario.querySelector('button[type="submit"]');
    const corpo = {
        nome: formulario.elements.nome.value.trim(),
        email: formulario.elements.email.value.trim(),
        senha: formulario.elements.senha.value,
        confirmacaoSenha: formulario.elements.confirmacaoSenha.value
    };

    limparAlerta();
    const resposta = await executarComBotao(botao, () =>
        requisitarApi('/api/register', { method: 'POST', body: JSON.stringify(corpo) })
    );

    if (resposta.status === 201) {
        mostrarAlerta(`${resposta.dados.mensagem || 'Usuário registrado com sucesso.'} Redirecionando para o login...`, 'success');
        botao.disabled = true;
        setTimeout(() => { window.location.href = 'login.html'; }, 1800);
        return;
    }

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'Verifique os dados informados.' },
        409: { padrao: 'Este e-mail já está cadastrado.', complemento: 'Faça login ou use outro e-mail.' },
        422: { padrao: 'A senha deve ter no mínimo 6 caracteres.' }
    }));
}

function iniciarLogin() {
    document.getElementById('formulario-login').addEventListener('submit', enviarLogin);
}

async function enviarLogin(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const botao = formulario.querySelector('button[type="submit"]');
    const corpo = {
        email: formulario.elements.email.value.trim(),
        senha: formulario.elements.senha.value
    };

    limparAlerta();

    // Remove uma sessão anterior antes de tentar autenticar novamente.
    // Assim, um login inválido não mantém o usuário antigo como se tivesse entrado.
    removerArmazenamento('usuario');

    const resposta = await executarComBotao(botao, () =>
        requisitarApi('/api/login', { method: 'POST', body: JSON.stringify(corpo) })
    );

    // Só considera o login válido quando a API confirma HTTP 200
    // e retorna um objeto de usuário com e-mail.
    const usuarioAutenticado = resposta.dados &&
        resposta.dados.usuario &&
        typeof resposta.dados.usuario === 'object' &&
        resposta.dados.usuario.email;

    if (resposta.ok && resposta.status === 200 && usuarioAutenticado) {
        gravarArmazenamento('usuario', resposta.dados.usuario);
        window.location.href = 'index.html';
        return;
    }

    // Garante que respostas de erro ou respostas inesperadas não deixem sessão salva.
    removerArmazenamento('usuario');

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'Informe e-mail e senha.' },
        401: { padrao: 'Usuário ou senha inválidos.', complemento: 'Confira os dados e tente novamente.' }
    }));
}

function estadoCarrinho() {
    if (!estadoCarrinho.dados) {
        estadoCarrinho.dados = { produtos: [], fretes: [], frete: null, cepFrete: '', cupom: null };
    }
    return estadoCarrinho.dados;
}

function buscarProdutoPorId(id) {
    const estado = estadoCarrinho();
    const procurar = lista => lista.find(produto => String(produto.id) === String(id));
    return procurar(estado.produtos) || procurar(lerArmazenamento('produtos', []));
}

async function iniciarCarrinho() {
    const estado = estadoCarrinho();
    estado.produtos = lerArmazenamento('produtos', []);

    configurarEntregaCarrinho();
    configurarCupomCarrinho();
    configurarPagamentoCarrinho();
    renderizarCarrinho();

    const resposta = await requisitarApi('/api/products');
    if (resposta.ok && Array.isArray(resposta.dados.products)) {
        estado.produtos = resposta.dados.products;
        salvarProdutosEmCache(resposta.dados.products);
        renderizarCarrinho();
    }
}

function configurarEntregaCarrinho() {
    const campoCep = document.getElementById('cep-entrega');
    const seletor = document.getElementById('endereco-entrega');
    const enderecos = obterEnderecos();

    enderecos.forEach(endereco => {
        seletor.append(criarElemento('option', { value: endereco.id, texto: descreverEndereco(endereco) }));
    });
    document.getElementById('dica-enderecos').hidden = enderecos.length > 0;

    seletor.addEventListener('change', () => {
        const endereco = enderecos.find(item => String(item.id) === seletor.value);
        if (endereco) {
            campoCep.value = endereco.cep;
            invalidarFreteSeCepMudou();
        }
    });
    campoCep.addEventListener('input', () => {
        aplicarMascaraCep(campoCep);
        invalidarFreteSeCepMudou();
    });
    document.getElementById('botao-calcular-frete').addEventListener('click', evento =>
        executarComBotao(evento.currentTarget, calcularFrete)
    );
}

function invalidarFreteSeCepMudou() {
    const estado = estadoCarrinho();
    const cepAtual = document.getElementById('cep-entrega').value.trim();
    if (estado.fretes.length && cepAtual !== estado.cepFrete) {
        estado.fretes = [];
        estado.frete = null;
        renderizarOpcoesFrete();
        atualizarResumo();
    }
}

async function calcularFrete() {
    const estado = estadoCarrinho();
    const cep = document.getElementById('cep-entrega').value.trim();
    limparAlerta('alerta-frete');

    const resposta = await requisitarApi('/api/frete', { method: 'POST', body: JSON.stringify({ cep }) });
    estado.frete = null;

    if (resposta.status === 200 && Array.isArray(resposta.dados.fretes)) {
        estado.fretes = resposta.dados.fretes;
        estado.cepFrete = cep;
        renderizarOpcoesFrete();
        atualizarResumo();
        return;
    }

    estado.fretes = [];
    estado.cepFrete = '';
    renderizarOpcoesFrete();
    atualizarResumo();
    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'CEP inválido. Formato esperado: 99999-999.' },
        404: { padrao: 'CEP não encontrado na base de dados.', complemento: 'Confira o número digitado.' },
        422: { padrao: 'Não realizamos entregas para esta região.', complemento: 'Tente outro CEP.' }
    }), 'danger', 'alerta-frete');
}

function renderizarOpcoesFrete() {
    const estado = estadoCarrinho();
    const container = document.getElementById('opcoes-frete');
    container.replaceChildren();

    estado.fretes.forEach((frete, indice) => {
        const identificador = `frete-${indice}`;
        const radio = criarElemento('input', {
            type: 'radio',
            classe: 'form-check-input',
            name: 'frete',
            id: identificador,
            value: indice
        });
        radio.addEventListener('change', () => {
            estado.frete = estado.fretes[indice];
            atualizarResumo();
        });
        container.append(
            criarElemento('label', { classe: 'opcao-selecionavel', for: identificador }, [
                radio,
                criarElemento('span', { classe: 'opcao-texto' }, [
                    criarElemento('strong', { texto: frete.servico }),
                    criarElemento('small', { texto: frete.prazo })
                ]),
                criarElemento('span', { classe: 'opcao-valor', texto: formatarMoeda(frete.valor) })
            ])
        );
    });
}

function configurarCupomCarrinho() {
    document.getElementById('botao-aplicar-cupom').addEventListener('click', evento =>
        executarComBotao(evento.currentTarget, aplicarCupom)
    );
    document.getElementById('campo-cupom').addEventListener('keydown', evento => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            document.getElementById('botao-aplicar-cupom').click();
        }
    });
    document.getElementById('botao-remover-cupom').addEventListener('click', () => {
        estadoCarrinho().cupom = null;
        limparAlerta('alerta-cupom');
        renderizarCupomAplicado();
        atualizarResumo();
    });
}

async function aplicarCupom() {
    const estado = estadoCarrinho();
    const codigo = document.getElementById('campo-cupom').value.trim();
    const subtotal = calcularTotais().subtotal;
    limparAlerta('alerta-cupom');

    const resposta = await requisitarApi('/api/cupom', {
        method: 'POST',
        body: JSON.stringify({ codigo, subtotal })
    });

    if (resposta.status === 200 && resposta.dados.cupom) {
        estado.cupom = resposta.dados.cupom;
        document.getElementById('campo-cupom').value = '';
        renderizarCupomAplicado();
        atualizarResumo();
        mostrarAlerta(resposta.dados.mensagem || 'Cupom aplicado com sucesso.', 'success', 'alerta-cupom');
        return;
    }

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'Informe o código do cupom.' },
        404: { padrao: 'Cupom inválido ou não encontrado.', complemento: 'Confira o código digitado.' },
        410: { padrao: 'Este cupom já expirou.' },
        422: { padrao: 'Este cupom exige uma compra maior.', complemento: 'Adicione mais itens ao carrinho.' }
    }), 'danger', 'alerta-cupom');
}

async function revalidarCupom() {
    const estado = estadoCarrinho();
    if (!estado.cupom) return;
    const codigo = estado.cupom.codigo;
    const resposta = await requisitarApi('/api/cupom', {
        method: 'POST',
        body: JSON.stringify({ codigo, subtotal: calcularTotais().subtotal })
    });
    if (resposta.status === 200 && resposta.dados.cupom) {
        estado.cupom = resposta.dados.cupom;
    } else if (!resposta.erroRede) {
        estado.cupom = null;
        mostrarAlerta(`O cupom ${codigo} foi removido. ${textoErro(resposta)}`, 'warning', 'alerta-cupom');
    }
    renderizarCupomAplicado();
    atualizarResumo();
}

function descreverCupom(cupom) {
    if (cupom.tipo === 'percentual') return `${cupom.desconto}% de desconto nos produtos`;
    if (cupom.tipo === 'frete_gratis') return 'Frete grátis';
    if (cupom.tipo === 'fixo') return `${formatarMoeda(cupom.desconto)} de desconto`;
    return 'Desconto aplicado';
}

function renderizarCupomAplicado() {
    const cupom = estadoCarrinho().cupom;
    const area = document.getElementById('cupom-aplicado');
    area.hidden = !cupom;
    if (cupom) {
        document.getElementById('cupom-aplicado-texto').textContent = `${cupom.codigo}: ${descreverCupom(cupom)}`;
    }
}

function configurarPagamentoCarrinho() {
    const radios = document.querySelectorAll('input[name="pagamento"]');
    const areaCartao = document.getElementById('area-cartao');
    const campoCartao = document.getElementById('numero-cartao');
    radios.forEach(radio => radio.addEventListener('change', () => {
        const cartao = document.querySelector('input[name="pagamento"]:checked').value === 'cartao';
        areaCartao.hidden = !cartao;
        if (cartao) campoCartao.focus();
    }));
    campoCartao.addEventListener('input', () => {
        campoCartao.value = somenteDigitos(campoCartao.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
    });
    document.getElementById('botao-finalizar').addEventListener('click', evento =>
        executarComBotao(evento.currentTarget, finalizarPedido)
    );
}

function calcularTotais() {
    const estado = estadoCarrinho();
    const subtotal = obterCarrinho().reduce((soma, item) => {
        const produto = buscarProdutoPorId(item.id);
        return soma + (produto ? Number(produto.price) * Number(item.quantidade) : 0);
    }, 0);
    const frete = estado.frete ? Number(estado.frete.valor) : 0;
    const cupom = estado.cupom;
    let descontoProdutos = 0;
    let descontoFrete = 0;

    if (cupom && cupom.tipo === 'percentual') descontoProdutos = subtotal * (Number(cupom.desconto) / 100);
    if (cupom && cupom.tipo === 'fixo') descontoProdutos = Math.min(Number(cupom.desconto), subtotal);
    if (cupom && cupom.tipo === 'frete_gratis') descontoFrete = frete * (Number(cupom.desconto) / 100);

    return {
        subtotal: arredondar(subtotal),
        frete: arredondar(frete),
        descontoProdutos: arredondar(descontoProdutos),
        descontoFrete: arredondar(descontoFrete),
        total: arredondar(subtotal - descontoProdutos + frete - descontoFrete)
    };
}

function renderizarCarrinho() {
    const carrinho = obterCarrinho();
    const lista = document.getElementById('lista-carrinho');
    lista.replaceChildren();

    if (!carrinho.length) {
        lista.append(
            criarElemento('div', { classe: 'estado-vazio' }, [
                criarElemento('i', { classe: 'bi bi-cart-x', 'aria-hidden': 'true' }),
                criarElemento('h2', { texto: 'Seu carrinho está vazio' }),
                criarElemento('p', { texto: 'Escolha produtos na lista para continuar sua compra.' }),
                criarElemento('a', { classe: 'btn btn-mdg', href: 'produtos.html', texto: 'Ver produtos' })
            ])
        );
    } else {
        carrinho.forEach((item, indice) => lista.append(criarItemCarrinho(item, indice)));
    }
    atualizarResumo();
    atualizarBadgeCarrinho();
}

function criarItemCarrinho(item, indice) {
    const produto = buscarProdutoPorId(item.id);
    const nome = produto ? produto.name : `Produto ${item.id}`;
    const preco = produto ? Number(produto.price) : 0;
    const subtotal = preco * Number(item.quantidade);

    const campoQuantidade = criarElemento('input', {
        type: 'number',
        classe: 'form-control form-control-sm campo-quantidade',
        min: 1,
        value: item.quantidade,
        'aria-label': `Quantidade de ${nome}`
    });
    campoQuantidade.addEventListener('change', () => alterarQuantidade(indice, campoQuantidade.value));

    const botaoRemover = criarElemento('button', {
        type: 'button',
        classe: 'btn btn-link btn-sm text-danger p-0',
        'aria-label': `Remover ${nome}`
    }, [criarElemento('i', { classe: 'bi bi-trash me-1', 'aria-hidden': 'true' }), 'Remover']);
    botaoRemover.addEventListener('click', () => removerItem(indice));

    return criarElemento('div', { classe: 'item-carrinho' }, [
        criarElemento('img', {
            classe: 'item-carrinho-imagem',
            src: produto ? urlImagem(produto.image) : 'img/logo.png',
            alt: nome
        }),
        criarElemento('div', { classe: 'item-carrinho-info' }, [
            criarElemento('h2', { texto: nome }),
            criarElemento('p', {
                texto: produto
                    ? `${produto.category} - ${formatarMoeda(preco)} cada`
                    : 'Este produto não foi encontrado no catálogo.'
            })
        ]),
        criarElemento('div', { classe: 'item-carrinho-quantidade' }, [
            criarElemento('label', { classe: 'form-label small mb-1', texto: 'Quantidade' }),
            campoQuantidade
        ]),
        criarElemento('div', { classe: 'item-carrinho-valor' }, [
            criarElemento('strong', { texto: formatarMoeda(subtotal) }),
            botaoRemover
        ])
    ]);
}

function alterarQuantidade(indice, valor) {
    const carrinho = obterCarrinho();
    const quantidade = parseInt(valor, 10);
    if (!carrinho[indice]) return;
    if (quantidade > 0) {
        carrinho[indice].quantidade = quantidade;
        gravarArmazenamento('carrinho', carrinho);
    }
    renderizarCarrinho();
    revalidarCupom();
}

function removerItem(indice) {
    const carrinho = obterCarrinho();
    carrinho.splice(indice, 1);
    gravarArmazenamento('carrinho', carrinho);
    renderizarCarrinho();
    revalidarCupom();
}

function atualizarResumo() {
    const estado = estadoCarrinho();
    const totais = calcularTotais();
    const totalItens = contarItensCarrinho();

    document.getElementById('resumo-quantidade').textContent =
        `${totalItens} ${totalItens === 1 ? 'produto' : 'produtos'}`;
    document.getElementById('resumo-subtotal').textContent = formatarMoeda(totais.subtotal);

    const linhaFrete = document.getElementById('resumo-frete');
    if (!estado.frete) linhaFrete.textContent = 'A calcular';
    else if (totais.descontoFrete > 0 && totais.descontoFrete >= totais.frete) linhaFrete.textContent = 'Grátis';
    else linhaFrete.textContent = formatarMoeda(totais.frete);

    const linhaDesconto = document.getElementById('linha-desconto');
    const descontoTotal = arredondar(totais.descontoProdutos + (totais.descontoFrete < totais.frete ? totais.descontoFrete : 0));
    linhaDesconto.hidden = !(estado.cupom && descontoTotal > 0);
    if (!linhaDesconto.hidden) {
        document.getElementById('resumo-desconto-rotulo').textContent = `Desconto (${estado.cupom.codigo})`;
        document.getElementById('resumo-desconto').textContent = `- ${formatarMoeda(descontoTotal)}`;
    }

    document.getElementById('resumo-total').textContent = formatarMoeda(totais.total);
    document.getElementById('resumo-parcelas').textContent =
        `Em até 10x sem juros de ${formatarMoeda(totais.total / 10)}`;
}

async function finalizarPedido() {
    // A compra só pode ser concluída quando houver um usuário autenticado.
    // A verificação acontece antes de qualquer chamada ao endpoint de checkout.
    const usuario = exigirLogin();
    if (!usuario) return;

    const estado = estadoCarrinho();
    const carrinho = obterCarrinho();
    const cep = document.getElementById('cep-entrega').value.trim();
    const selecionado = document.querySelector('input[name="pagamento"]:checked');
    const metodoPagamento = selecionado ? selecionado.value : '';
    const corpo = {
        itens: carrinho.map(item => ({ id: Number(item.id), quantidade: Number(item.quantidade) })),
        cep,
        metodoPagamento
    };
    if (metodoPagamento === 'cartao') corpo.numeroCartao = somenteDigitos(document.getElementById('numero-cartao').value);

    limparAlerta('alerta-checkout');
    const resposta = await requisitarApi('/api/checkout', { method: 'POST', body: JSON.stringify(corpo) });

    if (resposta.status === 201 && resposta.dados.pedido) {
        const totais = calcularTotais();
        const idEndereco = document.getElementById('endereco-entrega').value;
        const endereco = obterEnderecos().find(item => String(item.id) === idEndereco) || null;
        const pedido = {
            ...resposta.dados.pedido,
            valorFinal: totais.total,
            valorFrete: totais.frete,
            descontoProdutos: totais.descontoProdutos,
            descontoFrete: totais.descontoFrete,
            freteServico: estado.frete ? estado.frete.servico : null,
            cupom: estado.cupom ? estado.cupom.codigo : null,
            endereco,
            data: new Date().toISOString(),
            itens: carrinho.map(item => {
                const produto = buscarProdutoPorId(item.id);
                return {
                    id: item.id,
                    nome: produto ? produto.name : `Produto ${item.id}`,
                    preco: produto ? Number(produto.price) : 0,
                    imagem: produto ? produto.image : '',
                    quantidade: Number(item.quantidade)
                };
            })
        };
        gravarArmazenamento('pedidos', [pedido, ...obterPedidos()]);
        removerArmazenamento('carrinho');
        window.location.href = 'sucesso-pedido.html';
        return;
    }

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'Não foi possível processar o pedido. Revise o carrinho, o CEP e a forma de pagamento.' },
        402: { padrao: 'Pagamento recusado pela operadora do cartão.', complemento: 'Use outro cartão ou outra forma de pagamento.' },
        404: { padrao: 'Um dos produtos do carrinho não existe mais.', complemento: 'Remova-o do carrinho e tente novamente.' },
        422: { padrao: 'Estoque insuficiente para um dos itens.', complemento: 'Ajuste a quantidade no carrinho.' }
    }), 'danger', 'alerta-checkout');
}

function iniciarSucessoPedido() {
    const pedido = obterPedidos()[0];
    const area = document.getElementById('dados-pedido');
    if (!pedido) {
        area.hidden = true;
        return;
    }
    document.getElementById('protocolo-pedido').textContent = pedido.protocolo;
    document.getElementById('link-detalhes-pedido').href = `pedido.html?id=${encodeURIComponent(pedido.protocolo)}`;
}

function iniciarSucessoContato() {
    const nome = new URLSearchParams(window.location.search).get('nome');
    const saudacao = document.getElementById('saudacao-contato');
    if (nome && saudacao) saudacao.textContent = `Obrigado, ${primeiroNome(nome)}!`;
}

function iniciarMeusPedidos() {
    if (!exigirLogin()) return;
    renderizarPedidos();
    document.querySelectorAll('[data-protocolo-teste]').forEach(botao => {
        botao.addEventListener('click', () => cancelarPedido(botao.dataset.protocoloTeste));
    });
}

function classeStatusPedido(status) {
    const valor = String(status || '').toLowerCase();
    if (valor === 'cancelado') return 'status-cancelado';
    if (valor === 'enviado') return 'status-enviado';
    return 'status-aprovado';
}

function renderizarPedidos() {
    const pedidos = obterPedidos();
    const lista = document.getElementById('lista-pedidos');
    lista.replaceChildren();

    if (!pedidos.length) {
        lista.append(
            criarElemento('div', { classe: 'estado-vazio' }, [
                criarElemento('i', { classe: 'bi bi-bag', 'aria-hidden': 'true' }),
                criarElemento('h2', { texto: 'Você ainda não fez nenhum pedido' }),
                criarElemento('p', { texto: 'Quando você finalizar uma compra, ela aparecerá aqui.' }),
                criarElemento('a', { classe: 'btn btn-mdg', href: 'produtos.html', texto: 'Ver produtos' })
            ])
        );
        return;
    }
    pedidos.forEach(pedido => lista.append(criarCardPedido(pedido)));
}

function criarCardPedido(pedido) {
    const cancelado = String(pedido.status).toLowerCase() === 'cancelado';
    const valor = pedido.valorFinal ?? pedido.valorProdutos;

    const botaoCancelar = criarElemento('button', {
        type: 'button',
        classe: 'btn btn-outline-danger',
        disabled: cancelado
    }, [criarElemento('i', { classe: 'bi bi-x-circle me-2', 'aria-hidden': 'true' }), 'Cancelar Pedido']);
    botaoCancelar.addEventListener('click', () => {
        if (window.confirm(`Deseja realmente cancelar o pedido ${pedido.protocolo}?`)) {
            executarComBotao(botaoCancelar, () => cancelarPedido(pedido.protocolo));
        }
    });

    return criarElemento('article', { classe: 'painel cartao-pedido' }, [
        criarElemento('div', { classe: 'cartao-pedido-topo' }, [
            criarElemento('div', {}, [
                criarElemento('h2', { texto: pedido.protocolo }),
                criarElemento('small', { classe: 'text-muted', texto: formatarData(pedido.data) })
            ]),
            criarElemento('span', {
                classe: `status-pedido ${classeStatusPedido(pedido.status)}`,
                texto: capitalizar(pedido.status)
            })
        ]),
        criarElemento('dl', { classe: 'dados-pedido' }, [
            criarElemento('div', {}, [criarElemento('dt', { texto: 'Itens' }), criarElemento('dd', { texto: String(pedido.totalItens) })]),
            criarElemento('div', {}, [criarElemento('dt', { texto: 'Pagamento' }), criarElemento('dd', { texto: nomeMetodoPagamento(pedido.metodoPagamento) })]),
            criarElemento('div', {}, [criarElemento('dt', { texto: 'CEP' }), criarElemento('dd', { texto: pedido.cep })]),
            criarElemento('div', {}, [criarElemento('dt', { texto: 'Total' }), criarElemento('dd', { classe: 'fw-bold', texto: formatarMoeda(valor) })])
        ]),
        criarElemento('div', { classe: 'd-flex flex-wrap gap-2' }, [
            criarElemento('a', { classe: 'btn btn-mdg', href: `pedido.html?id=${encodeURIComponent(pedido.protocolo)}` }, [
                criarElemento('i', { classe: 'bi bi-receipt me-2', 'aria-hidden': 'true' }),
                'Visualizar Detalhes do Pedido'
            ]),
            botaoCancelar
        ])
    ]);
}

async function cancelarPedido(protocolo) {
    limparAlerta();
    const resposta = await requisitarApi(`/api/pedido?protocolo=${encodeURIComponent(protocolo)}`, { method: 'DELETE' });

    if (resposta.status === 200) {
        const pedidos = obterPedidos().map(pedido =>
            pedido.protocolo === protocolo ? { ...pedido, status: 'cancelado' } : pedido
        );
        gravarArmazenamento('pedidos', pedidos);
        renderizarPedidos();
        mostrarAlerta(resposta.dados.mensagem || 'Pedido cancelado com sucesso.', 'success');
        return;
    }

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'O protocolo do pedido é obrigatório.' },
        404: { padrao: 'Pedido não encontrado.' },
        422: { padrao: 'Este pedido não pode mais ser cancelado.', complemento: 'Ele já foi enviado para a transportadora.' }
    }));
}

function iniciarPedido() {
    const protocolo = new URLSearchParams(window.location.search).get('id');
    const pedido = obterPedidos().find(item => item.protocolo === protocolo);
    const conteudo = document.getElementById('conteudo-pedido');
    conteudo.replaceChildren();

    if (!pedido) {
        conteudo.append(
            criarElemento('div', { classe: 'estado-vazio' }, [
                criarElemento('i', { classe: 'bi bi-search', 'aria-hidden': 'true' }),
                criarElemento('h2', { texto: 'Pedido não encontrado' }),
                criarElemento('p', { texto: 'Não encontramos um pedido com este protocolo neste navegador.' }),
                criarElemento('a', { classe: 'btn btn-mdg', href: 'meus_pedidos.html', texto: 'Voltar para Meus Pedidos' })
            ])
        );
        return;
    }

    const linha = (rotulo, valor, destaque) => criarElemento('div', { classe: `linha-resumo${destaque ? ' linha-total' : ''}` }, [
        criarElemento('span', { texto: rotulo }),
        criarElemento('span', { texto: valor })
    ]);

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const valorFinal = pedido.valorFinal ?? pedido.valorProdutos;
    const descontoTotal = arredondar((pedido.descontoProdutos || 0) + (pedido.descontoFrete || 0));

    const blocoEndereco = pedido.endereco
        ? criarElemento('p', { classe: 'mb-0', texto: descreverEndereco(pedido.endereco) })
        : criarElemento('p', { classe: 'mb-0 text-muted', texto: `Nenhum endereço salvo foi escolhido. CEP de entrega: ${pedido.cep}.` });

    conteudo.append(
        criarElemento('div', { classe: 'painel mb-4' }, [
            criarElemento('div', { classe: 'cartao-pedido-topo' }, [
                criarElemento('div', {}, [
                    criarElemento('h2', { classe: 'h4 mb-1', texto: pedido.protocolo }),
                    criarElemento('small', { classe: 'text-muted', texto: formatarData(pedido.data) })
                ]),
                criarElemento('span', {
                    classe: `status-pedido ${classeStatusPedido(pedido.status)}`,
                    texto: capitalizar(pedido.status)
                })
            ]),
            criarElemento('dl', { classe: 'dados-pedido' }, [
                criarElemento('div', {}, [criarElemento('dt', { texto: 'Itens' }), criarElemento('dd', { texto: String(pedido.totalItens) })]),
                criarElemento('div', {}, [criarElemento('dt', { texto: 'Pagamento' }), criarElemento('dd', { texto: nomeMetodoPagamento(pedido.metodoPagamento) })]),
                criarElemento('div', {}, [criarElemento('dt', { texto: 'CEP' }), criarElemento('dd', { texto: pedido.cep })])
            ])
        ]),
        criarElemento('div', { classe: 'painel mb-4' }, [
            criarElemento('h2', { classe: 'h5 mb-3', texto: 'Endereço de entrega' }),
            blocoEndereco
        ]),
        criarElemento('div', { classe: 'painel mb-4' }, [
            criarElemento('h2', { classe: 'h5 mb-3', texto: 'Produtos' }),
            itens.length
                ? criarElemento('div', {}, itens.map(item => criarElemento('div', { classe: 'item-carrinho item-pedido' }, [
                    criarElemento('img', { classe: 'item-carrinho-imagem', src: urlImagem(item.imagem), alt: item.nome }),
                    criarElemento('div', { classe: 'item-carrinho-info' }, [
                        criarElemento('h3', { classe: 'h6 mb-1', texto: item.nome }),
                        criarElemento('p', { texto: `${item.quantidade} x ${formatarMoeda(item.preco)}` })
                    ]),
                    criarElemento('strong', { texto: formatarMoeda(item.preco * item.quantidade) })
                ])))
                : criarElemento('p', { classe: 'mb-0 text-muted', texto: 'Os detalhes dos produtos não estão disponíveis para este pedido.' })
        ]),
        criarElemento('div', { classe: 'painel mb-4' }, [
            criarElemento('h2', { classe: 'h5 mb-3', texto: 'Valores' }),
            linha('Produtos', formatarMoeda(pedido.valorProdutos)),
            linha(pedido.freteServico ? `Frete (${pedido.freteServico})` : 'Frete', pedido.valorFrete !== undefined ? formatarMoeda(pedido.valorFrete) : 'Não informado'),
            descontoTotal > 0 ? linha(`Desconto${pedido.cupom ? ` (${pedido.cupom})` : ''}`, `- ${formatarMoeda(descontoTotal)}`) : '',
            linha('Total', formatarMoeda(valorFinal), true)
        ].filter(Boolean)),
        criarElemento('a', { classe: 'btn btn-outline-secondary', href: 'meus_pedidos.html' }, [
            criarElemento('i', { classe: 'bi bi-arrow-left me-2', 'aria-hidden': 'true' }),
            'Voltar para Meus Pedidos'
        ])
    );
}

function coletarCampos(nomes, formulario) {
    return Object.fromEntries(nomes.map(nome => [nome, formulario.elements[nome].value.trim()]));
}

function mesclar(base) {
    return novos => ({ ...base, ...novos });
}

function gravarUsuario(usuario) {
    gravarArmazenamento('usuario', usuario);
    return usuario;
}

function iniciarDadosPessoais() {
    const usuario = exigirLogin();
    if (!usuario) return;
    const formulario = document.getElementById('formulario-dados');
    ['nome', 'email'].forEach(campo => { formulario.elements[campo].value = usuario[campo] || ''; });
    formulario.addEventListener('submit', enviarDadosPessoais);
}

async function enviarDadosPessoais(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const botao = formulario.querySelector('button[type="submit"]');
    const dados = coletarCampos(['nome', 'email'], formulario);

    limparAlerta();
    const resposta = await executarComBotao(botao, () =>
        requisitarApi('/api/user', { method: 'PUT', body: JSON.stringify(dados) })
    );

    if (resposta.status === 200) {
        const atualizarUsuario = compor(gravarUsuario, mesclar(obterUsuario() || {}));
        const usuario = atualizarUsuario(resposta.dados.dados || dados);
        ['nome', 'email'].forEach(campo => { formulario.elements[campo].value = usuario[campo]; });
        montarCabecalho();
        mostrarAlerta(resposta.dados.mensagem || 'Dados alterados com sucesso.', 'success');
        return;
    }

    mostrarAlerta(textoErro(resposta, {
        400: { padrao: 'Informe nome e e-mail válidos.' },
        409: { padrao: 'Este e-mail já está em uso por outro usuário.', complemento: 'Use outro e-mail.' }
    }));
}

function iniciarEnderecos() {
    renderizarEnderecos();
    const campoCep = document.getElementById('endereco-cep');
    campoCep.addEventListener('input', () => {
        aplicarMascaraCep(campoCep);
        if (campoCep.value.length === 9) buscarEnderecoPorCep(campoCep.value);
        else definirStatusCep('', '');
    });
    document.getElementById('formulario-endereco').addEventListener('submit', salvarEndereco);
    document.getElementById('modal-endereco').addEventListener('hidden.bs.modal', limparFormularioEndereco);
}

function renderizarEnderecos() {
    const enderecos = obterEnderecos();
    const lista = document.getElementById('lista-enderecos');
    lista.replaceChildren();

    if (!enderecos.length) {
        lista.append(
            criarElemento('div', { classe: 'estado-vazio' }, [
                criarElemento('i', { classe: 'bi bi-geo-alt', 'aria-hidden': 'true' }),
                criarElemento('h2', { texto: 'Nenhum endereço cadastrado' }),
                criarElemento('p', { texto: 'Cadastre um endereço para escolhê-lo na finalização do pedido.' })
            ])
        );
        return;
    }
    enderecos.forEach(endereco => lista.append(criarCardEndereco(endereco)));
}

function criarCardEndereco(endereco) {
    const botaoExcluir = criarElemento('button', { type: 'button', classe: 'btn btn-outline-danger btn-sm' }, [
        criarElemento('i', { classe: 'bi bi-trash me-2', 'aria-hidden': 'true' }),
        'Excluir Endereço'
    ]);
    botaoExcluir.addEventListener('click', () => {
        const id = botaoExcluir.closest('.cartao-endereco').querySelector('.endereco-id').value;
        excluirEndereco(id);
    });

    return criarElemento('article', { classe: 'painel cartao-endereco' }, [
        criarElemento('i', { classe: 'bi bi-geo-alt-fill icone-endereco', 'aria-hidden': 'true' }),
        criarElemento('div', { classe: 'flex-grow-1' }, [
            criarElemento('h2', { classe: 'h6 mb-1', texto: `${endereco.rua}, ${endereco.numero}` }),
            criarElemento('p', { classe: 'mb-0 text-muted', texto: `${endereco.cidadeEstado} - CEP ${endereco.cep}` })
        ]),
        criarElemento('input', { type: 'hidden', classe: 'endereco-id', value: endereco.id }),
        botaoExcluir
    ]);
}

function excluirEndereco(id) {
    if (!window.confirm('Deseja realmente excluir este endereço?')) return;
    gravarArmazenamento('enderecos', obterEnderecos().filter(endereco => String(endereco.id) !== String(id)));
    renderizarEnderecos();
    mostrarToast('Endereço excluído.');
}

function salvarEndereco(evento) {
    evento.preventDefault();
    const formulario = evento.target;
    const campos = coletarCampos(['cep', 'rua', 'numero', 'cidadeEstado'], formulario);
    const endereco = { id: Date.now(), ...campos };
    gravarArmazenamento('enderecos', [...obterEnderecos(), endereco]);
    bootstrap.Modal.getInstance(document.getElementById('modal-endereco')).hide();
    renderizarEnderecos();
    mostrarToast('Endereço cadastrado com sucesso.');
}

function limparFormularioEndereco() {
    document.getElementById('formulario-endereco').reset();
    definirStatusCep('', '');
}

function definirStatusCep(texto, classe) {
    const status = document.getElementById('status-cep');
    status.className = `form-text ${classe}`.trim();
    status.textContent = texto;
}

async function buscarEnderecoPorCep(cep) {
    const digitos = somenteDigitos(cep);
    definirStatusCep('Buscando endereço...', 'text-muted');
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
        if (!resposta.ok) {
            definirStatusCep('CEP em formato inválido. Preencha o endereço manualmente.', 'text-danger');
            return;
        }
        const dados = await resposta.json();
        if (somenteDigitos(document.getElementById('endereco-cep').value) !== digitos) return;
        if (dados.erro) {
            definirStatusCep('CEP não encontrado. Preencha o endereço manualmente.', 'text-danger');
            return;
        }
        if (dados.logradouro) document.getElementById('endereco-rua').value = dados.logradouro;
        if (dados.localidade) document.getElementById('endereco-cidade').value = `${dados.localidade}/${dados.uf}`;
        definirStatusCep('Endereço preenchido automaticamente. Informe o número.', 'text-success');
        document.getElementById('endereco-numero').focus();
    } catch (erro) {
        definirStatusCep('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.', 'text-danger');
    }
}

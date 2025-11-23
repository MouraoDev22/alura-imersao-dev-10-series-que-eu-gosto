let dados = [];
const body = document.body;

// Função para remover acentos e converter para minúsculas
const normalizeText = (text) => {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

async function carregarDados() {
    let resposta = await fetch ("data.json");
    dados = await resposta.json ();
    renderizarArtigos(dados);
}

function renderizarArtigos(dadosParaRenderizar) {
    const main = document.querySelector('main');
    main.innerHTML = ''; // Limpa o conteúdo atual

    dadosParaRenderizar.forEach(item => {
        const article = document.createElement('article');

        // Adiciona um ID único baseado no título para facilitar a busca
        article.id = normalizeText(item.titulo).replace(/\s+/g, '-');

        // Lógica para o Easter Egg do Pennywise
        let sinopseHTML = item.sinopse;
        if (item.titulo.includes("IT: Welcome to Derry")) {
            sinopseHTML = sinopseHTML.replace(
                /Pennywise/g,
                '<span id="pennywise-trigger" class="easter-egg-trigger">Pennywise</span>'
            );
        }

        article.innerHTML = `
            <button class="close-article-btn" aria-label="Fechar artigo">&times;</button>
            <img src="${item.poster}" alt="${item.alt}" class="article-poster" loading="lazy">
            <div class="article-content">
                <h2>${item.titulo}</h2>
                <p>
                    <strong>Gêneros:</strong> ${item.generos.join(', ')}
                </p>
                <p>
                    <strong>Sinopse:</strong> ${sinopseHTML}
                </p>
                <div class="article-video-container">
                    <h3>Abertura:</h3>
                    <div class="video-wrapper">
                        <iframe src="${item.video}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        `;
        main.appendChild(article);
    });

    // Re-inicializa todos os event listeners para os novos artigos
    inicializarArtigos();
}

function buscarArtigos() {
    const termoBusca = normalizeText(document.querySelector('.search-container input').value);
    
    document.querySelectorAll('main article').forEach(article => {
        const titulo = normalizeText(article.querySelector('h2').textContent);
        const sinopse = normalizeText(article.querySelector('p:nth-of-type(2)').textContent);

        if (titulo.includes(termoBusca) || sinopse.includes(termoBusca)) {
            article.classList.remove('hidden-by-search');
        } else {
            article.classList.add('hidden-by-search');
        }
    });
    atualizarVisibilidadeArtigos();
}

// Função central para garantir que os filtros e a busca funcionem juntos
function atualizarVisibilidadeArtigos() {
    const main = document.querySelector('main');
    let visibleCount = 0;

    document.querySelectorAll('main article').forEach(article => {
        const escondidoPelaBusca = article.classList.contains('hidden-by-search');
        const escondidoPeloFiltro = article.classList.contains('hidden-by-filter');

        if (escondidoPelaBusca || escondidoPeloFiltro) {
            article.style.display = 'none';
        } else {
            article.style.display = ''; // Usa o display padrão do CSS (flex item)
            visibleCount++;
        }
    });

    // Gerencia a mensagem de "Nenhum resultado"
    const noResultsMessage = main.querySelector('.no-results-message');
    if (visibleCount === 0) {
        if (!noResultsMessage) {
            const messageElement = document.createElement('p');
            messageElement.className = 'no-results-message';
            messageElement.textContent = 'Nenhum resultado encontrado.';
            main.appendChild(messageElement);
        }
    } else if (noResultsMessage) {
        main.removeChild(noResultsMessage);
    }
}

/**
 * Cria uma versão "debounced" de uma função.
 * A função só será executada após um certo tempo de inatividade.
 * @param {Function} func A função a ser executada.
 * @param {number} delay O tempo de espera em milissegundos.
 * @returns {Function} A nova função com debounce.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();

    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const filterSidebar = document.getElementById('filter-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const filterCheckboxes = document.querySelectorAll('.filter-options input[type="checkbox"]');

    // --- Lógica de Filtragem de Artigos ---
    const filterArticles = () => {
        // 1. Pega todos os gêneros selecionados (marcados) e coloca em um array.
        const selectedGenres = Array.from(filterCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        // 2. Itera sobre cada artigo na página.
        document.querySelectorAll('main article').forEach(article => {
            // Pega o parágrafo que contém os gêneros.
            const genresParagraph = article.querySelector('.article-content p:first-of-type');
            if (!genresParagraph || !genresParagraph.textContent.includes('Gêneros:')) {
                // Se não encontrar o parágrafo de gêneros, esconde o artigo por segurança.
                article.classList.add('hidden-by-filter');
                return;
            }

            // Extrai o texto dos gêneros, remove o "Gêneros:", e transforma em um array limpo.
            const articleGenresText = normalizeText(genresParagraph.textContent.replace('Gêneros:', ''));

            // 3. Verifica se o artigo deve ser exibido.
            // Se nenhum filtro está ativo, OU se o texto de gêneros do artigo inclui pelo menos um dos gêneros selecionados.
            const shouldShow = selectedGenres.length === 0 || selectedGenres.some(genre => articleGenresText.includes(normalizeText(genre)));

            // 4. Mostra ou esconde o artigo com base na verificação.
            if (shouldShow) {
                article.classList.remove('hidden-by-filter');
            } else {
                article.classList.add('hidden-by-filter');
            }
        });
        atualizarVisibilidadeArtigos();
    };

    // --- Lógica do Menu Lateral de Filtros ---
    const toggleSidebar = () => {
        const filterSidebar = document.getElementById('filter-sidebar');
        if (!filterSidebar) return;

        const body = document.body;

        filterSidebar.classList.toggle('open');
        body.classList.toggle('sidebar-open');
    };

    if (menuToggleBtn && filterSidebar && sidebarOverlay) {
        menuToggleBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique se propague para outros elementos
            const menuToggleBtn = document.getElementById('menu-toggle-btn');
            const filterSidebar = document.getElementById('filter-sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            toggleSidebar();
        });

        sidebarOverlay.addEventListener('click', toggleSidebar);

        // Adiciona o evento de 'change' para cada checkbox de filtro.
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', filterArticles);
        });
    }
    
    // Adiciona evento para buscar em tempo real com debounce
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
        // A busca só será acionada 300ms após o usuário parar de digitar
        const debouncedSearch = debounce(buscarArtigos, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
});
function inicializarArtigos() {
    // Função centralizada para fechar o artigo expandido
    const closeExpandedArticle = () => {
        const expandedArticle = document.querySelector('article.expanded');

        if (expandedArticle) {
            // Procura pelo iframe do vídeo dentro do artigo que está sendo fechado
            const videoIframe = expandedArticle.querySelector('iframe');

            // Se um vídeo for encontrado, para a reprodução resetando o src
            if (videoIframe) {
                const videoSrc = videoIframe.src;
                videoIframe.src = videoSrc; // Resetar o src para parar o vídeo
            }

            expandedArticle.classList.remove('expanded');
            // Garante que o fundo de imagem do body seja removido
            body.style.removeProperty('--body-bg-image');

            // Remove a classe do body para mostrar o resto da página novamente
            body.classList.remove('article-view-active');
            // Limpa a variável CSS da imagem de fundo
            expandedArticle.style.removeProperty('--bg-image');
        }
    };

    document.querySelectorAll('main article').forEach (article => {
        article.addEventListener ('click', (event) => {
            // Se o artigo já está expandido, não faz nada (para evitar fechar ao clicar dentro)
            if (article.classList.contains ('expanded')) {
                return;
            }

            // Impede a expansão se o clique for no botão de fechar ou em um link
            if (event.target.closest('.close-article-btn') || event.target.closest('a')) {
                return;
            }

            // Pega a URL da imagem do poster
            const posterImage = article.querySelector('.article-poster');
            if (posterImage) {
                article.style.setProperty('--bg-image', `url(${posterImage.src})`);
            }

            article.classList.add ('expanded');
            body.classList.add('article-view-active');
        });

        // Adiciona o evento de clique para o botão de fechar
        const closeButton = article.querySelector('.close-article-btn');
        closeButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique se propague para o artigo
            closeExpandedArticle();
        });

        // Inicializa o Easter Egg se o gatilho existir no artigo
        inicializarEasterEgg(article);
    });

    // Adiciona o efeito de fundo dinâmico ao passar o mouse nos artigos
    document.querySelectorAll('main article').forEach(article => {
        article.addEventListener('mouseenter', () => {
            // Só aplica o efeito se o artigo não estiver expandido
            if (!article.classList.contains('expanded')) {
                const posterImage = article.querySelector('.article-poster');
                if (posterImage) {
                    body.style.setProperty('--body-bg-image', `url(${posterImage.src})`);
                }
            }
        });

        article.addEventListener('mouseleave', () => {
            body.style.removeProperty('--body-bg-image');
        });
    });
}

// --- Lógica do Easter Egg ---
function inicializarEasterEgg(article) {
    const pennywiseTrigger = article.querySelector('#pennywise-trigger');
    if (pennywiseTrigger) {
        pennywiseTrigger.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique feche o artigo

            // Para o vídeo se estiver tocando
            const parentArticle = pennywiseTrigger.closest('article');
            if (parentArticle) {
                const videoIframe = parentArticle.querySelector('iframe');
                if (videoIframe) {
                    // Para o vídeo resetando o src
                    const videoSrc = videoIframe.src;
                    videoIframe.src = videoSrc;
                }
            }

            // --- Início da Sequência do Easter Egg ---

            // 1. Cria a camada principal e inicia o fade-in para preto
            const sequenceOverlay = document.createElement('div');
            sequenceOverlay.className = 'sequence-overlay';
            document.body.appendChild(sequenceOverlay);

            // Força o navegador a reconhecer o elemento antes de aplicar a transição
            setTimeout(() => {
                sequenceOverlay.style.opacity = '1';
            }, 10);

            // 2. Após 5 segundos (tela preta), inicia o jumpscare
            setTimeout(() => {
                const audio = new Audio('./sons/pennywise-sound.mp3');
                audio.play().catch(error => console.error("Erro ao tocar áudio:", error));

                const flashFrames = ['#000', '#fff', '#ff4136', 'image'];
                let flashInterval = setInterval(() => {
                    const randomFrame = flashFrames[Math.floor(Math.random() * flashFrames.length)];

                    if (randomFrame === 'image') {
                        sequenceOverlay.style.backgroundImage = `url('./imagens/jumpscare-pennywise.png')`;
                        sequenceOverlay.style.backgroundColor = 'transparent';
                    } else {
                        sequenceOverlay.style.backgroundImage = 'none';
                        sequenceOverlay.style.backgroundColor = randomFrame;
                    }
                }, 50);

                // 3. Após 5 segundos de jumpscare, para tudo e mostra o texto
                setTimeout(() => {
                    clearInterval(flashInterval);

                    // Limpa o fundo e prepara para o texto
                    sequenceOverlay.style.backgroundImage = 'none';
                    sequenceOverlay.style.backgroundColor = '#000';

                    // Cria e mostra o texto
                    const signatureText = document.createElement('div');
                    signatureText.className = 'sequence-text';
                    signatureText.textContent = 'MourãoDev22';
                    sequenceOverlay.appendChild(signatureText);

                    // Força o fade-in do texto
                    setTimeout(() => {
                        signatureText.style.opacity = '1';

                        // Cria e anima o balão vermelho
                        const balloon = document.createElement('div');
                        balloon.className = 'red-balloon';
                        // Posição horizontal aleatória
                        balloon.style.left = `${Math.random() * 80 + 10}%`;
                        sequenceOverlay.appendChild(balloon);

                    }, 100);

                    // 4. Após 4 segundos mostrando o texto, inicia o fade-out da tela preta
                    setTimeout(() => {
                        // Esconde o texto primeiro para não ficar visível durante o fade-out
                        signatureText.style.opacity = '0';
                        
                        setTimeout(() => {
                            sequenceOverlay.style.opacity = '0';

                            // 5. Após 5 segundos de fade-out, remove a camada para limpeza
                            setTimeout(() => {
                                if (sequenceOverlay.parentNode) {
                                    sequenceOverlay.parentNode.removeChild(sequenceOverlay);
                                }
                            }, 5000); // Duração do fade-out

                        }, 1000); // Espera o texto sumir

                    }, 4000); // Duração da exibição do texto

                }, 5000); // Duração do jumpscare

            }, 5000); // Duração do fade-in inicial
        });
    }
}
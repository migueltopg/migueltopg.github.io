/* ================================= */
/* SCROLL REVEAL */
/* ================================= */

const animatedElements = document.querySelectorAll(
    ".section, .hero-content, .hero-card-wrapper"
);

const observer = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                observer.unobserve(entry.target);

            }

        });

    },
    {
        threshold: 0.12
    }
);

animatedElements.forEach((element) => {
    observer.observe(element);
});


/* ================================= */
/* ACTIVE NAVIGATION */
/* ================================= */

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {

    let currentSection = "";

    sections.forEach((section) => {

        const sectionTop = section.offsetTop - 200;

        if (window.scrollY >= sectionTop) {
            currentSection = section.getAttribute("id");
        }

    });

    navLinks.forEach((link) => {

        link.classList.remove("active");

        if (link.getAttribute("href") === `#${currentSection}`) {
            link.classList.add("active");
        }

    });

});


/* ================================= */
/* SMOOTH SCROLL */
/* ================================= */

document.querySelectorAll('a[href^="#"]').forEach((link) => {

    link.addEventListener("click", (event) => {

        const target = document.querySelector(
            link.getAttribute("href")
        );

        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });

});


/* ================================= */
/* CONTACT MODAL */
/* ================================= */

const contactModal = document.getElementById("contactModal");
const openContact = document.getElementById("openContact");
const closeContact = document.getElementById("closeContact");
const modalBackdrop = document.getElementById("modalBackdrop");


/* Abrir */

openContact.addEventListener("click", () => {

    contactModal.classList.add("active");

    document.body.style.overflow = "hidden";

});


/* Fechar */

function closeModal() {

    contactModal.classList.remove("active");

    document.body.style.overflow = "";

}


closeContact.addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", closeModal);


/* Fechar com ESC */

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {
        closeModal();
    }

});


/* ================================= */
/* COPY EMAIL */
/* ================================= */


/*
    IMPORTANTE:

    ALTERA O EMAIL AQUI.

    Exemplo:

    const email = "miguel@gmail.com";
*/

const email = "miguelbento257@gmail.com";


const emailText = document.getElementById("emailText");
const copyEmail = document.getElementById("copyEmail");
const copySuccess = document.getElementById("copySuccess");


/* Mostra o email no modal */

emailText.textContent = email;


/* Copiar */

copyEmail.addEventListener("click", async () => {

    try {

        await navigator.clipboard.writeText(email);

        copySuccess.classList.add("show");

        copyEmail.innerHTML = `
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>

            <span>Copiado!</span>
        `;


        setTimeout(() => {

            copySuccess.classList.remove("show");

            copyEmail.innerHTML = `
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                    ></rect>

                    <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    ></path>
                </svg>

                <span>Copiar</span>
            `;

        }, 2000);


    } catch (error) {

        /*
            Fallback caso o navegador bloqueie
            a Clipboard API.
        */

        const temporaryInput = document.createElement("input");

        temporaryInput.value = email;

        document.body.appendChild(temporaryInput);

        temporaryInput.select();

        document.execCommand("copy");

        temporaryInput.remove();

        copySuccess.textContent =
            "✓ Email copiado para a área de transferência";

        copySuccess.classList.add("show");

    }

});


/* ================================= */
/* DISCORD */
/* ================================= */


/*
    ALTERA ESTE LINK PELO TEU DISCORD.

    Exemplo:

    const discordLink = "https://discord.gg/abc123";
*/

const discordLink = "https://discord.gg/wuQ7ZnPeTW";

const discordButton = document.getElementById("discordButton");

discordButton.addEventListener("click", (event) => {

    if (discordLink === "#") {

        event.preventDefault();

        alert("Adiciona o teu link do Discord no script.js.");

        return;
    }

    discordButton.href = discordLink;

});


/* ================================= */
/* PAGE LOADED */
/* ================================= */

window.addEventListener("load", () => {

    document.body.classList.add("loaded");

});

```javascript
/* ================================= */
/* BACKGROUND MUSIC */
/* ================================= */

/*
    AS TUAS MÚSICAS FICAM NA PASTA:

    musicas/
        m1.mp3
        m2.mp3
        ...
        m16.mp3

    ALTERA APENAS OS NOMES ABAIXO.
*/

const musicas = [
    { ficheiro: "m1.mp3", nome: "Nome da Música 1" },
    { ficheiro: "m2.mp3", nome: "Nome da Música 2" },
    { ficheiro: "m3.mp3", nome: "Nome da Música 3" },
    { ficheiro: "m4.mp3", nome: "Nome da Música 4" },
    { ficheiro: "m5.mp3", nome: "Nome da Música 5" },
    { ficheiro: "m6.mp3", nome: "Nome da Música 6" },
    { ficheiro: "m7.mp3", nome: "Nome da Música 7" },
    { ficheiro: "m8.mp3", nome: "Nome da Música 8" },
    { ficheiro: "m9.mp3", nome: "Nome da Música 9" },
    { ficheiro: "m10.mp3", nome: "Nome da Música 10" },
    { ficheiro: "m11.mp3", nome: "Nome da Música 11" },
    { ficheiro: "m12.mp3", nome: "Nome da Música 12" },
    { ficheiro: "m13.mp3", nome: "Nome da Música 13" },
    { ficheiro: "m14.mp3", nome: "Nome da Música 14" },
    { ficheiro: "m15.mp3", nome: "Nome da Música 15" },
    { ficheiro: "m16.mp3", nome: "Nome da Música 16" }
];

const musicAudio = document.getElementById("musicAudio");
const musicTitle = document.getElementById("musicTitle");
const musicProgress = document.getElementById("musicProgress");

let musicaAtual = 0;
let musicaAtivada = false;

function carregarMusica(index, tocar = false) {
    if (!musicas.length) return;

    musicaAtual = index % musicas.length;

    const musica = musicas[musicaAtual];

    musicTitle.textContent = musica.nome;
    musicProgress.style.width = "0%";

    musicAudio.src = `musicas/${musica.ficheiro}`;
    musicAudio.load();

    if (tocar) {
        const tentativa = musicAudio.play();

        if (tentativa !== undefined) {
            tentativa.catch(() => {
                musicaAtivada = false;
            });
        }
    }
}

function ativarMusica() {
    if (musicaAtivada) return;

    musicaAtivada = true;

    const tentativa = musicAudio.play();

    if (tentativa !== undefined) {
        tentativa.catch(() => {
            musicaAtivada = false;
        });
    }
}

musicAudio.addEventListener("ended", () => {
    const proximaMusica = (musicaAtual + 1) % musicas.length;

    carregarMusica(proximaMusica, true);
});

musicAudio.addEventListener("timeupdate", () => {
    if (!musicAudio.duration) return;

    const percentagem =
        (musicAudio.currentTime / musicAudio.duration) * 100;

    musicProgress.style.width = `${percentagem}%`;
});

carregarMusica(0, true);

document.addEventListener("pointerdown", ativarMusica, {
    once: true
});
```

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
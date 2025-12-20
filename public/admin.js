fetch("/ebooks")
  .then(res => res.json())
  .then(ebooks => {
    const container = document.getElementById("ebooks");

    if (ebooks.length === 0) {
      container.innerHTML = "<p>Nenhum e-book ainda.</p>";
      return;
    }

    ebooks.forEach(ebook => {
      const div = document.createElement("div");
      div.className = "ebook";

      div.innerHTML = `
        <h3>${ebook.titulo}</h3>
        <p>Autor: ${ebook.autor}</p>
        <a href="/download/${ebook.arquivo}">
          <button>📥 Download</button>
        </a>
      `;

      container.appendChild(div);
    });
  });

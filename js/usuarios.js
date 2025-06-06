// js/usuarios.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-usuario');
  const lista = document.getElementById('lista-usuarios');

  // Carregar usuários ao iniciar
  fetch('/api/usuarios')
    .then(res => res.json())
    .then(data => {
      atualizarLista(data);
    });

  // Submeter novo usuário
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const novoUsuario = {
      username: document.getElementById('novo-username').value,
      password: document.getElementById('novo-password').value,
      role: document.getElementById('novo-role').value,
    };

    fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoUsuario),
    })
      .then(res => res.json())
      .then(data => {
        atualizarLista(data);
        form.reset();
      });
  });

  // Atualizar lista
  function atualizarLista(usuarios) {
    lista.innerHTML = '';
    usuarios.forEach(u => {
      const li = document.createElement('li');
      li.textContent = `${u.username} (${u.role})`;

      const btn = document.createElement('button');
      btn.textContent = 'Excluir';
      btn.onclick = () => excluirUsuario(u.username);

      li.appendChild(btn);
      lista.appendChild(li);
    });
  }

  // Excluir usuário
  function excluirUsuario(username) {
    fetch(`/api/usuarios/${username}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => atualizarLista(data));
  }
});
